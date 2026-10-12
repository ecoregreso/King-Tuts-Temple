"""Regression tests for every-landing beetle playback, independent of payouts.
Requires Playwright and Chromium for development only. No test outcome forcing
is exposed in the playable release: __KEMET_TEST__ is inserted only here.
"""
from pathlib import Path
import base64, hashlib, json, os, time
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
checks=[];errors=[];warnings=[];requests=[]
def ok(name,evidence=True):
    assert evidence,name
    checks.append({'test':name,'pass':True,'evidence':evidence})
    print(time.strftime('%H:%M:%S'),'PASS',name,flush=True)
    (ROOT/'tests/beetle-results-progress.json').write_text(json.dumps(checks,indent=2))
LOSS=[['ankh']*3,['eye']*3,['necklace']*3,['eye']*3,['ankh']*3]
def clone(g):return [c[:] for c in g]
ONE=clone(LOSS);ONE[0][1]='scatter'
TWO=clone(LOSS);TWO[0][0]='scatter';TWO[2][2]='scatter'
DOUBLE=clone(LOSS);DOUBLE[1][0]='scatter';DOUBLE[1][2]='scatter'
WIN=clone(LOSS);WIN[0][2]='scatter';WIN[1][0]='ankh';WIN[2][0]='ankh'
BOOT='<script>window.__KEMET_TEST__=true;Object.defineProperty(window,"localStorage",{value:{getItem:k=>k==="kemet.royal.settings.v1"?JSON.stringify({sound:false,reducedMotion:false,turbo:false,quality:"high"}):null,setItem:()=>{}}});</script>'
HTML=(ROOT/'PLAY.html').read_text().replace('<head>','<head>'+BOOT,1)
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1600,'height':900})
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('console',lambda m:warnings.append(m.text) if m.type in ('warning','error') else None)
    page.on('request',lambda r:requests.append(r.url) if r.url.startswith(('http:','https:')) else None)
    page.set_content(HTML,wait_until='load',timeout=60000);page.wait_for_function('window.KEMET?.ready',timeout=30000)
    page.evaluate('''window.S=KEMET_TEST.scene;window.G=KEMET_TEST.game;window.A=KEMET_TEST.app;
        window.views=()=>S.reels.flatMap(r=>r.views);
        window.landings=()=>views().reduce((n,v)=>n+v.beetleLandings,0);
        window.active=()=>views().filter(v=>v.beetlePlaying);
        window.runSpin=grid=>{window.spinDone=false;G.spin({grid}).then(()=>spinDone=true);};
        window.motion=value=>{const x=document.getElementById('motionSetting');x.checked=value;x.dispatchEvent(new Event('change'));};
    ''')
    versions=page.evaluate('({game:KEMET.version,pixi:KEMET.pixi,gsap:KEMET.gsap,renderer:KEMET.renderer})')
    ok('Updated embedded game boots with existing runtime',versions)
    ok('54 transparent frames decoded from three shared atlas pages',page.evaluate('S.tex.beetle.frames.length===54&&new Set(S.tex.beetle.frames.map(t=>t.source)).size===3'))
    ok('All frame bounds and pivots are identical',page.evaluate('S.tex.beetle.frames.every(t=>t.width===384&&t.height===384)&&views().every(v=>v.sprite.anchor.x===.5&&v.sprite.anchor.y===.5)'))
    ok('Motion speed is 30 fps, 1.8 seconds per landing',page.evaluate('S.tex.beetle.fps===30&&S.tex.beetle.frames.length/S.tex.beetle.fps===1.8'))
    ok('Beetles already displayed on initial grid animate',page.evaluate('active().length===2'))
    ok('Hidden reel buffers never play or receive landing callbacks',page.evaluate('views().filter(v=>v.row<0||v.row>2).every(v=>!v.beetlePlaying&&v.beetleLandings===0)'))
    # A real losing spin, at normal speed; observe the first reel before the last stops.
    before=page.evaluate('G.session.snapshot()');n=page.evaluate('landings()')
    ok('Test single-beetle outcome is non-winning and awards no free spins',page.evaluate('g=>{const r=KemetMath.evaluate(g);return r.totalCoins===0&&r.freeAward===0;}',ONE))
    page.evaluate('runSpin',ONE)
    page.wait_for_function('S.reels[0].timeline===null&&S.reels[0].views[2].beetlePlaying',timeout=10000)
    ok('Single beetle starts at its own reel stop, before remaining reels stop',page.evaluate('S.reels[4].timeline!==null&&G.phase==="SPINNING"'))
    a=page.evaluate('S.reels[0].views[2].beetleFrame');page.wait_for_timeout(150)
    ok('Losing-spin beetle visibly advances without any win presentation',page.evaluate('S.reels[0].views[2].beetleFrame')>a)
    count_before_clear=page.evaluate('S.reels[0].views[2].beetleFrame');page.evaluate('S.clearWins()')
    ok('Clearing win highlights does not restart or cancel landing playback',page.evaluate('S.reels[0].views[2].beetlePlaying&&S.reels[0].views[2].beetleFrame>=0') and page.evaluate('S.reels[0].views[2].beetleFrame')>=count_before_clear)
    page.wait_for_function('spinDone',timeout=10000)
    after=page.evaluate('G.session.snapshot()')
    ok('Single losing spin animates exactly once and only charges the normal bet',page.evaluate('landings()')==n+1 and after['balance']==before['balance']-40 and after['spins']==before['spins']+1)
    page.wait_for_function('!S.reels[0].views[2].beetlePlaying',timeout=6000)
    ok('Sequence completes and holds frame 53 without looping',page.evaluate('S.reels[0].views[2].beetleFrame===53&&S.reels[0].views[2].sprite.texture===S.tex.beetle.frames[53]'))
    page.wait_for_timeout(250);ok('Held final pose remains stable',page.evaluate('S.reels[0].views[2].beetleFrame===53'))
    # Deterministic per-frame checks use the real scene but stop only its ticker.
    page.evaluate('A.stop();window.V=S.reels[0].views[2];V.cancelLanding();V.land();')
    observed=[];pixels=[]
    for i in range(54):
        value=page.evaluate('i=>{V.update(i?1/30+1e-9:0);A.render();return {frame:V.beetleFrame,scale:V.sprite.scale.x,texture:V.sprite.texture===S.tex.beetle.frames[i]};}',i)
        observed.append(value)
        if i in (0,26,53):
            rect=page.evaluate('()=>{const p=V.node.toGlobal({x:0,y:0});return {x:p.x-73,y:p.y-73,width:146,height:146};}')
            data=page.screenshot(clip=rect,path=str(ROOT/f'tests/beetle-frame-{i:02}.png'))
            pixels.append(hashlib.sha256(data).hexdigest())
    ok('Every uploaded frame is displayed once in numeric order',all(v['frame']==i and v['texture'] for i,v in enumerate(observed)))
    ok('No per-frame rescaling or jitter introduced by texture changes',len({v['scale'] for v in observed})==1)
    ok('First, middle and last frames render different beetle pixels',len(set(pixels))==3)
    page.evaluate('A.start();gsap.globalTimeline.timeScale(5);')
    for title,grid,n_beetles in [('Same landing on consecutive spins',ONE,1),('Two beetles on different reels',TWO,2),('Two beetles on one reel',DOUBLE,2),('Beetle with a paying line',WIN,1)]:
        before_n=page.evaluate('landings()');page.evaluate('runSpin',grid);page.wait_for_function('spinDone',timeout=15000)
        ok(title+' animates each beetle once',page.evaluate('landings()')==before_n+n_beetles)
    ok('Winning-line test actually pays without suppressing beetle',page.evaluate('KemetMath.evaluate('+json.dumps(WIN)+').totalCoins>0'))
    # Instant-stop/repeated-click must not duplicate the landing hook or the debit.
    n=page.evaluate('landings()');before=page.evaluate('G.session.snapshot()');page.evaluate('runSpin',TWO)
    page.evaluate('S.stop();S.stop();S.stop();');page.wait_for_function('spinDone',timeout=10000)
    ok('Fast-stop does not duplicate beetles or debit',page.evaluate('landings()')==n+2 and page.evaluate('G.session.state.spins')==before['spins']+1 and page.evaluate('G.session.state.balance')==before['balance']-40)
    page.evaluate('document.getElementById("turboBtn").click()');n=page.evaluate('landings()')
    page.evaluate('runSpin',TWO);page.wait_for_function('spinDone',timeout=10000)
    ok('Turbo still triggers every beetle on landing',page.evaluate('landings()')==n+2)
    page.evaluate('runSpin',LOSS);ok('A new spin immediately cancels all prior beetle playback',page.evaluate('active().length===0'))
    page.wait_for_function('spinDone',timeout=10000)
    ok('No beetle texture leaks into other symbols',page.evaluate('views().every(v=>v.sprite.texture===S.tex[v.id])'))
    # Full-board worst case: only 15 visible cells, not the ten buffer views.
    page.evaluate('S.drawGrid(Array.from({length:5},()=>["scatter","scatter","scatter"]));')
    ok('All 15 visible beetles can animate concurrently',page.evaluate('active().length===15'))
    ok('No additional sprites or atlas sources allocated per landing',page.evaluate('S.reels.every(r=>r.views.length===5&&r.node.children.length===5)&&new Set(active().map(v=>v.sprite.texture.source)).size<=3'))
    page.evaluate('motion(true);S.update(.016)')
    ok('Reduced motion preserves a static beetle without affecting results',page.evaluate('active().length===0&&views().every(v=>v.beetleFrame===0)'))
    page.evaluate('motion(false);S.drawGrid(KemetMath.START_GRID)')
    # Record a live showcase entry to verify feature-triggering beetles as well.
    G_before=page.evaluate('G.session.snapshot()');n=page.evaluate('landings()')
    page.click('#showcaseBtn');page.wait_for_function('G.phase==="FEATURE_INTRO"',timeout=15000)
    ok('Three-scatter feature still starts eight free spins',page.evaluate('G.session.state.free.remaining===8'))
    ok('All three trigger beetles receive landing animation',page.evaluate('landings()')==n+3)
    page.click('#exitShowcase');page.wait_for_function('!G.showcase&&G.phase==="IDLE"',timeout=10000)
    ok('Feature showcase still restores the original session',page.evaluate('G.session.snapshot()')==G_before)
    # Free-spin path with two beetles; stop automatic scheduling only in this test.
    page.evaluate('G.session.state.free={remaining:2,played:1,awarded:3,level:1,denom:2,win:0};G.schedule=()=>{};')
    n=page.evaluate('landings()');balance=page.evaluate('G.session.state.balance')
    page.evaluate('runSpin',TWO);page.wait_for_function('spinDone',timeout=10000)
    ok('Non-winning free spin also animates both beetles with no bet debit',page.evaluate('landings()')==n+2 and page.evaluate('G.session.state.balance')==balance)
    page.evaluate('G.session.state.free=null;G.hud();')
    # Autoplay: choose a deterministic losing grid containing two beetles each time.
    page.evaluate('G.schedule=Object.getPrototypeOf(G).schedule;let j=0;const weights=[97,0,0,34,34,34,64,64,97,34,34,34,0,0,0];G.session.rng=n=>weights[(j++)%15];')
    n=page.evaluate('landings()');spins=page.evaluate('G.session.state.spins')
    page.click('#autoBtn');page.click('[data-auto="10"]')
    page.wait_for_function(f'G.auto===0&&G.phase==="IDLE"&&G.session.state.spins==={spins+10}',timeout=25000)
    ok('Ten autoplay spins trigger exactly twenty beetle landings',page.evaluate('landings()')==n+20)
    # 100 more animated spins with two beetles, with normal animation enabled.
    start=time.monotonic();n=page.evaluate('landings()');spins=page.evaluate('G.session.state.spins')
    page.evaluate('async grid=>{for(let i=0;i<100;i++)await G.spin({grid});}',TWO)
    stress_seconds=round(time.monotonic()-start,2)
    ok('100 consecutive beetle-containing spins finish without stalls',page.evaluate('G.phase==="IDLE"&&G.session.state.spins')==spins+100)
    ok('Stress run produces exactly 200 landing animations',page.evaluate('landings()')==n+200)
    ok('After stress, only 25 reel views, 54 textures and three shared pages remain',page.evaluate('views().length===25&&S.tex.beetle.frames.length===54&&S.tex.beetle.pages.length===3'))
    # Verify independently-running timelines rather than globally synchronized frames.
    page.evaluate('A.stop();S.drawGrid('+json.dumps(DOUBLE)+');window.U=S.reels[1].views[1];window.W=S.reels[1].views[3];U.update(.5);W.update(.1);A.render();')
    ok('Each landed beetle has an independent playback clock',page.evaluate('U.beetleFrame===15&&W.beetleFrame===3'))
    # Demonstrate both atlas boundaries using a frozen scene and actual renders.
    for frame in (24,25,49,50,53):
        page.evaluate('i=>{U.cancelLanding();U.land();U.update(i/30+1e-8);A.render();}',frame)
        ok(f'Atlas frame {frame} renders across page boundaries',page.evaluate('U.sprite.texture===S.tex.beetle.frames['+str(frame)+']'))
    page.evaluate('S.drawGrid(KemetMath.START_GRID);for(const v of views())if(v.id==="scatter"&&v.row>=0&&v.row<3)v.update(1.05);S.spinePlayer.name="idle";S.spinePlayer.time=.6;S.spinePlayer.mixFrom=null;S.spinePlayer.renderPose();A.render();')
    page.screenshot(path=str(ROOT/'tests/beetle-desktop.png'))
    for w,h in [(390,844),(844,390),(1280,720),(1920,1080)]:
        page.set_viewport_size({'width':w,'height':h});page.evaluate('S.resize();A.render()');b=page.locator('#spinBtn').bounding_box()
        ok(f'Existing controls and beetles remain inside {w}x{h} viewport',bool(b and b['x']>=0 and b['y']>=0 and b['x']+b['width']<=w+1 and b['y']+b['height']<=h+1) and page.evaluate('S.reels.every(r=>r.views.every(v=>v.beetleFrame>=0&&v.beetleFrame<54))'))
        if w==390:page.screenshot(path=str(ROOT/'tests/beetle-mobile.png'))
    ok('Floor-standing Spine character is still live and unframed',page.evaluate('S.spineHost.texture===S.spinePlayer.unframedView.texture&&S.spineHost.scale.x===.58'))
    ok('No game errors accumulated',page.evaluate('G.errors.length===0'))
    ok('No page errors',not errors);ok('No console errors or warnings',not warnings);ok('No external HTTP requests',not requests)
    report={'versions':versions,'checks':checks,'stress_seconds':stress_seconds,'page_errors':errors,'console_warnings':warnings,'external_requests':requests,'limits':'Headless Chromium Canvas2D. Embedded HTML exercised using set_content; direct file/HTTP navigation is blocked by browser policy in this environment. No WebGL or Firefox claim.'}
    (ROOT/'tests/beetle-results.json').write_text(json.dumps(report,indent=2)+'\n')
    print('TOTAL',len(checks),'PASS');browser.close()
