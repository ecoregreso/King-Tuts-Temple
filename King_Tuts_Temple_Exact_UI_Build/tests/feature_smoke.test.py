#!/usr/bin/env python3
"""Separate end-to-end free-spins check (kept isolated from animation stress)."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,os,time
ROOT=Path(__file__).resolve().parents[1]
html=(ROOT/'PLAY.html').read_text().replace('<head>','<head><script>window.__KEMET_TEST__=true;Object.defineProperty(window,"localStorage",{value:{getItem:()=>null,setItem:()=>{}}});</script>',1)
TRIGGER=[['bonus','pharaoh','lotus'],['mummy','eye','eye'],['scatter','royal_ankh','cobra'],['cleopatra','eye_blue','scarab_blue'],['bonus','anubis_tile','necklace']]
checks=[];errors=[];warnings=[];net=[]
def ok(name,result):
 if not result:raise AssertionError(name)
 checks.append(name);print(f'PASS {name}',flush=True)
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=browser.new_page(viewport={'width':1600,'height':900})
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda m:warnings.append(m.text) if m.type in ('warning','error') else None)
 page.on('request',lambda r:net.append(r.url) if r.url.startswith(('http:','https:')) else None)
 page.set_content(html,wait_until='load',timeout=90000)
 page.wait_for_function('window.KEMET?.ready',timeout=30000)
 page.evaluate('''()=>{window.S=KEMET_TEST.scene;window.G=KEMET_TEST.game;gsap.globalTimeline.timeScale(8);window.expandedCalls=0;const old=S.expandGuardians.bind(S);S.expandGuardians=async function(cols){window.expandedCalls+=cols.length;return old(cols);};}''')
 ok('Game boots offline with all new symbols',page.evaluate('KemetMath.SYMBOLS.length===17&&KEMET.ready'))
 ok('Mixed emerald scarab / BONUS reel pays and awards free spins',page.evaluate('g=>KemetMath.evaluate(g).freeAward===8',TRIGGER))
 page.evaluate('''g=>{G.spin({grid:g});}''',TRIGGER)
 page.wait_for_function('G.phase==="FEATURE_INTRO"',timeout=25000)
 ok('Temple entrance opens with the new BONUS icon',page.evaluate('!document.getElementById("featureIntro").hidden && G.session.state.free.remaining===8 && document.querySelector(".scarab-row img[data-asset*=bonus]")!==null'))
 page.screenshot(path=str(ROOT/'tests/eye-symbols-feature.png'))
 page.evaluate('document.getElementById("enterTemple").click()')
 page.wait_for_function('G.phase==="FEATURE_SUMMARY"',timeout=45000)
 ok('All eight feature spins reach the summary',page.evaluate('G.session.state.free===null && document.getElementById("summarySpins").textContent.includes("8 FREE SPINS")'))
 ok('Anubis skeletal guardian expansion still works in bonus feature',page.evaluate('expandedCalls>0 && !!S.spinePlayer'))
 page.evaluate('document.getElementById("leaveTemple").click()')
 page.wait_for_function('G.phase==="IDLE"&&!S.isTemple',timeout=10000)
 ok('Game returns from temple with unlocked normal controls',page.evaluate('!document.getElementById("spinBtn").disabled && !G.session.state.free'))
 ok('No JavaScript/game errors in feature',not errors and page.evaluate('G.errors.length===0'))
 ok('No console warnings or external HTTP requests',not warnings and not net)
 browser.close()
report={'checks':checks,'count':len(checks),'errors':errors,'warnings':warnings,'network':net,'backend':'headless Chromium Canvas2D, embedded game offline'}
(ROOT/'tests/feature-smoke-results.json').write_text(json.dumps(report,indent=2)+'\n')
print(f'{len(checks)}/{len(checks)} feature checks passed')
