"""Debug helper: print the parsed Tweakers specs and offers for product URLs or a search query.

    python inspect_product.py https://tweakers.net/pricewatch/2158394/....html
    python inspect_product.py --search "Lian Li O11 Vision Compact"
"""
import json
import sys
from pathlib import Path

from tweakers import Tweakers

cfg = json.loads((Path(__file__).resolve().parent / "build_config.json").read_text(encoding="utf-8"))["search"]
tw = Tweakers(cfg["user_agent"], float(cfg["request_delay_seconds"]))

args = sys.argv[1:]
if args and args[0] == "--search":
    for hit in tw.search(" ".join(args[1:]), 20):
        print(hit["product_id"], "|", hit["title"], "|", hit["url"])
    sys.exit()

for url in args:
    p = tw.product(url)
    print("=" * 80)
    print(p["page_title"], "|", url)
    for k, v in p["specs"].items():
        print(f"  {k} = {v}")
    print("  lowest label:", p["lowest_price_label"])
    for o in p["offers"][:5]:
        print("  offer:", o["shop"], o["price"], "| verzending:", o["shipping"], "|", o["condition"] or "nieuw", "|", o["delivery"])
    print("  offers total:", len(p["offers"]))
