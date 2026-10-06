from pathlib import Path
from urllib.request import urlopen
import zipfile

ROOT = Path(__file__).resolve().parents[1]
out = ROOT / 'backend/data/raw/uci-water-quality-prediction-1.zip'
out.parent.mkdir(parents=True, exist_ok=True)
url = 'https://archive.ics.uci.edu/static/public/733/water+quality+prediction-1.zip'
with urlopen(url, timeout=60) as response:
    out.write_bytes(response.read())
with zipfile.ZipFile(out) as archive:
    archive.extractall(out.parent / 'uci-water-quality-prediction')
print(f'Downloaded and extracted {out}')
