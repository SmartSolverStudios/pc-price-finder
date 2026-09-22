# PC Price Finder v5

Gericht op de 7800X3D + RTX 5070 Ti-build in de Lian Li O11 Vision Compact.

## Hoe het werkt
1. **Discovery**: zoekopdrachten op Tweakers Pricewatch (`build_config.json` -> `queries`).
2. **Productpagina** openen (de DPG-cookiemuur wordt automatisch opnieuw geprobeerd).
3. **Specificatielijst** uitlezen als losse velden (`Lengte`, `CAS Latency`, `SSD-formaat`, ...), nooit als tekstblob.
4. **Harde filters** per onderdeel in `rules.py`. Ontbreekt een spec op Tweakers, dan wordt het `MANUAL_CHECK`, nooit gegokt.
5. **Prijs** uit de shoplijst: goedkoopste *nieuwe* aanbieding bij een consumentenshop. Tweedehands/open doos en zakelijke shops tellen niet mee.
6. **Prijs/kwaliteit**: effectieve prijs = prijs - bonus (`quality_bonus_eur`), bv. CL30, ATX 3.1, boxed CPU; QLC-SSD en OEM krijgen een straf.

De limieten voor GPU-lengte, koelerhoogte en voedingslengte komen uit de Tweakers-specs van de gevonden case (O11 Vision Compact: 408 / 164 / 220 mm).

## Starten
    python -m pip install -r requirements.txt
    python pc_price_finder.py              # alles
    python pc_price_finder.py gpu ram      # alleen deze onderdelen (case wordt altijd meegenomen voor de limieten)
    python pc_price_finder.py --no-cache   # pagina's niet uit de cache halen

Pagina's worden 6 uur gecachet in `.cache/` (`search.cache_hours`).

## Debuggen
    python inspect_product.py https://tweakers.net/pricewatch/2158394/....html
    python inspect_product.py --search "Lian Li O11 Vision Compact"

Toont alle speclabels en aanbiedingen zoals de parser ze ziet.

## Output
- `results.json`: per onderdeel `recommended`, `alternatives`, `needs_manual_check` en `rejected` (met reden)
- `recommendations.csv`: aanbevolen onderdelen (puntkomma-gescheiden, opent direct in Excel NL)
- `report.txt`: leesbare samenvatting met buildtotaal
