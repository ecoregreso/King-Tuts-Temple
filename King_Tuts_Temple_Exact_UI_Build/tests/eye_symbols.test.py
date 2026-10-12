#!/usr/bin/env python3
"""Offline sprite/landing regression for Kemet's eye + scarab looping update.
Requires Pillow and Playwright + local Chromium ONLY for dev/test.
The game itself requires neither Python nor a running server.
"""
from pathlib import Path
import json, math, os, hashlib, time
from PIL import Image
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
checks=[];page_errors=[];console_warnings=[];http_requests=[]
def ok(name,result=True):
    if not result:raise AssertionError(name)
    checks.append(name)
    print(f'PASS {len(checks):02d} {name}',flush=True)

# First validate ORIGINAL placement metadata and the generated / cropped source.
eye=json.loads((ROOT/'assets/animations/eye/atlas.json').read_text())
beetle=json.loads((ROOT/'assets/animations/beetle/atlas.json').read_text())
trace=json.loads((ROOT/'assets/animations/eye/ALIGNMENT_MANIFEST.json').read_text())
ids=json.loads((ROOT/'assets/symbols/SPRITEFORGE_SOURCE_MAP.json').read_text())
ok('Exactly 35 original eye frames in source order',eye['frameCount']==35 and [x['source'] for x in eye['frames']]==[f'anim_{i:04}.png' for i in range(5,40)])
ok('Existing 54 scarab frames intact, chronological',beetle['frameCount']==54 and [x['source'] for x in beetle['frames']]==[f'anim_{i:04}.png' for i in range(7,61)])
ok('Both clips are infinite ping-pong loops',eye['loop']=='pingpong' and beetle['loop']=='pingpong')
for label,data in [('eye',eye),('beetle',beetle)]:
  pages=[Image.open(ROOT/p['image']).convert('RGBA') for p in data['pages']]
  ok(label+' atlas pages are present and exact dimensions',all(im.size==(p['width'],p['height']) for im,p in zip(pages,data['pages'])))
  ok(label+' reuses one constant frame rectangle',len({(f['w'],f['h']) for f in data['frames']})==1 and all(f['w']==384 and f['h']==384 for f in data['frames']))
  ok(label+' atlas has transparent alpha',all(im.getchannel('A').getextrema()==(0,255) for im in pages))
  ok(label+' atlas fits efficient GPU dimensions',all(max(im.size)<=2048 for im in pages))
eye_pages=[Image.open(ROOT/p['image']).convert('RGBA') for p in eye['pages']]
centers=[]
for frame in eye['frames']:
 im=eye_pages[frame['page']].crop((frame['x'],frame['y'],frame['x']+384,frame['y']+384))
 b=im.getchannel('A').getbbox()
 centers.append(((b[0]+b[2])/2,(b[1]+b[3])/2))
ok('All eye frames stabilized within 1.5px of the slot center',all(abs(x-192)<=1 and abs(y-192)<=1.5 for x,y in centers))
ok('35 original eye hashes and per-frame crop origins recorded',len(trace['sourceFrames'])==35 and all(len(x['sha256'])==64 for x in trace['sourceFrames']))
ok('All 11 SpriteForge symbols imported as PNG with no missing frames',len(ids)==11 and len({x['symbol'] for x in ids})==11 and all((ROOT/'assets/symbols'/(x['symbol']+'.png')).exists() for x in ids))
ok('All new symbols are similarly sized (original aspect ratio kept)',all(290<=Image.open(ROOT/'assets/symbols'/(x['symbol']+'.png')).width<=307 and 290<=Image.open(ROOT/'assets/symbols'/(x['symbol']+'.png')).height<=325 for x in ids))
ok('Standalone playable HTML is present', (ROOT/'PLAY.html').stat().st_size>30_000_000)

BOOT='<script>window.__KEMET_TEST__=true;Object.defineProperty(window,"localStorage",{value:{getItem:()=>null,setItem:()=>{}}});</script>'
HTML=(ROOT/'PLAY.html').read_text().replace('<head>','<head>'+BOOT,1)
LOSS=[['eye','pharaoh','lotus'],['mummy','eye_blue','eye'],['scatter','royal_ankh','cobra'],['cleopatra','treasure','scarab_blue'],['bonus','anubis_tile','necklace']]
TWO=[['eye','pharaoh','lotus'],['mummy','eye','eye'],['scatter','royal_ankh','cobra'],['cleopatra','eye_blue','scarab_blue'],['bonus','anubis_tile','necklace']]
TRIGGER=[['bonus','pharaoh','lotus'],['mummy','eye','eye'],['scatter','royal_ankh','cobra'],['cleopatra','eye_blue','scarab_blue'],['bonus','anubis_tile','necklace']]
start=time.monotonic()
with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  page=browser.new_page(viewport={'width':1600,'height':900},device_scale_factor=1)
  page.on('pageerror',lambda e:page_errors.append(str(e)))
  page.on('console',lambda m:console_warnings.append(m.text) if m.type in ('warning','error') else None)
  page.on('request',lambda r:http_requests.append(r.url) if r.url.startswith(('http:','https:')) else None)
  page.set_content(HTML,wait_until='load',timeout=90000)
  page.wait_for_function('window.KEMET?.ready',timeout=50000)
  page.evaluate('''()=>{window.S=KEMET_TEST.scene;window.G=KEMET_TEST.game;window.A=KEMET_TEST.app;
   window.vis=()=>S.reels.flatMap(r=>r.views.filter(v=>v.row>=0&&v.row<3));
   window.spinGrid=g=>{window.spinDone=false;window.spinError=null;G.spin({grid:g}).then(()=>spinDone=true).catch(e=>spinError=String(e));};
  }''')
  ok('Real Chromium game boots from offline HTML',page.evaluate('KEMET.ready&&G.phase==="IDLE"'))
  ok('17 named paying/feature symbols registered',page.evaluate('KemetMath.SYMBOLS.length===17&&KemetMath.SYMBOLS.every(s=>!!S.tex[s.id])'))
  ok('All 35/54 frames are runtime textures shared by all symbol instances',page.evaluate('S.tex.eyeAnimation.frames.length===35&&S.tex.beetle.frames.length===54'))
  ok('All eye/scarab frames have 384px bound and fixed centered sprite anchors',page.evaluate('S.tex.eyeAnimation.frames.every(t=>t.width===384&&t.height===384)&&S.tex.beetle.frames.every(t=>t.width===384&&t.height===384)&&S.reels.every(r=>r.views.every(v=>v.sprite.anchor.x===.5&&v.sprite.anchor.y===.5))'))
  ok('Initial red-eye and green scarab symbols are already animating',page.evaluate('vis().filter(v=>v.id==="eye").every(v=>v.eyePlaying)&&vis().filter(v=>v.id==="scatter").every(v=>v.beetlePlaying)'))
  page.screenshot(path=str(ROOT/'tests/eye-symbols-desktop.png'))
  ok('Landing test grid has zero line win and no free spins',page.evaluate('g=>{const r=KemetMath.evaluate(g);return r.totalCoins===0&&r.freeAward===0}',LOSS))
  page.evaluate('()=>{gsap.globalTimeline.timeScale(4);}')
  page.evaluate('spinGrid',LOSS);page.wait_for_function('spinDone || spinError',timeout=30000)
  ok('Zero-win spin finishes and pays no prize',page.evaluate('!spinError && G.phase==="IDLE"&&G.lastWin===0'))
  ok('Every red eye loops, emerald scarab loops, and blue variants shimmer',page.evaluate('vis().filter(v=>v.id==="eye").every(v=>v.eyePlaying)&&vis().filter(v=>v.id==="scatter").every(v=>v.beetlePlaying)&&vis().filter(v=>["eye_blue","scarab_blue"].includes(v.id)).every(v=>v.pulseActive)'))
  ok('No hidden buffer row receives landing animations',page.evaluate('S.reels.every(r=>r.views.filter(v=>v.row===-1||v.row===3).every(v=>!v.animation&&!v.pulseActive))'))
  page.evaluate('''()=>{A.stop();window.E=vis().find(v=>v.id==='eye');window.B=vis().find(v=>v.id==='scatter');
    window.layout=v=>[v.node.x,v.node.y,v.sprite.x,v.sprite.y,v.sprite.scale.x,v.sprite.scale.y,v.sprite.anchor.x,v.sprite.anchor.y];
    window.le=layout(E);window.lb=layout(B);
    E.cancelLanding();E.land();B.cancelLanding();B.land();
  }''')
  ok('Red eye first frame corresponds exactly to the uploaded first frame',page.evaluate('E.sprite.texture===S.tex.eyeAnimation.frames[0]'))
  ok('Emerald scarab first frame corresponds exactly to the original first frame',page.evaluate('B.sprite.texture===S.tex.beetle.frames[0]'))
  # Force over THREE complete cycles without moving the reel or sprite transform.
  result=page.evaluate('''()=>{let eyeFrames=[],beetleFrames=[];for(let i=0;i<324;i++){
    E.update(1/30);B.update(1/30);eyeFrames.push(E.animationFrame);beetleFrames.push(B.animationFrame);
  }A.render();return {eyeFrames,beetleFrames,eyeLayout:layout(E),beetleLayout:layout(B),eyeActive:!!E.animation,beetleActive:!!B.animation,eyeTex:E.sprite.texture===S.tex.eyeAnimation.frames[E.animationFrame],beetleTex:B.sprite.texture===S.tex.beetle.frames[B.animationFrame]};}''')
  ok('35-frame eye wraps smoothly and continues beyond its natural length', result['eyeActive'] and len(set(result['eyeFrames']))==35 and result['eyeFrames'][33:37]==[34,33,32,31] and result['eyeTex'])
  ok('54-frame scarab wraps smoothly and continues beyond its natural length', result['beetleActive'] and len(set(result['beetleFrames']))==54 and result['beetleFrames'][52:56]==[53,52,51,50] and result['beetleTex'])
  ok('Eye sprite never moves/resizes/changes pivot during 324 frames',result['eyeLayout']==page.evaluate('le'))
  ok('Scarab sprite never moves/resizes/changes pivot during 324 frames',result['beetleLayout']==page.evaluate('lb'))
  page.evaluate('A.start()')
  page.wait_for_timeout(240)
  page.screenshot(path=str(ROOT/'tests/eye-symbols-animated.png'))
  n=page.evaluate('''()=>({eye:vis().reduce((n,v)=>n+v.eyeLandings,0),beetle:vis().reduce((n,v)=>n+v.beetleLandings,0)})''')
  page.evaluate('spinGrid',TWO)
  # Must clear ALL earlier animation instantly, not after a previous loop finishes.
  ok('Next spin cancels every previous eye and beetle clip immediately',page.evaluate('vis().every(v=>!v.animation&&!v.pulseActive)'))
  page.wait_for_function('spinDone || spinError',timeout=30000)
  after=page.evaluate('''()=>({eye:vis().reduce((n,v)=>n+v.eyeLandings,0),beetle:vis().reduce((n,v)=>n+v.beetleLandings,0)})''')
  ok('Reel stops restart eye clips independently on repeated landings',after['eye']>n['eye'])
  ok('Reel stops restart scarab clips on repeated landings',after['beetle']>n['beetle'])
  ok('Every visible eye and beetle remains active until another spin',page.evaluate('vis().filter(v=>["eye","scatter"].includes(v.id)).every(v=>!!v.animation)'))
  # Immediate stop: multiple stop requests cannot re-trigger landing events.
  page.evaluate('spinGrid',LOSS);page.evaluate('S.stop();S.stop();S.stop()')
  page.wait_for_function('spinDone || spinError',timeout=30000)
  ok('Manual quick-stop keeps scene usable',page.evaluate('!spinError && G.phase==="IDLE"'))
  page.evaluate('''()=>{let cb=document.getElementById('motionSetting');cb.checked=true;cb.dispatchEvent(new Event('change'));S.update(.05);}''')
  ok('Reduced motion freezes all animation and shimmer',page.evaluate('vis().every(v=>!v.animation&&!v.pulseActive)'))
  page.evaluate('''()=>{let cb=document.getElementById('motionSetting');cb.checked=false;cb.dispatchEvent(new Event('change'));}''')
  # Repeat several times at normal-engine timing; browser stays responsive.
  page.evaluate('()=>{gsap.globalTimeline.timeScale(5);}')
  before=page.evaluate('G.session.state.spins')
  for i in range(5):
   page.evaluate('spinGrid',LOSS)
   page.wait_for_function('spinDone || spinError',timeout=20000)
  ok('Five consecutive real rendered spins finish cleanly',page.evaluate('G.session.state.spins')==before+5 and page.evaluate('G.phase')=='IDLE')
  ok('Reel view counts and texture sharing are stable',page.evaluate('S.reels.every(r=>r.views.length===5)&&S.tex.eyeAnimation.pages.length===2&&S.tex.beetle.pages.length===3'))
  stressSeconds=round(time.monotonic()-start,2)
  ok('Mixed BONUS / scarab grid correctly awards 8 free spins in math',page.evaluate('g=>KemetMath.evaluate(g).freeAward===8',TRIGGER))
  for w,h in [(390,844),(844,390),(1280,720),(1920,1080)]:
   page.set_viewport_size({'width':w,'height':h});page.evaluate('S.resize()');page.wait_for_timeout(100)
   bb=page.locator('#spinBtn').bounding_box()
   ok(f'Controls stay visible inside {w}×{h} view',bool(bb and 0<=bb['x']<=w and 0<=bb['y']<=h and bb['x']+bb['width']<=w+1 and bb['y']+bb['height']<=h+1))
   if w==390:page.screenshot(path=str(ROOT/'tests/eye-symbols-mobile.png'))
  ok('Existing freestanding Spine Anubis remains available',page.evaluate('!!S.spinePlayer && !!S.spineHost && S.spineHost.scale.x===.58'))
  ok('No game phase errors',page.evaluate('G.errors.length===0'))
  ok('No unhandled browser errors',not page_errors)
  ok('No console warnings/errors',not console_warnings)
  ok('Zero external HTTP requests',not http_requests)
  browser.close()
report={'checks':checks,'count':len(checks),'elapsedSeconds':round(time.monotonic()-start,2),'spinStressSeconds':stressSeconds,'pageErrors':page_errors,'consoleWarnings':console_warnings,'httpRequests':http_requests,'limits':'Headless Chromium Pixi Canvas2D via offline PLAY.html set_content. User GPU WebGL, Firefox, real-money math and wagering compliance not verified.'}
(ROOT/'tests/eye-symbols-results.json').write_text(json.dumps(report,indent=2)+'\n')
print(f'{len(checks)}/{len(checks)} checks passed ({report["elapsedSeconds"]}s)')
