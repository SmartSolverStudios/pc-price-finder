@echo off
cd /d "%~dp0"
python -m pip install -r requirements.txt
python pc_price_finder.py
pause
