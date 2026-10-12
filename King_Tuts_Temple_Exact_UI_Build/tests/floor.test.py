"""Verify full-body presentation without changing the framed reel presentation.
Optional: --baseline PATH points to the previous Spine Edition source folder.
Requires Python Playwright and Chromium, only for development/testing.
"""
from pathlib import Path
import argparse, base64, hashlib, json, os
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
args=argparse.ArgumentParser();args.add_argument('--baseline',type=Path);args=args.parse_args()
checks=[];errors=[];warnings=[];network=[]
def ok(name,value=True):
    assert value,name
    checks.append({'test':name,'pass':True,'evidence':value});print('PASS',name,flush=True)
def load(browser,root):
    page=browser.new_page(viewport={'width':1600,'height':900})
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('console',lambda m:warnings.append(m.text) if m.type in ('error','warning') else None)
    page.on('request',lambda r:network.append(r.url) if r.url.startswith(('http:','https:')) else None)
    html=(root/'PLAY.html').read_text().replace('<head>','<head><script>window.__KEMET_TEST__=true;</script>',1)
    page.set_content(html,wait_until='load',timeout=60000);page.wait_for_function('window.KEMET?.ready',timeout=30000)
    page.evaluate('window.S=KEMET_TEST.scene;window.P=S.spinePlayer;window.A=KEMET_TEST.app;window.G=KEMET_TEST.game;A.stop();P.mixFrom=null;')
    return page
def framed_hashes(page):
    out={}
    for name,time in [('idle',0),('idle',.5),('idle',1),('idle',1.9),('action',0),('action',.5),('action',.9),('action',1.3)]:
        value=page.evaluate('([name,time])=>{P.name=name;P.time=time;P.mixFrom=null;P.renderPose();return P.canvas.toDataURL()}',[name,time])
        out[f'{name}:{time}']=hashlib.sha256(base64.b64decode(value.split(',')[1])).hexdigest()
    return out
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    baseline=None
    if args.baseline:
        page=load(browser,args.baseline);baseline=framed_hashes(page);page.close()
    page=load(browser,ROOT)
    ok('Beetle update preserves floor-character boot',page.evaluate('KEMET.version==="royal-1.1.2-beetle-landings"'))
    hashes=framed_hashes(page)
    if baseline:
        ok('Eight framed reel/guardian poses are pixel-identical to previous build',hashes==baseline)
    ok('Outside host uses a separate unframed texture of the same skeleton',page.evaluate('S.spineHost.texture===P.unframedView.texture&&S.spineHost.texture!==P.texture'))
    ok('Reel symbols retain the original framed texture source',page.evaluate('S.tex.anubis.source===P.texture.source'))
    ok('Only outside presentation disables frame and portrait clipping',page.evaluate('P.decorations===true&&P.unframedView.decorations===false&&P.unframedView.clipping===false'))
    drawn=page.evaluate('''()=>{let framed=[],outside=[],old=P.drawAttachment;P.drawAttachment=function(a,v,ctx){(ctx===P.ctx?framed:outside).push(a.name);return old.call(this,a,v,ctx);};P.name='idle';P.time=0;P.renderPose();P.drawAttachment=old;return {framed,outside};}''')
    ok('Portrait backgrounds and frame attachments absent from outside draw',not any('_frame' in n or n.endswith(('_bg','_bg2','overall_shadow')) for n in drawn['outside']))
    ok('Original portrait backgrounds/frame still drawn for the reels',any('_frame' in n for n in drawn['framed']) and any(n.endswith('_bg') for n in drawn['framed']))
    ok('Body, skirt, armor, eyes and flame still rendered',all(any(term in n for n in drawn['outside']) for term in ['body','skirt','pauldron','head','fire']))
    bounds=page.evaluate('''()=>{let all={x:Infinity,y:Infinity,right:-Infinity,top:-Infinity},outside=P.unframedView.bounds;for(const [name,anim] of P.data.animations)for(let i=0;i<=60;i++){P.skeleton.apply(P.data.sample(name,i*anim.duration/60));for(const slot of P.data.slots){if(/(^character_symbol_anubis_(?:bg2?|shadow)$|_frame|overall_shadow|^light$|^coin_light)/.test(slot.name))continue;const a=P.data.attachments.get(slot.name+'\\0'+P.skeleton.pose.names[slot.index]);if(!a||a.type==='clipping'||P.skeleton.pose.colors[slot.index][3]*a.color[3]<.01)continue;const v=P.skeleton.vertices(a,slot);for(let j=0;j<v.length;j+=2){all.x=Math.min(all.x,v[j]);all.y=Math.min(all.y,v[j+1]);all.right=Math.max(all.right,v[j]);all.top=Math.max(all.top,v[j+1]);}}}return {all,canvas:outside,inside:all.x>outside.x&&all.right<outside.x+outside.width&&all.y>outside.y&&all.top<outside.y+outside.height};}''')
    ok('Full-body geometry fits fixed canvas across 122 sampled idle/action poses',bounds['inside'])
    page.evaluate('P.name="idle";P.time=0;P.mixFrom=null;P.renderPose();A.render()')
    body=page.evaluate('''()=>{const c=P.unframedView.canvas,d=P.unframedView.ctx.getImageData(0,0,c.width,c.height).data;let top=c.height,bottom=0,lower=0;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(d[(y*c.width+x)*4+3]>20){top=Math.min(top,y);bottom=Math.max(bottom,y);if(y>980)lower++;}return {height:(bottom-top)*S.spineHost.scale.y,lower};}''')
    ok('Outside figure is over 600 design pixels tall with visible lower legs/feet',body['height']>600 and body['lower']>5000)
    before=page.evaluate('G.session.snapshot()');actions=page.evaluate('P.actionCount')
    target=page.evaluate('S.spineHost.toGlobal({x:0,y:0})');page.mouse.click(target['x'],target['y'])
    ok('Clicking the enlarged host plays action without changing credits',page.evaluate('P.actionCount')==actions+1 and page.evaluate('G.session.snapshot()')==before)
    page.evaluate('P.mixFrom=null;P.name="idle";P.time=.6;P.renderPose();A.render()')
    p0=page.evaluate('P.unframedView.canvas.toDataURL()')
    page.evaluate('P.name="action";P.time=.9;P.renderPose();A.render()')
    ok('Full-body action produces different pixels while host scale is fixed',p0!=page.evaluate('P.unframedView.canvas.toDataURL()') and page.evaluate('S.spineHost.scale.x===.58&&S.spineHost.scale.y===.58'))
    page.evaluate('P.name="idle";P.time=0;P.mixFrom=null;P.renderPose();A.render()')
    page.screenshot(path=str(ROOT/'tests/floor-desktop.png'))
    for w,h in [(1280,720),(1600,900),(1920,1080),(1280,800),(2560,1080),(844,390)]:
        page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(100);page.evaluate('S.resize();A.render()')
        data=page.evaluate('''()=>{const foot=S.root.toGlobal({x:S.spineHost.x,y:S.spineHost.y+664.5*S.spineHost.scale.y});const hostRight=S.spineHost.getBounds().maxX;const reelLeft=S.viewport.toGlobal({x:0,y:0}).x;const hud=document.getElementById('spinBtn').getBoundingClientRect();return {floor:Math.abs(foot.y-S.hostGround.screenY)<.01&&Math.abs(S.hostShadow.y-S.hostGround.y)<.01,clear:hostRight<reelLeft,control:hud.left>=0&&hud.right<=innerWidth+1&&hud.bottom<=innerHeight+1};}''')
        ok(f'Feet/shadow follow background floor; reels and controls clear at {w}x{h}',all(data.values()))
        if w==2560:page.screenshot(path=str(ROOT/'tests/floor-ultrawide.png'))
    page.set_viewport_size({'width':390,'height':844});page.evaluate('S.resize();P.update(.05,{unframedVisible:false});window.savedOutsideFrames=P.unframedView.frames;for(let i=0;i<4;i++)P.update(.05,{unframedVisible:false});A.render()')
    ok('Mobile retains existing layout and skips outside character rasterization',page.evaluate('S.mobile&&!S.hostLayer.visible&&P.unframedView.frames===savedOutsideFrames'))
    page.screenshot(path=str(ROOT/'tests/floor-mobile.png'))
    page.set_viewport_size({'width':1600,'height':900});page.evaluate('S.resize();P.update(.05,{unframedVisible:true});gsap.globalTimeline.timeScale(8)')
    page.evaluate('async()=>{await S.setTemple(true);await S.expandGuardians([1,3]);P.name="idle";P.time=0;P.mixFrom=null;P.renderPose();A.render()}')
    ok('Expanded reel guardians still use framed source',page.evaluate('S.guardians.every(n=>n.children.some(s=>s.texture===P.texture))'))
    ok('Free-spin badge is placed to the right, away from full-height host',page.evaluate('document.getElementById("featureBadge").getBoundingClientRect().left>1300'))
    page.screenshot(path=str(ROOT/'tests/floor-temple.png'))
    uid=page.evaluate('P.unframedView.texture.uid')
    page.evaluate('async()=>{S.clearGuardians();await S.setTemple(false);P.name="idle";P.time=0;P.mixFrom=null;P.renderPose();A.render()}')
    ok('Temple round trip retains one outside texture and host view',page.evaluate('P.unframedView.texture.uid')==uid and page.evaluate('P.sprites.size===1'))
    ok('No new onscreen renderer or canvas',page.evaluate('document.querySelectorAll("#canvasHost canvas").length===1'))
    ok('No page errors, console warnings or external requests',not errors and not warnings and not network)
    report={'build':page.evaluate('KEMET.version'),'renderer':page.evaluate('KEMET.renderer'),'checks':checks,'passed':len(checks),'framed_baseline_compared':bool(baseline),'framed_pose_sha256':hashes,'sampled_geometry':bounds,'page_errors':errors,'console_warnings':warnings,'external_requests':network,'scope':'Headless Chromium Canvas2D, embedded HTML exercised using set_content. User GPU/Firefox/Safari unverified.'}
    (ROOT/'tests/floor-results.json').write_text(json.dumps(report,indent=2));print('TOTAL',len(checks),flush=True)
    browser.close()
