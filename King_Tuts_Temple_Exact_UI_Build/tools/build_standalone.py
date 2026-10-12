#!/usr/bin/env python3
"""Rebuild the offline single-file game using only Python's standard library.
Run from any working directory: python3 tools/build_standalone.py
"""
from pathlib import Path
import re,base64,json,mimetypes
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'PLAY.html'
def build():
 html=(ROOT/'index.html').read_text()
 css=(ROOT/'styles.css').read_text()
 css=re.sub(r"url\(['\"]?assets/[^)]+\)",'none',css)
 html=html.replace('<link rel="stylesheet" href="styles.css">','<style>'+css+'</style>')
 assets={}
 for p in (ROOT/'assets').rglob('*'):
  if p.suffix in ['.png','.webp'] and 'characters' not in p.parts:
   mime=mimetypes.guess_type(p)[0];assets[str(p.relative_to(ROOT))]='data:'+mime+';base64,'+base64.b64encode(p.read_bytes()).decode()
 html=re.sub(r'src="(assets/[^"]+)"',r'data-asset="\1"',html)
 bootstrap='window.KEMET_ASSETS='+json.dumps(assets,separators=(',',':'))+';\n'+'''document.querySelectorAll('[data-asset]').forEach(el=>el.src=window.KEMET_ASSETS[el.dataset.asset]);
\n'''
 html=html.replace('<script src="vendor/pixi-gsap.js"></script>','<script>'+bootstrap+'</script><script>'+(ROOT/'vendor/pixi-gsap.js').read_text()+'</script>')
 for name in ['atlas.js','beetle-data.js','eye-data.js','math.js','spine-data.js','spine-character.js','game.js']:
  html=html.replace('<script src="'+name+'"></script>','<script>\n'+(ROOT/name).read_text()+'\n</script>')
 OUT.write_text(html)
 print(OUT,OUT.stat().st_size)
 return html
if __name__=='__main__':build()
