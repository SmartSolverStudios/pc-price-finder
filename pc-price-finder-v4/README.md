# PC Price Finder v4

Gericht op de 7800X3D + RTX 5070 Ti-build.

## Hard filters
- GPU: RTX 5070 Ti 16GB, maximaal 408mm
- CPU: Ryzen 7 7800X3D AM5; complete pc's/bundles uitgesloten
- Motherboard: AM5, B650/B650E, ATX, DDR5, WiFi
- RAM: 32GB, 2x16GB, DDR5-6000, EXPO, CL30/CL32
- Cooler: AM5 air cooler, maximaal 167mm
- SSD: 1TB NVMe M.2 2280 PCIe Gen4; Gen5 en 2230/2242/2260 uitgesloten
- PSU: 850W, 80+ Gold, ATX, ATX 3.0/3.1, moderne GPU-connector, maximaal 220mm; SFX uitgesloten
- Fans: 120mm PWM ARGB zwart, 3-pack

## Output
- results.json: alle verificaties, rejects en alternatieven
- recommendations.csv: aanbevolen onderdelen
- report.txt: korte samenvatting

Start:
    cd C:\Users\yusuf\Downloads\pc-price-finder-v4
    python -m pip install -r requirements.txt
    python pc_price_finder.py

Kritieke onbekende afmetingen worden niet gegokt; zulke producten komen bij manual_check.
