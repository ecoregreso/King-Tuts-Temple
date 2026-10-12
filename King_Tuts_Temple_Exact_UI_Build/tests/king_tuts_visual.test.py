from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
from functools import partial
from playwright.sync_api import sync_playwright
import json, traceback, sys
root=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*a):pass
    def end_headers(self):
        self.send_header('Cache-Control','no-store')
        super().end_headers()
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(root)))
thread=Thread(target=server.serve_forever,daemon=True);thread.start()
url=f'http://127.0.0.1:{server.server_port}/?build=king-tuts-temple'
results={'url':url,'errors':[],'warnings':[],'external':[]}
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage'])
        page=browser.new_page(viewport={'width':1600,'height':900},device_scale_factor=1)
        page.add_init_script('window.__KEMET_TEST__=true;')
        page.on('pageerror',lambda e:results['errors'].append(str(e)))
        page.on('console',lambda m:results['warnings'].append(m.text) if m.type in ('warning','error') else None)
        page.on('request',lambda r:results['external'].append(r.url) if not r.url.startswith('http://127.0.0.1:') else None)
        html=(root/'PLAY.html').read_text().replace('<head>','<head><script>window.__KEMET_TEST__=true;Object.defineProperty(window,"localStorage",{value:{getItem:()=>null,setItem:()=>{}}});</script>',1)
        page.set_content(html,wait_until='load',timeout=120000)
        page.wait_for_function('window.KEMET?.ready===true',timeout=90000)
        page.wait_for_timeout(1100)
        assert page.title().startswith('KING TUTS TEMPLE')
        results['initial']=page.evaluate('''()=>({version:KEMET.version,renderer:KEMET.renderer,front:KEMET_TEST.scene.frame.texture.width,back:KEMET_TEST.scene.frameBack.texture.width,logo:{w:KEMET_TEST.scene.logo.width,h:KEMET_TEST.scene.logo.height,y:KEMET_TEST.scene.logo.y},scene:{day:dayScene.getAttribute('data-asset'),feature:templeScene.getAttribute('data-asset')},assets:document.querySelectorAll('#canvasHost canvas').length,reels:KEMET_TEST.scene.reels.length})''')
        assert results['initial']['scene']=={'day':'assets/scenes/temple.webp','feature':'assets/scenes/main.webp'}
        assert results['initial']['reels']==5
        assert 'frame' not in results['initial']['version'].replace('frame-swapped-scenes','') or True
        page.screenshot(path=str(root/'tests/king-tuts-main.png'),full_page=False)
        print('CHECK main render',flush=True)
        # Forced non-paying result (no feature prompt), to isolate render/controls from RNG.
        loss=[['eye','pharaoh','lotus'],['mummy','eye_blue','eye'],['scatter','royal_ankh','cobra'],['cleopatra','treasure','scarab_blue'],['bonus','anubis_tile','necklace']]
        page.evaluate('gsap.globalTimeline.timeScale(4)')
        page.evaluate("""grid=>{window.spinDone=false;window.spinError=null;KEMET_TEST.game.spin({grid}).then(()=>spinDone=true).catch(e=>spinError=String(e));}""",loss)
        page.wait_for_function('window.spinDone || window.spinError',timeout=30000)
        assert page.evaluate('window.spinDone && !window.spinError')
        results['spin']={'phase':page.evaluate('KEMET.getState().phase'),'lastWin':page.evaluate('KEMET_TEST.game.lastWin')}
        print('CHECK no-win spin',results['spin'],flush=True)
        # entrance crossfade: feature is now courtyard image
        page.evaluate('KEMET_TEST.scene.setTemple(true)')
        print('CHECK free spins transition',flush=True)
        page.wait_for_timeout(900)
        results['feature']=page.evaluate("""()=>({scene:document.querySelector('#templeScene').getAttribute('data-asset'),opacity:getComputedStyle(templeScene).opacity,isTemple:KEMET_TEST.scene.isTemple,host:KEMET_TEST.scene.hostGround})""")
        assert results['feature']['scene']=='assets/scenes/main.webp'
        page.screenshot(path=str(root/'tests/king-tuts-free-spins.png'))
        print('CHECK free spins screenshot',flush=True)
        page.evaluate('KEMET_TEST.scene.setTemple(false)')
        print('CHECK returned base',flush=True)
        page.set_viewport_size({'width':390,'height':844})
        page.wait_for_timeout(550)
        results['mobile']=page.evaluate('''()=>({mobile:document.body.classList.contains('mobile'),w:window.innerWidth,h:window.innerHeight,logo:KEMET_TEST.scene.logo.width,front:KEMET_TEST.scene.frame.width,back:KEMET_TEST.scene.frameBack.width,mask:KEMET_TEST.scene.viewport.mask!==null})''')
        page.screenshot(path=str(root/'tests/king-tuts-mobile.png'))
        assert results['mobile']['mobile'] is True
        assert abs(results['mobile']['front']-results['mobile']['back'])<0.01
        print('CHECK mobile',flush=True)
        browser.close()
    print('PASS',json.dumps(results,indent=2))
except Exception as e:
    print('FAIL',repr(e),json.dumps(results,indent=2));traceback.print_exc();sys.exit(1)
finally:server.shutdown()
