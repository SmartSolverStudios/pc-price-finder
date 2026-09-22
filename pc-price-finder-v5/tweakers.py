"""Tweakers Pricewatch client: discovery, spec-list parsing and offer parsing."""
from __future__ import annotations

import hashlib
import re
import time
from pathlib import Path
from typing import Any
from urllib.parse import quote, urljoin

import requests
from bs4 import BeautifulSoup, NavigableString, TemplateString

BASE = "https://tweakers.net"
CONSENT_MARKERS = ("myprivacy.dpgmedia", "privacygate", "/consent")


class FetchError(RuntimeError):
    def __init__(self, message: str, status: int | None = None):
        super().__init__(message)
        self.status = status


def norm(s: str | None) -> str:
    return re.sub(r"\s+", " ", s or "").strip()


def text(el) -> str:
    # Tweakers renders part of the spec list inside <template>, which get_text() skips by default.
    return norm(el.get_text(" ", strip=True, types=(NavigableString, TemplateString))) if el else ""


def parse_eur(s: str | None) -> float | None:
    """Parse Dutch price notation: 'â‚¬ 1.269,99', 'â‚¬ 1.299,-', 'â‚¬13,90', 'â‚¬ 99'."""
    if not s:
        return None
    m = re.search(r"(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}|-{1,2}))?", s.replace("\xa0", " "))
    if not m:
        return None
    whole = int(m.group(1).replace(".", ""))
    cents = m.group(2)
    if cents and cents.isdigit():
        return round(whole + int(cents.ljust(2, "0")) / 100, 2)
    return float(whole)


class Tweakers:
    def __init__(self, user_agent: str, delay: float, log=print, cache_dir: Path | None = None, cache_hours: float = 0):
        self.delay = delay
        self.log = log
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": user_agent, "Accept-Language": "nl-NL,nl;q=0.9,en;q=0.8"})
        self._warmed = False
        self.cache_dir = cache_dir if cache_hours > 0 else None
        self.cache_seconds = cache_hours * 3600
        if self.cache_dir:
            self.cache_dir.mkdir(parents=True, exist_ok=True)

    def fetch(self, url: str) -> str:
        path = self.cache_dir / (hashlib.sha1(url.encode()).hexdigest() + ".html") if self.cache_dir else None
        if path and path.exists() and time.time() - path.stat().st_mtime < self.cache_seconds:
            return path.read_text(encoding="utf-8")
        html = self._fetch_live(url)
        if path:
            path.write_text(html, encoding="utf-8")
        return html

    def _fetch_live(self, url: str, attempts: int = 4) -> str:
        if not self._warmed:
            self._warmed = True
            try:
                self._fetch_live(BASE + "/pricewatch/")
            except FetchError as e:
                self.log(f"  warm-up failed: {e}")
        last, status = "", None
        for i in range(attempts):
            time.sleep(self.delay * (1 + i))
            try:
                r = self.session.get(url, timeout=25)
            except requests.RequestException as e:
                last = str(e)
                continue
            if any(m in r.url for m in CONSENT_MARKERS):
                last = "consent wall"
                continue
            if r.status_code == 200:
                return r.text
            last, status = f"HTTP {r.status_code}", r.status_code
            if r.status_code == 404:
                break
        raise FetchError(f"{url}: {last}", status)

    def search(self, query: str, max_results: int) -> list[dict[str, Any]]:
        try:
            html = self.fetch(BASE + "/pricewatch/zoeken/?keyword=" + quote(query))
        except FetchError as e:
            if e.status == 404:  # Tweakers answers 404 when a search has no results
                return []
            raise
        soup = BeautifulSoup(html, "html.parser")
        out, seen = [], set()
        for a in soup.select('a[href*="/pricewatch/"]'):
            href = a.get("href", "")
            m = re.search(r"/pricewatch/(\d+)/[^/?#]+\.html", href)
            title = text(a)
            if not m or not title or m.group(1) in seen:
                continue
            seen.add(m.group(1))
            out.append({"product_id": m.group(1), "title": title, "url": urljoin(BASE, href.split("#")[0].split("?")[0]), "query": query})
            if len(out) >= max_results:
                break
        return out

    def product(self, url: str) -> dict[str, Any]:
        soup = BeautifulSoup(self.fetch(url), "html.parser")
        return parse_product(soup)


def parse_specs(soup: BeautifulSoup) -> dict[str, str]:
    specs: dict[str, str] = {}
    for li in soup.select("li.spec-item"):
        lab, val = li.select_one("span.spec-label"), li.select_one("span.spec")
        if not lab or not val:
            continue
        label, value = text(lab), text(val)
        if label and value and label not in specs:
            specs[label] = value
    return specs


def parse_offers(soup: BeautifulSoup) -> list[dict[str, Any]]:
    offers = []
    for li in soup.select("li.price-listing-item"):
        name, price = li.select_one("span.shop-name"), li.select_one("span.shop-price")
        eur = parse_eur(price.get_text(" ", strip=True)) if price else None
        if eur is None:
            continue
        link = li.select_one("span.shop-name a[href]") or li.select_one("a[href]")
        condition = text(li.select_one("span.condition")) or None
        shipping = text(li.select_one("span.calculated-cost"))
        delivery = li.select_one("twk-delivery-info")
        offers.append({
            "shop": text(name) if name else None,
            "price": eur,
            "shipping": 0.0 if "gratis" in shipping.lower() else parse_eur(shipping),
            "condition": condition,
            "secondhand": condition is not None or "refurbished" in (li.get("class") or []),
            "delivery": delivery.get("title") if delivery else None,
            "url": urljoin(BASE, link["href"]) if link else None,
        })
    offers.sort(key=lambda o: o["price"])
    return offers


def parse_product(soup: BeautifulSoup) -> dict[str, Any]:
    h1 = soup.select_one("h1")
    offers = parse_offers(soup)
    lowest = soup.select_one("span.lowest-price")
    return {
        "page_title": text(h1) if h1 else None,
        "specs": parse_specs(soup),
        "offers": offers,
        "lowest_price_label": parse_eur(lowest.get_text(" ", strip=True)) if lowest else None,
    }
