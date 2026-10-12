"""Validate the runtime atlas against the original uploaded animation.
Run: python3 tests/beetle_assets.test.py /path/to/beetle_animated_win.zip
Requires Pillow, only for development/testing.
"""
from pathlib import Path
from PIL import Image, ImageChops
import argparse, hashlib, io, json, zipfile
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser(description=__doc__);p.add_argument('source',type=Path);args=p.parse_args()
data=json.loads((ROOT/'assets/animations/beetle/atlas.json').read_text())
manifest=json.loads((ROOT/'assets/animations/beetle/SOURCE_MANIFEST.json').read_text())
checks=[]
def ok(name,value):
    assert value,name
    checks.append({'test':name,'pass':True});print('PASS',name)
with zipfile.ZipFile(args.source) as z:
    ok('Uploaded archive integrity',z.testzip() is None)
    ok('Archive SHA-256 matches recorded input',hashlib.sha256(args.source.read_bytes()).hexdigest()==manifest['archiveSha256'])
    expected=[f'anim_{n:04}.png' for n in range(7,61)]
    ok('All 54 supplied frame names are present in exact order',[f['source'] for f in data['frames']]==expected)
    ok('Each original frame hash is preserved',all(hashlib.sha256(z.read(f['name'])).hexdigest()==f['sha256'] for f in manifest['frames']))
    pages=[Image.open(ROOT/p['image']).convert('RGBA') for p in data['pages']]
    exact=True;contained=True;transparent=True
    for f in data['frames']:
        original=Image.open(io.BytesIO(z.read(f['source']))).convert('RGBA')
        box=original.getchannel('A').getbbox();c=data['crop']
        contained &= box[0]>=c[0] and box[1]>=c[1] and box[2]<=c[2] and box[3]<=c[3]
        wanted=original.crop(c).resize((384,384),Image.Resampling.LANCZOS)
        actual=pages[f['page']].crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h']))
        exact &= wanted.tobytes()==actual.tobytes()
        transparent &= actual.getchannel('A').getextrema()==(0,255)
    ok('Common crop contains every source frame without clipping',contained)
    ok('All 54 atlas regions match the intended source resample exactly',exact)
    ok('Transparency retained on all 54 frames',transparent)
    ok('Atlas dimensions never exceed 2048 pixels',all(max(p.size)<=2048 for p in pages))
    ok('Static scatter matches first animation frame',Image.open(ROOT/'assets/symbols/scatter.png').convert('RGBA').tobytes()==pages[0].crop((2,2,386,386)).tobytes())
(ROOT/'tests/beetle-asset-results.json').write_text(json.dumps({'checks':checks},indent=2)+'\n')
print(f'{len(checks)}/{len(checks)} passed')
