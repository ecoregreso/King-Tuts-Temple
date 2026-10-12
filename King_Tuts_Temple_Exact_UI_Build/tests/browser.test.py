# Optional developer regression suite. Requires Playwright and Chromium.
from pathlib import Path
import json,time
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'PLAY.html').read_text().replace('<head>','<head><script>window.__KEMET_TEST__=true;</script>',1)
checks=[];errors=[];warnings=[];network=[]
def ok(name,evidence=True):
 assert evidence,name
 checks.append({'test':name,'pass':True,'evidence':evidence});print(time.strftime('%H:%M:%S'),'PASS',name,flush=True); (ROOT/'tests/browser-results-progress.json').write_text(json.dumps(checks,indent=2))
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=__import__('os').environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1100,'height':619},device_scale_factor=1)
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda m:warnings.append(m.text) if m.type in ['error','warning'] else None)
 page.on('request',lambda r:network.append(r.url) if r.url.startswith(('https:','http:')) else None)
 page.set_content(HTML,wait_until='load',timeout=40000)
 page.wait_for_function('window.KEMET?.ready',timeout=30000)
 state=lambda:page.evaluate('KEMET.getState()')
 idle=lambda:page.wait_for_function("KEMET.getState().phase==='IDLE'",timeout=20000)
 versions=page.evaluate('({pixi:KEMET.pixi,gsap:KEMET.gsap,renderer:KEMET.renderer})')
 ok('Real Pixi + GSAP application rendered',versions)
 ok('All image elements decoded',page.evaluate("Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0)"))
 ok('One canvas; five reels; 25 pooled views',page.evaluate("document.querySelectorAll('#canvasHost canvas').length===1&&KEMET_TEST.scene.reels.length===5&&KEMET_TEST.scene.reels.every(r=>r.views.length===5)"))
 ok('No HTTP/CDN requests in standalone',not network)
 page.evaluate("""()=>{let i=0;const a=[0,0,0,34,34,34,64,64,64,34,34,34,0,0,0];KEMET_TEST.game.session.rng=n=>n===100?a[(i++)%15]:0;gsap.globalTimeline.timeScale(8);} """)
 before=state()['session'];page.evaluate("()=>{const b=document.getElementById('spinBtn');b.click();b.click();b.click();}");idle();after=state()['session']
 ok('Stop does not double-debit or start another spin',after['spins']==before['spins']+1 and after['balance']==before['balance']-40)
 ok('Reels stop on committed outcome',page.evaluate("JSON.stringify(KEMET_TEST.scene.reels.map(r=>r.ids))===JSON.stringify(KEMET_TEST.game.session.state.lastGrid)"))
 page.click('#levelUp');page.click('#coinUp')
 ok('Bet controls preserve underlying balance',state()['session']['level']==2 and state()['session']['denom']==5 and state()['session']['balance']==after['balance'])
 page.click('#maxBtn');ok('Max bet selects maximum level',state()['session']['level']==10)
 for _ in range(4):page.click('#levelDown')
 page.click('#coinDown');page.click('#infoBtn')
 ok('Paytable opens with five paying symbols',page.locator('#infoDialog').is_visible() and page.locator('#paytable article').count()==5)
 page.locator('#infoDialog [data-close]').first.click()
 page.click('#settingsBtn');page.check('#motionSetting');page.select_option('#qualitySetting','low');page.uncheck('#soundSetting')
 ok('Sound settings update toolbar',page.locator('#soundBtn').get_attribute('aria-pressed')=='false')
 page.locator('#settingsDialog [data-close]').first.click()
 page.click('#turboBtn');ok('Turbo toggle works',page.locator('#turboBtn').get_attribute('aria-pressed')=='true')
 spins=state()['session']['spins'];balance=state()['session']['balance']
 page.click('#autoBtn');page.click('[data-auto="10"]')
 page.wait_for_function(f"KEMET.getState().session.spins==={spins+10}&&KEMET.getState().phase==='IDLE'&&KEMET.getState().auto===0",timeout=20000)
 ok('Autoplay completes exactly ten spins',state()['session']['spins']==spins+10 and state()['session']['balance']==balance-400)
 page.click('#autoBtn');page.click('[data-auto="50"]');page.wait_for_function('KEMET.getState().auto<50');page.click('#autoBtn');idle();stop_spins=state()['session']['spins'];page.wait_for_timeout(700)
 ok('Stop autoplay cancels pending paid spins',state()['session']['spins']==stop_spins and state()['auto']==0)
 saved=state()['session'];page.click('#showcaseBtn');page.wait_for_function("KEMET.getState().phase==='FEATURE_INTRO'",timeout=10000)
 ok('Scarab trigger opens eight free spins',state()['session']['free']['remaining']==8)
 ok('Feature bet controls locked',page.locator('#levelUp').is_disabled() and page.locator('#maxBtn').is_disabled())
 page.click('#enterTemple');page.wait_for_function("KEMET.getState().phase==='FEATURE_SUMMARY'",timeout=35000)
 ok('Full feature reaches summary',page.locator('#featureOutro').is_visible() and '8 FREE SPINS' in page.locator('#summarySpins').inner_text())
 ok('Showcase results isolated from saved session',state()['showcase'] and state()['session']['balance']!=saved['balance'])
 page.click('#leaveTemple');page.wait_for_function("!KEMET.getState().showcase&&KEMET.getState().phase==='IDLE'",timeout=5000)
 ok('Showcase restores original session exactly',state()['session']==saved)
 page.click('#showcaseBtn');page.wait_for_function("KEMET.getState().phase==='FEATURE_INTRO'",timeout=10000);page.click('#exitShowcase')
 page.wait_for_function("!KEMET.getState().showcase&&KEMET.getState().phase==='IDLE'",timeout=5000)
 ok('Early feature exit restores original session',state()['session']==saved)
 page.evaluate("()=>{KEMET_TEST.game.spin({grid:Array.from({length:5},()=>['ankh','ankh','ankh'])});}");idle()
 ok('A winning result draws hit outlines and paylines',page.evaluate('KEMET_TEST.scene.winLayer.children.length>0'))
 loss="[['ankh','ankh','ankh'],['eye','eye','eye'],['necklace','necklace','necklace'],['eye','eye','eye'],['ankh','ankh','ankh']]"
 page.evaluate('()=>{KEMET_TEST.game.spin({grid:'+loss+'});}');idle()
 ok('Win graphics cleaned on next spin',page.evaluate('KEMET_TEST.scene.winLayer.children.length===0'))
 stress_start=state()['session']['spins'];t=time.monotonic()
 page.evaluate('async()=>{const grid='+loss+';for(let i=0;i<100;i++)await KEMET_TEST.game.spin({grid});}')
 ok('100 consecutive rendered spins without stalls',state()['session']['spins']==stress_start+100 and state()['phase']=='IDLE')
 ok('Reel view count remains fixed',page.evaluate('KEMET_TEST.scene.reels.every(r=>r.node.children.length===5&&r.views.length===5)'))
 ok('Particle pool bounded at 300 sprites',state()['particles']+state()['pooled']<=300)
 stress_seconds=round(time.monotonic()-t,2)
 for w,h in [(390,844),(844,390),(1280,720),(1920,1080)]:
  page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(150);b=page.locator('#spinBtn').bounding_box()
  ok(f'Spin control inside {w}x{h} viewport',bool(b and b['x']>=0 and b['y']>=0 and b['x']+b['width']<=w+1 and b['y']+b['height']<=h+1))
 page.set_viewport_size({'width':1100,'height':619});page.click('#settingsBtn');pre_reset=state()['session'];page.click('#resetBtn')
 ok('Reset requires second confirmation',state()['session']==pre_reset)
 page.click('#resetBtn');ok('Confirmed reset restores fresh demo',state()['session']['balance']==500000 and state()['session']['spins']==0)
 # Restore test with a deliberately injected in-memory local-storage adapter.
 resume=browser.new_page(viewport={'width':1100,'height':619})
 saved_resume={'version':1,'balance':550000,'level':3,'denom':5,'spins':2,'free':{'remaining':7,'played':1,'awarded':8,'level':3,'denom':5,'win':200},'lastGrid':[['ankh','eye','necklace'],['eye','anubis','ankh'],['necklace','wild','eye'],['ankh','necklace','scatter'],['scatter','eye','ankh']]}
 store_code='Object.defineProperty(window,"localStorage",{value:{getItem:k=>k==="kemet.royal.session.v1"?'+json.dumps(json.dumps(saved_resume))+':null,setItem:()=>{}}});'
 # Capture the short RESUMING window in-page instead of racing it via IPC.
 # Stop only test-page automatic scheduling so the restored snapshot is stable.
 resume_probe="""let readyValue;Object.defineProperty(window,'KEMET',{configurable:true,get:()=>readyValue,set:v=>{readyValue=v;queueMicrotask(()=>{const btn=document.getElementById('spinBtn');window.__resumeProbe={phase:v.getState().phase,disabled:btn.disabled};btn.click();__resumeProbe.spins=v.getState().session.spins;KEMET_TEST.game.schedule=()=>{};});}});"""
 resume_html=HTML.replace('<head>','<head><script>'+store_code+resume_probe+'</script>',1)
 resume.on('pageerror',lambda e:errors.append(str(e)))
 resume.set_content(resume_html,wait_until='load',timeout=40000);resume.wait_for_function('window.KEMET?.ready',timeout=30000)
 ok('Resuming a saved feature temporarily locks spin input',resume.evaluate('__resumeProbe.phase==="RESUMING"&&__resumeProbe.disabled'))
 ok('Resume cannot charge or start an extra spin',resume.evaluate('__resumeProbe.spins')==2)
 resume.wait_for_function('KEMET.getState().phase==="IDLE"',timeout=5000);resume.evaluate('KEMET_TEST.game.clearNext()')
 ok('Saved feature restores exact locked bet and balance',resume.evaluate('KEMET.getState().session')==saved_resume)
 resume.close()
 ok('No page errors',not errors);ok('No console errors or warnings',not warnings);ok('Zero HTTP requests throughout tests',not network)
 report={'versions':versions,'checks':checks,'stress_seconds':stress_seconds,'page_errors':errors,'console_warnings':warnings,'http_requests':network,'limits':'Headless Chromium, actual Pixi Canvas2D renderer. WebGL, Firefox and user hardware not tested. Embedded HTML exercised via set_content because this execution environment blocks file/HTTP browser navigation.'}
 (ROOT/'tests/browser-results.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2),flush=True)
 browser.close()
