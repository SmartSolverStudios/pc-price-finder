#!/usr/bin/env python3
"""PC Price Finder v5: Tweakers discovery -> product page -> spec list -> hard filters -> price/quality choice."""
from __future__ import annotations

import copy
import csv
import json
import re
import sys
import time
from pathlib import Path
from typing import Any

from rules import RULES, Ctx
from tweakers import FetchError, Tweakers

ROOT = Path(__file__).resolve().parent
CONFIG = json.loads((ROOT / "build_config.json").read_text(encoding="utf-8"))
ORDER = ["case", "cpu", "gpu", "motherboard", "ram", "cooler", "ssd", "psu", "fans"]
MAX_ALTERNATIVES = 8


def log(*a: Any) -> None:
    print(*a, flush=True)


def usable_offers(product: dict[str, Any]) -> tuple[list[dict], list[dict]]:
    """Returns (new offers from allowed shops, sorted by price) and cheaper second-hand offers for information."""
    oc = CONFIG["offers"]
    blocked = [t.lower() for t in oc.get("exclude_shop_terms", [])]
    usable, secondhand = [], []
    for o in product["offers"]:
        if o["secondhand"] and oc.get("exclude_secondhand", True):
            secondhand.append(o)
        elif not any(t in (o["shop"] or "").lower() for t in blocked):
            usable.append(o)
    usable.sort(key=lambda o: o["price"])
    cheapest = usable[0]["price"] if usable else float("inf")
    return usable, [o for o in secondhand if o["price"] < cheapest]


def evaluate(kind: str, hit: dict, tw: Tweakers, limits: dict, title_re: re.Pattern | None) -> dict[str, Any]:
    item: dict[str, Any] = {"product_id": hit["product_id"], "title": hit["title"], "url": hit["url"], "found_by": hit["query"]}
    if title_re and not title_re.search(hit["title"]):
        item.update(status="REJECTED", reject_reasons=["titel past niet bij het zoekfilter (niet geopend)"])
        return item
    try:
        product = tw.product(hit["url"])
    except FetchError as e:
        item.update(status="MANUAL_CHECK", manual_checks=[f"pagina kon niet geladen worden: {e}"])
        return item

    title = product["page_title"] or hit["title"]
    c = Ctx(title, product["specs"])
    RULES[kind](c, CONFIG["build"][kind], limits, CONFIG["quality_bonus_eur"])
    offers, secondhand = usable_offers(product)
    best = offers[0] if offers else None
    price = best["price"] if best else None
    if best is None:
        c.reject.insert(0, "geen actuele aanbieding (nieuw, bij een consumentenshop)" if product["offers"] else "geen actuele aanbieding")

    item.update(
        title=title,
        price=price,
        shop=best["shop"] if best else None,
        shipping=best["shipping"] if best else None,
        delivery=best["delivery"] if best else None,
        shop_url=best["url"] if best else None,
        shop_count=len(offers),
        top_offers=[{k: o[k] for k in ("shop", "price", "shipping", "delivery")} for o in offers[:3]],
        cheaper_secondhand=[{k: o[k] for k in ("shop", "price", "condition")} for o in secondhand],
        facts=c.facts,
        quality_bonus_eur=round(c.bonus_eur, 2),
        quality_notes=c.bonus_why,
        effective_price=round(price - c.bonus_eur, 2) if price is not None else None,
        reject_reasons=c.reject,
        manual_checks=c.manual,
        specs=product["specs"],
    )
    item["status"] = "REJECTED" if c.reject else ("MANUAL_CHECK" if c.manual else "VALID")
    return item


def discover(kind: str, tw: Tweakers, errors: list[str]) -> list[dict]:
    hits, seen = [], set()
    for q in CONFIG["build"][kind]["queries"]:
        try:
            found = tw.search(q, int(CONFIG["search"]["max_results_per_query"]))
        except FetchError as e:
            errors.append(f"{kind}: zoeken '{q}' mislukt: {e}")
            log(f"  search FAILED: {q} ({e})")
            continue
        new = [h for h in found if h["product_id"] not in seen]
        seen.update(h["product_id"] for h in new)
        hits.extend(new)
        log(f"  search: {q!r}: {len(found)} hits, {len(new)} new")
    return hits


def run_component(kind: str, tw: Tweakers, limits: dict, errors: list[str]) -> dict[str, Any]:
    log(f"\n=== {kind.upper()} ===")
    pattern = CONFIG["build"][kind].get("title_filter")
    title_re = re.compile(pattern, re.I) if pattern else None
    hits = discover(kind, tw, errors)
    items = []
    for i, hit in enumerate(hits, 1):
        item = evaluate(kind, hit, tw, limits, title_re)
        items.append(item)
        if item.get("specs") is not None:
            log(f"  [{i}/{len(hits)}] {item['status']:<12} {item['title'][:60]:<60} {item.get('price')}")

    valid = sorted((x for x in items if x["status"] == "VALID"), key=lambda x: (x["effective_price"], x["price"]))
    manual = sorted((x for x in items if x["status"] == "MANUAL_CHECK"), key=lambda x: (x.get("price") is None, x.get("price") or 0))
    rejected = [
        {k: x.get(k) for k in ("title", "url", "price", "reject_reasons", "facts")}
        for x in items if x["status"] == "REJECTED"
    ]
    for x in valid:
        x.pop("specs", None)
    return {
        "recommended": valid[0] if valid else None,
        "alternatives": valid[1:1 + MAX_ALTERNATIVES],
        "needs_manual_check": manual,
        "rejected": rejected,
        "counts": {"discovered": len(items), "valid": len(valid), "manual_check": len(manual), "rejected": len(rejected)},
    }


def offer_identity(item: dict) -> tuple:
    return (item.get("product_id"), item.get("shop"), item.get("price"))


def is_lower_price(candidate: dict, record: dict) -> bool:
    """True when the candidate costs less than the lowest price kept so far.

    Product price decides. When those are equal, lower shipping does.
    """
    new_price, old_price = candidate.get("price"), record.get("price")
    if not isinstance(new_price, (int, float)) or not isinstance(old_price, (int, float)):
        return False
    if float(new_price) < float(old_price) - 0.001:
        return True
    if abs(float(new_price) - float(old_price)) > 0.001:
        return False
    new_ship, old_ship = candidate.get("shipping"), record.get("shipping")
    if isinstance(new_ship, (int, float)) and isinstance(old_ship, (int, float)):
        return float(new_price) + float(new_ship) < float(old_price) + float(old_ship) - 0.001
    return False


def _without_note(item: dict) -> dict:
    kept = copy.deepcopy(item)
    kept.pop("price_note", None)
    return kept


def _place_less_favorable(alternatives: list[dict], extra: dict, winner: dict) -> list[dict]:
    """Keeps `extra` visible, without duplicating the winner or the same offer."""
    winner_id = offer_identity(winner)
    extra_id = offer_identity(extra)
    placed: list[dict] = []
    seen = False
    for alt in alternatives:
        if offer_identity(alt) == winner_id:
            continue
        if offer_identity(alt) == extra_id:
            tagged = _without_note(alt)
            tagged["price_note"] = extra["price_note"]
            placed.append(tagged)
            seen = True
        else:
            placed.append(alt)
    if not seen:
        placed.insert(0, extra)
    return placed[:MAX_ALTERNATIVES]


def remember_best(fresh: dict, previous: dict | None) -> dict:
    """Keeps the lowest price found so far.

    A lower new price becomes the recommendation and the previous one stays as a
    less favorable alternative. Anything that does not beat the record is kept
    beside it, and the record itself stays the recommendation.
    """
    if not previous or not previous.get("recommended") or previous["recommended"].get("price") is None:
        return fresh
    record = _without_note(previous["recommended"])
    candidate = fresh.get("recommended")
    result = dict(fresh)

    if candidate and candidate.get("price") is not None and is_lower_price(candidate, record):
        winner = _without_note(candidate)
        winner["price_note"] = "Lower than the previous lowest price."
        earlier = _without_note(record)
        earlier["price_note"] = "This was the previous lowest price."
        result["recommended"] = winner
        result["alternatives"] = _place_less_favorable(fresh["alternatives"], earlier, winner)
        if offer_identity(earlier) not in {offer_identity(a) for a in fresh["alternatives"]}:
            result["counts"] = {**fresh["counts"], "valid": fresh["counts"]["valid"] + 1}
        log(f"  prijs: lager dan het vorige laagste ({record['price']} -> {winner['price']}); vorige blijft zichtbaar")
        return result

    kept = _without_note(record)
    kept["price_note"] = "Lowest price found so far. The latest scan was not lower."
    alternatives = list(fresh["alternatives"])
    if candidate and candidate.get("price") is not None and offer_identity(candidate) != offer_identity(kept):
        later = _without_note(candidate)
        later["price_note"] = "Not lower than the lowest price found so far."
        alternatives = _place_less_favorable(alternatives, later, kept)
        if offer_identity(later) not in {offer_identity(a) for a in fresh["alternatives"]}:
            result["counts"] = {**fresh["counts"], "valid": fresh["counts"]["valid"] + 1}
        log(f"  prijs: nieuw ({candidate['price']}) is niet lager dan {kept['price']}; oude prijs en product blijven")
    else:
        alternatives = [a for a in alternatives if offer_identity(a) != offer_identity(kept)]
        log(f"  prijs: geen lagere prijs dan {kept['price']}; oude prijs en product blijven")
    result["recommended"] = kept
    result["alternatives"] = alternatives[:MAX_ALTERNATIVES]
    return result


def apply_price_memory(result: dict, previous: dict | None) -> None:
    prev_components = (previous or {}).get("components") or {}
    merged: dict[str, Any] = {}
    for kind in ORDER:
        if kind in result["components"]:
            merged[kind] = remember_best(result["components"][kind], prev_components.get(kind))
        elif kind in prev_components:
            merged[kind] = prev_components[kind]
    result["components"] = merged
    found = [b["recommended"] for b in merged.values() if b.get("recommended")]
    result["summary"] = {
        "recommended_count": len(found),
        "build_total_eur": round(sum(x["price"] for x in found if x.get("price") is not None), 2),
        "build_total_complete": len(found) == len(ORDER),
    }


def apply_case_limits(case_result: dict, limits: dict) -> None:
    case = case_result["recommended"]
    if not (case and CONFIG["limits"].get("use_case_specs")):
        log("  case niet gevonden: fallback-limieten uit build_config.json worden gebruikt")
        return
    for key, fact in (("gpu_mm", "max_gpu_mm"), ("cooler_mm", "max_cooler_mm"), ("psu_mm", "max_psu_mm")):
        value = case["facts"].get(fact)
        if value:
            limits[key] = value
    log(f"  limieten uit case-specs: GPU {limits['gpu_mm']:g}mm, koeler {limits['cooler_mm']:g}mm, voeding {limits['psu_mm']:g}mm")


def write_outputs(result: dict) -> None:
    (ROOT / "results.json").write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")

    with open(ROOT / "recommendations.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["component", "status", "price_eur", "shop", "product", "url", "notes"])
        for kind, b in result["components"].items():
            x = b["recommended"]
            if x:
                w.writerow([kind, "RECOMMENDED", f"{x['price']:.2f}".replace(".", ","), x["shop"], x["title"], x["url"], "; ".join(x["quality_notes"])])
            else:
                status = "MANUAL CHECK" if b["needs_manual_check"] else "NO VALID MATCH"
                w.writerow([kind, status, "", "", "", "", ""])

    lines = ["PC PRICE FINDER v5", "=" * 72, f"Generated: {result['generated_at']}",
             "Limieten: GPU <= {gpu_mm:g}mm, koeler <= {cooler_mm:g}mm, voeding <= {psu_mm:g}mm".format(**result["limits"]), ""]
    for kind, b in result["components"].items():
        n = b["counts"]
        lines += [f"{kind.upper()}  (gevonden {n['discovered']}, geldig {n['valid']}, handmatig {n['manual_check']}, afgekeurd {n['rejected']})", "-" * 72]
        x = b["recommended"]
        if x:
            ship = "gratis verzending" if x["shipping"] == 0 else (f"+ EUR {x['shipping']:.2f} verzending" if x["shipping"] else "verzendkosten onbekend")
            lines.append(f"  AANBEVOLEN: {x['title']} - EUR {x['price']:.2f} bij {x['shop']} ({ship}; {x['shop_count']} shops)")
            if x.get("price_note"):
                lines.append(f"     {x['price_note']}")
            lines.append(f"     {x['url']}")
            if x["quality_notes"]:
                lines.append(f"     prijs/kwaliteit: {', '.join(x['quality_notes'])}")
            for c in x["cheaper_secondhand"]:
                lines.append(f"     ter info: tweedehands EUR {c['price']:.2f} bij {c['shop']} ({c['condition']})")
            for alt in b["alternatives"][:3]:
                lines.append(f"  alternatief: {alt['title']} - EUR {alt['price']:.2f} bij {alt['shop']}")
        else:
            lines.append("  Geen product dat aan alle eisen voldoet.")
        for m in b["needs_manual_check"][:3]:
            price = f"EUR {m['price']:.2f}" if m.get("price") is not None else "geen prijs"
            lines.append(f"  handmatig: {m['title']} - {price} - {'; '.join(m['manual_checks'])}")
        reasons: dict[str, int] = {}
        for r in b["rejected"]:
            for reason in r["reject_reasons"][:1]:
                key = re.sub(r"\s*\(.*\)$", "", reason)
                reasons[key] = reasons.get(key, 0) + 1
        if reasons:
            top = sorted(reasons.items(), key=lambda kv: -kv[1])[:4]
            lines.append("  afgekeurd o.a.: " + ", ".join(f"{k} ({v}x)" for k, v in top))
        lines.append("")
    s = result["summary"]
    total = f"EUR {s['build_total_eur']:.2f}" if s["build_total_complete"] else f"onvolledig (EUR {s['build_total_eur']:.2f} voor {s['recommended_count']}/9 onderdelen)"
    lines.append(f"BUILD TOTAL: {total}")
    if result["errors"]:
        lines += ["", "FOUTEN:"] + [f"  {e}" for e in result["errors"]]
    (ROOT / "report.txt").write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    previous = None
    previous_path = ROOT / "results.json"
    if previous_path.exists():
        try:
            previous = json.loads(previous_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            log("results.json kon niet gelezen worden; er wordt niet met eerdere prijzen vergeleken")

    only = [a for a in sys.argv[1:] if a in ORDER]
    no_cache = "--no-cache" in sys.argv
    s = CONFIG["search"]
    tw = Tweakers(s["user_agent"], float(s["request_delay_seconds"]), log=log,
                  cache_dir=ROOT / ".cache", cache_hours=0 if no_cache else float(s.get("cache_hours", 0)))
    limits = {k: float(CONFIG["limits"][k]) for k in ("gpu_mm", "cooler_mm", "psu_mm")}
    errors: list[str] = []
    result: dict[str, Any] = {"version": "5.0", "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                              "source": CONFIG["source"], "components": {}}

    kinds = ORDER if not only else (["case"] if "case" not in only else []) + only
    for kind in kinds:
        result["components"][kind] = run_component(kind, tw, limits, errors)
        if kind == "case":
            apply_case_limits(result["components"]["case"], limits)

    result["limits"] = limits
    result["errors"] = errors
    apply_price_memory(result, previous)
    write_outputs(result)
    log("\nDONE. results.json, recommendations.csv en report.txt geschreven.")
    summary = result["summary"]
    log(f"Aanbevolen: {summary['recommended_count']}/{len(ORDER)} - totaal EUR {summary['build_total_eur']:.2f}"
        + ("" if summary["build_total_complete"] else " (onvolledig)"))


if __name__ == "__main__":
    main()
