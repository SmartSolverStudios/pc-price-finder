#!/usr/bin/env python3
from __future__ import annotations
import csv, json, re, time
from pathlib import Path
from typing import Any
from urllib.parse import quote
import requests
from bs4 import BeautifulSoup

ROOT=Path(__file__).resolve().parent
CONFIG=json.loads((ROOT/"build_config.json").read_text(encoding="utf-8"))
UA=CONFIG["search"]["user_agent"]; DELAY=float(CONFIG["search"]["request_delay_seconds"]); MAX_RESULTS=int(CONFIG["search"]["max_results_per_query"])
session=requests.Session(); session.headers.update({"User-Agent":UA,"Accept-Language":"nl-NL,nl;q=0.9,en;q=0.8"})

def norm(s): return re.sub(r"\s+"," ",s or "").strip()
def low(s): return norm(s).lower()
def money(s):
    if not s: return None
    m=re.search(r"([0-9]{1,5}(?:[.,][0-9]{1,2})?)",s.replace("\xa0"," "))
    if not m:return None
    try:return float(m.group(1).replace(".","").replace(",","."))
    except:return None
def has_any(t,terms): return any(x in t for x in terms)
def fetch(url):
    time.sleep(DELAY); r=session.get(url,timeout=25); r.raise_for_status(); return r.text

def search_tweakers(q):
    url="https://tweakers.net/pricewatch/zoeken/?keyword="+quote(q)
    try: html=fetch(url)
    except Exception as e: return []
    soup=BeautifulSoup(html,"html.parser"); out=[]; seen=set()
    for a in soup.select('a[href*="/pricewatch/"]'):
        href=a.get("href",""); title=norm(a.get_text(" ",strip=True))
        m=re.search(r"/pricewatch/(\d+)/",href)
        if not m or not title or m.group(1) in seen: continue
        if not href.startswith("http"): href="https://tweakers.net"+href
        seen.add(m.group(1)); out.append({"product_id":m.group(1),"title":title,"url":href,"query":q})
        if len(out)>=MAX_RESULTS: break
    return out

def extract_dim(text,labels):
    t=low(text)
    for label in labels:
        m=re.search(re.escape(label.lower())+r"[^0-9]{0,40}(\d{2,4}(?:[.,]\d+)?)",t)
        if m:
            try:return float(m.group(1).replace(",",".")) 
            except: pass
    return None

def verify(title,text):
    t=low(title+" "+text); v={}
    v["cpu_7800x3d"]=bool(re.search(r"ryzen\s*7\s*7800x3d",t)); v["am5"]="am5" in t
    v["boxed"]="boxed" in low(title) or "retail" in low(title); v["tray"]="tray" in low(title) or "oem" in low(title)
    v["gpu_5070_ti"]=bool(re.search(r"rtx\s*5070\s*ti",t)); v["gpu_vram_gb"]=16 if re.search(r"16\s*gb|16384\s*mb",t) else None
    v["gpu_length_mm"]=extract_dim(text,["lengte","length","kaartlengte","card length"])
    v["atx"]="atx" in t and not has_any(t,["micro atx","micro-atx","matx","mini-itx","mini itx","itx"])
    v["motherboard_b650"]=bool(re.search(r"\bb650e?\b",t)); v["motherboard_itx"]=has_any(t,["b650i","mini-itx","mini itx","itx"]); v["motherboard_matx"]=has_any(t,["b650m","micro-atx","micro atx","matx"])
    v["wifi"]="wifi" in t or "wi-fi" in t; v["ddr5"]="ddr5" in t
    v["ram_32gb"]=bool(re.search(r"\b32\s*gb\b",t)); v["ram_2x16"]=bool(re.search(r"2\s*x\s*16|2x16|2\s*[×x]\s*16",t)); v["ram_ddr5"]="ddr5" in t
    v["ram_6000"]=bool(re.search(r"6000\s*(?:mhz|mt/s)?",t)); cls=re.findall(r"\bcl\s*[-:]?\s*(\d{2})\b",t); v["ram_cl"]=int(cls[0]) if cls else None
    v["ram_expo"]="expo" in t; v["ram_black"]=has_any(t,["black","zwart"])
    v["cooler_air"]=not has_any(t,["aio","watercool","water cooler","liquid cooler"]); v["cooler_am5"]="am5" in t
    v["cooler_height_mm"]=extract_dim(text,["hoogte","height","koelerhoogte","cooler height"])
    v["ssd_1tb"]=bool(re.search(r"1\s*tb|1000\s*gb|1024\s*gb",t)); v["ssd_nvme"]="nvme" in t; v["ssd_2280"]=bool(re.search(r"m\.?2\s*2280|2280",t))
    v["ssd_wrong_size"]=bool(re.search(r"\b2230\b|\b2242\b|\b2260\b",t)); v["ssd_gen5"]=bool(re.search(r"gen\s*5|pcie\s*5\.0|pci-e\s*5\.0",t)); v["ssd_gen4"]=bool(re.search(r"gen\s*4|pcie\s*4\.0|pci-e\s*4\.0",t))
    v["psu_850w"]=bool(re.search(r"\b850\s*w\b|\b850w\b",t)); v["psu_gold"]="80+ gold" in t or "80 plus gold" in t; v["psu_atx"]="atx" in t and not has_any(t,["sfx","sfx-l","flex atx"]); v["psu_sfx"]=has_any(t,["sfx","sfx-l"])
    v["psu_atx31"]="atx 3.1" in t or "atx3.1" in t; v["psu_atx30"]="atx 3.0" in t or "atx3.0" in t; v["psu_modern_connector"]=has_any(t,["12v-2x6","12vhpwr","pci-e 5.0","pcie 5.0"])
    v["psu_length_mm"]=extract_dim(text,["lengte","length","psu length"])
    v["fan_120mm"]=bool(re.search(r"\b120\s*mm\b",t)); v["fan_pwm"]="pwm" in t; v["fan_argb"]="argb" in t or "a-rgb" in t; v["fan_black"]=has_any(t,["black","zwart"])
    v["fan_3pack"]=bool(re.search(r"3\s*[- ]?pack|3x|3\s*stuks|3\s*pcs|triple pack",t)); v["fan_reverse"]="reverse" in t
    return v

def enrich(item):
    try:
        html=fetch(item["url"]); soup=BeautifulSoup(html,"html.parser"); text=norm(soup.get_text(" ",strip=True))
        item["text"]=text[:3000]; item["verified"]=verify(item["title"],text)
        item["current_offer"]=not has_any(low(text),["geen actuele prijs","geen actuele aanbieding","niet meer leverbaar","niet leverbaar"])
        prices=re.findall(r"€\s*([0-9]{1,5}(?:[.,][0-9]{1,2})?)",text)
        item["price"]=money(prices[0]) if prices else None
    except Exception as e:
        item["verified"]={}; item["current_offer"]=False; item["verification_error"]=str(e)
    return item

def hard_check(kind,x):
    v=x.get("verified",{}); t=low(x.get("title")); r=[]; c=[]
    if not x.get("current_offer"): r.append("no_current_offer")
    if kind=="case":
        if not ("o11 vision compact" in t and ("black" in t or "zwart" in t)): r.append("not_exact_case")
    elif kind=="cpu":
        if not v.get("cpu_7800x3d"): r.append("not_7800x3d")
        if not v.get("am5"): r.append("AM5_not_verified")
        if has_any(t,CONFIG["build"]["cpu"]["exclude_terms"]): r.append("complete_pc_or_bundle")
    elif kind=="gpu":
        if not v.get("gpu_5070_ti"): r.append("not_5070_ti")
        if v.get("gpu_vram_gb")!=16:r.append("16GB_not_verified")
        if v.get("gpu_length_mm") is None:c.append("GPU_length_manual_check")
        elif v["gpu_length_mm"]>408:r.append("GPU_too_long")
    elif kind=="motherboard":
        if not v.get("motherboard_b650"):r.append("not_B650/B650E")
        if not v.get("am5"):r.append("AM5_not_verified")
        if not v.get("atx") or v.get("motherboard_itx") or v.get("motherboard_matx"):r.append("not_full_ATX")
        if not v.get("ddr5"):r.append("DDR5_not_verified")
        if not v.get("wifi"):r.append("WiFi_not_verified")
    elif kind=="ram":
        for key,msg in [("ram_32gb","not_32GB"),("ram_2x16","2x16_not_verified"),("ram_ddr5","DDR5_not_verified"),("ram_6000","6000_not_verified"),("ram_expo","EXPO_not_verified")]:
            if not v.get(key):r.append(msg)
        if v.get("ram_cl") not in [30,32]:r.append("CL30_or_CL32_required")
        if not v.get("ram_black"):c.append("RAM_color_manual_check")
    elif kind=="cooler":
        if not v.get("cooler_air"):r.append("not_air_cooler")
        if not v.get("cooler_am5"):r.append("AM5_not_verified")
        if v.get("cooler_height_mm") is None:c.append("cooler_height_manual_check")
        elif v["cooler_height_mm"]>167:r.append("cooler_too_tall")
    elif kind=="ssd":
        if not v.get("ssd_1tb"):r.append("not_1TB")
        if not v.get("ssd_nvme"):r.append("NVMe_not_verified")
        if not v.get("ssd_2280") or v.get("ssd_wrong_size"):r.append("M2_2280_required")
        if v.get("ssd_gen5"):r.append("Gen5_rejected")
        if not v.get("ssd_gen4"):r.append("PCIe_Gen4_not_verified")
    elif kind=="psu":
        if not v.get("psu_850w"):r.append("not_850W")
        if not v.get("psu_gold"):r.append("80+_Gold_not_verified")
        if not v.get("psu_atx") or v.get("psu_sfx"):r.append("ATX_not_SFX_required")
        if not (v.get("psu_atx31") or v.get("psu_atx30")):r.append("ATX_3.0_or_3.1_required")
        if not v.get("psu_modern_connector"):r.append("modern_GPU_connector_not_verified")
        if v.get("psu_length_mm") is None:c.append("PSU_length_manual_check")
        elif v["psu_length_mm"]>220:r.append("PSU_too_long")
    elif kind=="fans":
        for key,msg in [("fan_120mm","not_120mm"),("fan_pwm","PWM_not_verified"),("fan_argb","ARGB_not_verified"),("fan_black","black_not_verified"),("fan_3pack","3_pack_required")]:
            if not v.get(key):r.append(msg)
    return (not r and not c),r,c

def score(kind,x):
    v=x.get("verified",{}); s=50 if x.get("current_offer") else 0
    if kind=="cpu": s+=20 if v.get("boxed") else (-10 if v.get("tray") else 0)
    if kind=="ram": s+=20 if v.get("ram_cl")==30 else (10 if v.get("ram_cl")==32 else 0)
    if kind=="psu": s+=20 if v.get("psu_atx31") else (10 if v.get("psu_atx30") else 0)
    if kind=="cooler" and any(z in low(x.get("title")) for z in ["peerless assassin","phantom spirit","freezer 36","fortis 5","fuma"]):s+=10
    return s

def select(kind,items):
    valid=[]; manual=[]
    for x in items:
        ok,r,c=hard_check(kind,x); x["quality_score"]=score(kind,x); x["hard_pass"]=ok; x["reject_reasons"]=r; x["manual_checks"]=c
        if ok:valid.append(x)
        elif not r and c:manual.append(x)
    valid.sort(key=lambda x:((x.get("price") is None),x.get("price") or 10**9,-x["quality_score"]))
    return {"recommended":valid[0] if valid else None,"alternatives":valid[1:8],"needs_manual_check":manual[:10]}

def main():
    B=CONFIG["build"]; queries={
      "case":[B["case"]["query"]],"cpu":[B["cpu"]["query"],"7800X3D boxed","7800X3D tray"],
      "gpu":B["gpu"]["queries"],"motherboard":B["motherboard"]["queries"],"ram":B["ram"]["queries"],
      "cooler":B["cooler"]["queries"],"ssd":B["ssd"]["queries"],"psu":B["psu"]["queries"],"fans":B["fans"]["queries"]}
    result={"version":"4.0","generated_at":time.strftime("%Y-%m-%d %H:%M:%S"),"source":CONFIG["source"],"components":{}}
    for kind,qs in queries.items():
        print(f"\n=== {kind.upper()} ==="); discovered=[]; seen=set()
        for q in qs:
            print("search:",q)
            for x in search_tweakers(q):
                if x.get("product_id") not in seen: seen.add(x["product_id"]); discovered.append(x)
        print("unique:",len(discovered))
        verified=[enrich(x) for x in discovered]
        result["components"][kind]=select(kind,verified)
    rec={k:v["recommended"] for k,v in result["components"].items()}; total=0; complete=True
    for x in rec.values():
        if x and x.get("price") is not None: total+=x["price"]
        else: complete=False
    result["summary"]={"recommended_count":sum(x is not None for x in rec.values()),"build_total_eur":round(total,2) if complete else None,"build_total_complete":complete}
    (ROOT/"results.json").write_text(json.dumps(result,indent=2,ensure_ascii=False),encoding="utf-8")
    with open(ROOT/"recommendations.csv","w",newline="",encoding="utf-8") as f:
        w=csv.writer(f);w.writerow(["component","status","price_eur","product","url"])
        for k,b in result["components"].items():
            x=b["recommended"];w.writerow([k,"RECOMMENDED" if x else "NO VERIFIED CURRENT MATCH",x.get("price","") if x else "",x.get("title","") if x else "",x.get("url","") if x else ""])
    lines=["PC PRICE FINDER v4","="*60,"Generated: "+result["generated_at"],""]
    for k,b in result["components"].items():
        x=b["recommended"];lines += [k.upper(),"-"*25,(f"{x['title']} — €{x['price']:.2f}" if x and x.get("price") is not None else "No verified current match."),""] 
    lines += [f"BUILD TOTAL: {result['summary']['build_total_eur']}"]
    (ROOT/"report.txt").write_text("\n".join(lines),encoding="utf-8")
    print("\nDONE. Results written to results.json, recommendations.csv and report.txt")

if __name__=="__main__": main()
