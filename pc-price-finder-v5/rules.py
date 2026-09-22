"""Hard filters and quality bonuses per component, based on Tweakers spec labels."""
from __future__ import annotations

import re
from typing import Any, Callable


def num(value: str | None) -> float | None:
    """First number in a Tweakers value: '306mm', '446,4mm', '6.000MT/s', '850W'."""
    if not value:
        return None
    m = re.search(r"(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d+))?", value)
    if not m:
        return None
    whole = m.group(1).replace(".", "")
    return float(f"{whole}.{m.group(2)}") if m.group(2) else float(whole)


def has(value: str | None, *terms: str) -> bool | None:
    """None when the spec is missing, so the caller can mark it as a manual check."""
    if value is None:
        return None
    v = value.lower()
    return any(t.lower() in v for t in terms)


class Ctx:
    def __init__(self, title: str, specs: dict[str, str]):
        self.title = title
        self.t = title.lower()
        self.specs = specs
        self._lower = {k.lower(): v for k, v in specs.items()}
        self.reject: list[str] = []
        self.manual: list[str] = []
        self.facts: dict[str, Any] = {}
        self.bonus_eur = 0.0
        self.bonus_why: list[str] = []

    def spec(self, *labels: str) -> str | None:
        for label in labels:
            v = self._lower.get(label.lower())
            if v is not None:
                return v
        return None

    def fact(self, key: str, value: Any) -> Any:
        self.facts[key] = value
        return value

    def need(self, ok: bool | None, reason: str) -> None:
        if ok is None:
            self.manual.append(f"controleer: {reason} (spec ontbreekt op Tweakers)")
        elif not ok:
            self.reject.append(reason)

    def max_mm(self, key: str, value: str | None, limit: float, reason: str) -> None:
        mm = self.fact(key, num(value))
        if mm is None:
            self.manual.append(f"controleer: {key} (spec ontbreekt op Tweakers)")
        elif mm > limit:
            self.reject.append(f"{reason} ({mm:g}mm > max {limit:g}mm)")

    def bonus(self, eur: float, why: str) -> None:
        if eur:
            self.bonus_eur += eur
            self.bonus_why.append(f"{why} ({eur:+g} EUR)")


def category(c: Ctx, *allowed: str) -> None:
    cat = c.fact("categorie", c.spec("Categorie"))
    c.need(None if cat is None else cat in allowed, f"verkeerde categorie: {cat} (verwacht {' / '.join(allowed)})")


def rule_case(c: Ctx, B: dict, L: dict, Q: dict) -> None:
    category(c, "Behuizingen")
    product = (c.spec("Product") or c.title).lower()
    c.need("o11 vision compact" in product, "niet de Lian Li O11 Vision Compact")
    c.need(has(c.spec("Kleur"), "zwart"), "kleur niet zwart")
    c.fact("kleur", c.spec("Kleur"))
    c.fact("max_gpu_mm", num(c.spec("Grafische kaart maximum lengte")))
    c.fact("max_cooler_mm", num(c.spec("CPU koeler maximum hoogte")))
    c.fact("max_psu_mm", num(c.spec("Voeding maximum lengte")))


def rule_cpu(c: Ctx, B: dict, L: dict, Q: dict) -> None:
    category(c, "Processors")
    product = (c.spec("Product") or c.title).lower()
    c.need(bool(re.search(r"ryzen\s*7\s*7800x3d", product)), "niet de Ryzen 7 7800X3D")
    c.need(has(c.fact("socket", c.spec("Socket")), "AM5"), "socket niet AM5")
    status = c.fact("verkoopstatus", c.spec("Verkoopstatus (CPU)", "Verkoopstatus"))
    if has(status, "boxed"):
        c.bonus(Q.get("cpu_boxed", 0), "boxed (fabrieksgarantie via AMD)")


def rule_gpu(c: Ctx, B: dict, L: dict, Q: dict) -> None:
    category(c, "Videokaarten")
    c.need(has(c.fact("videochip", c.spec("Videochip")), "RTX 5070 Ti"), "videochip niet RTX 5070 Ti")
    vram = c.fact("vram_gb", num(c.spec("Video geheugen")))
    c.need(None if vram is None else vram == B["vram_gb"], f"niet {B['vram_gb']}GB VRAM")
    c.max_mm("lengte_mm", c.spec("Lengte"), L["gpu_mm"], "GPU te lang voor de case")
    c.fact("stroomconnector", c.spec("Stroomconnector (videokaarten)"))


def rule_motherboard(c: Ctx, B: dict, L: dict, Q: dict) -> None:
    category(c, "Moederborden")
    chipset = c.fact("chipset", c.spec("Moederbordchipset"))
    c.need(None if chipset is None else bool(re.fullmatch(r"(amd\s*)?b650e?", chipset.strip(), re.I)), f"chipset niet B650/B650E ({chipset})")
    c.need(has(c.fact("socket", c.spec("Socket")), "AM5"), "socket niet AM5")
    ff = c.fact("form_factor", c.spec("Form Factor"))
    c.need(None if ff is None else ff.strip().lower().startswith("atx"), f"geen full ATX ({ff})")
    c.need(has(c.fact("geheugentype", c.spec("Geheugentype (moederbord)")), "DDR5"), "geen DDR5")
    wifi = c.spec("Wi-Fi generatie", "Wifi-controller")
    c.fact("wifi", wifi[:60] if wifi else None)
    c.need(True if wifi else None, "WiFi")


def rule_ram(c: Ctx, B: dict, L: dict, Q: dict) -> None:
    category(c, "Geheugen intern")
    total = c.fact("capaciteit_gb", num(c.spec("Werkgeheugen")))
    c.need(None if total is None else total == B["capacity_gb"], f"niet {B['capacity_gb']}GB totaal")
    modules = c.fact("modules", num(c.spec("Aantal")))
    size = c.fact("module_gb", num(c.spec("Modulegrootte")))
    c.need(None if modules is None or size is None else (modules == B["modules"] and size * modules == B["capacity_gb"]),
           f"niet {B['modules']}x{B['capacity_gb'] // B['modules']}GB")
    c.need(has(c.fact("type", c.spec("Geheugentype")), "DDR5"), "geen DDR5")
    speed = c.fact("snelheid_mts", num(c.spec("Geheugensnelheid (DDR)", "Geheugensnelheid")))
    c.need(None if speed is None else speed == B["speed_mt_s"], f"snelheid niet {B['speed_mt_s']} MT/s ({speed})")
    cl = c.fact("cl", num(c.spec("CAS Latency")))
    c.need(None if cl is None else int(cl) in B["cl_allowed"], f"CL{cl and int(cl)} niet toegestaan")
    c.need(has(c.fact("profielen", c.spec("Overklokprofielen")), "EXPO"), "geen AMD EXPO")
    c.need(has(c.fact("kleur", c.spec("Kleur", "Kleuren")), "zwart"), "kleur niet zwart")
    if cl is not None and int(cl) == min(B["cl_allowed"]):
        c.bonus(Q.get("ram_best_cl", 0), f"CL{int(cl)}")


def rule_cooler(c: Ctx, B: dict, L: dict, Q: dict) -> None:
    category(c, "Processorkoeling")
    c.need(has(c.fact("socket", c.spec("Socket")), "AM5"), "geen AM5-ondersteuning")
    koeling = c.fact("type_koeling", c.spec("Type koeling"))
    water = has(koeling, "water", "vloeistof", "liquid") or any("radiator" in k.lower() or "pomp" in k.lower() for k in c.specs)
    air = has(koeling, "fan", "passief") or c.spec("Heatpipes") is not None
    c.need(False if water else (True if air else None), "geen luchtkoeler")
    c.max_mm("hoogte_mm", c.spec("Hoogte"), L["cooler_mm"], "koeler te hoog voor de case")
    c.need(has(c.fact("kleur", c.spec("Kleur", "Kleuren")), "zwart"), "kleur niet zwart")


def rule_ssd(c: Ctx, B: dict, L: dict, Q: dict) -> None:
    category(c, "Interne ssd's")
    cap = c.spec("Opslagcapaciteit")
    gb = num(cap)
    if gb is not None and cap and "tb" in cap.lower():
        gb *= 1000
    c.fact("capaciteit_gb", gb)
    c.need(None if gb is None else 960 <= gb <= 1100, f"niet 1TB ({cap})")
    fmt = c.fact("formaat", c.spec("SSD-formaat"))
    c.need(has(fmt, "80mm", "2280"), f"geen M.2 2280 ({fmt})")
    iface = c.fact("interface", c.spec("SSD-interface"))
    c.need(has(iface, "4.0"), f"geen PCIe Gen4 ({iface})")
    c.need(None if iface is None else not has(iface, "5.0"), "PCIe Gen5 uitgesloten")
    nvme = has(c.spec("SSD eigenschappen"), "nvme") or has(iface, "nvme")
    c.need(nvme, "geen NVMe")
    nand = c.fact("nand", c.spec("SSD-type"))
    if has(nand, "qlc"):
        c.bonus(-Q.get("ssd_qlc_penalty", 0), "QLC-geheugen")
    if has(c.fact("verkoopstatus", c.spec("Verkoopstatus")), "oem"):
        c.bonus(-Q.get("ssd_oem_penalty", 0), "OEM-versie")


def rule_psu(c: Ctx, B: dict, L: dict, Q: dict) -> None:
    category(c, "Voedingen")
    watt = c.fact("watt", num(c.spec("Vermogen (watt)")))
    c.need(None if watt is None else watt == B["wattage_w"], f"niet {B['wattage_w']}W ({watt})")
    eff = c.fact("efficientie", c.spec("80Plus", "80 Plus", "Cybenetics ETA"))
    c.need(has(eff, "gold", "platinum", "titanium", "diamond"), f"minder dan Gold-efficientie ({eff})")
    ff = c.fact("form_factor", c.spec("Form factor voeding"))
    c.need(None if ff is None else ff.strip().upper() == "ATX", f"geen ATX-voeding ({ff})")
    vt = c.fact("voedingtype", c.spec("Voedingtype"))
    atx31, atx30 = has(vt, "3.1"), has(vt, "3.0")
    c.need(None if vt is None else bool(atx31 or atx30), f"geen ATX 3.0/3.1 ({vt})")
    blob = " ".join(f"{k} {v}" for k, v in c.specs.items()).lower()
    modern = any(t in blob for t in ("12(+4)-pins", "12+4-pins", "12v-2x6", "12vhpwr", "16-pins"))
    c.need(True if modern else None, "12V-2x6/12VHPWR-connector")
    c.max_mm("lengte_mm", c.spec("Diepte", "Lengte"), L["psu_mm"], "voeding te lang voor de case")
    if atx31:
        c.bonus(Q.get("psu_atx31", 0), "ATX 3.1")
    if eff and not has(eff, "gold"):
        c.bonus(Q.get("psu_above_gold", 0), f"efficientie {eff}")


def rule_fans(c: Ctx, B: dict, L: dict, Q: dict) -> None:
    category(c, "Case fans")
    d = c.fact("diameter_mm", num(c.spec("Diameter fan")))
    c.need(None if d is None else d == B["size_mm"], f"niet {B['size_mm']}mm ({d})")
    n = c.fact("aantal", num(c.spec("Aantal ventilatoren")))
    c.need(None if n is None else n == B["pack_size"], f"geen {B['pack_size']}-pack ({n and int(n)}x)")
    conn = c.fact("fan_connector", c.spec("Fan-connector"))
    c.need(has(conn, "4 pin", "4-pin", "pwm"), f"geen PWM ({conn})")
    led = c.fact("led_connector", c.spec("LED-connector"))
    c.need(has(led, "argb", "a-rgb", "5v"), f"geen ARGB ({led})")
    kleur = c.fact("kleur", c.spec("Kleur frame", "Kleur", "Kleuren"))
    c.need(has(kleur, "zwart"), f"frame niet zwart ({kleur})")


RULES: dict[str, Callable[[Ctx, dict, dict, dict], None]] = {
    "case": rule_case, "cpu": rule_cpu, "gpu": rule_gpu, "motherboard": rule_motherboard, "ram": rule_ram,
    "cooler": rule_cooler, "ssd": rule_ssd, "psu": rule_psu, "fans": rule_fans,
}
