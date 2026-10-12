/* King Tuts Temple · Reference UI Edition (reference-matched frame and buttons)
   One Pixi application, one built-in ticker, fixed reel masks, GSAP motion.
   Rendering never chooses or changes the outcome. */
(() => {
'use strict';
const M=window.KemetMath,$=id=>document.getElementById(id);
const asset=path=>window.KEMET_ASSETS?.[path]||path;
const money=n=>Number(n).toLocaleString('en-US',{maximumFractionDigits:2});
const wait=seconds=>new Promise(resolve=>gsap.delayedCall(seconds,resolve));
const SAVE_KEY='kemet.royal.session.v2',SETTINGS_KEY='kemet.royal.settings.v1';
let storage=null;try{storage=window.localStorage;}catch{}
function read(key){try{return JSON.parse(storage?.getItem(key)||'null');}catch{return null;}}
function save(key,value){try{storage?.setItem(key,JSON.stringify(value));}catch{/* Storage is optional for an offline demo. */}}
const settings={sound:true,volume:.45,turbo:false,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,quality:'high'};
const previous=read(SETTINGS_KEY);if(previous){for(const k of ['sound','turbo','reducedMotion'])if(typeof previous[k]==='boolean')settings[k]=previous[k];if(Number.isFinite(previous.volume))settings.volume=Math.max(0,Math.min(1,previous.volume));if(['high','low'].includes(previous.quality))settings.quality=previous.quality;}
function loadImage(path){return new Promise((resolve,reject)=>{const img=new Image();const timer=setTimeout(()=>reject(new Error('Image loading timed out: '+path)),15000);img.onload=()=>{clearTimeout(timer);resolve(img);};img.onerror=()=>{clearTimeout(timer);reject(new Error('Unable to decode '+path));};img.src=asset(path);});}
function texFromCanvas(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);return PIXI.Texture.from(c);}
function fit(sprite,w,h){const s=Math.min(w/sprite.texture.width,h/sprite.texture.height);sprite.scale.set(s);return s;}
function label(text,size,fill=0xffe5a7,weight='normal'){
 const t=new PIXI.Text({text,style:{fontFamily:'Georgia, serif',fontSize:size,fontWeight:weight,fill,dropShadow:{color:0x160b12,alpha:.65,blur:4,distance:2,angle:Math.PI/2}}});t.anchor.set(.5);return t;
}
class Sound{
 constructor(){this.ctx=null;}
 unlock(){if(!settings.sound)return;try{if(!this.ctx)this.ctx=new (window.AudioContext||window.webkitAudioContext)();if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});}catch{}}
 tone(f,d=.12,v=.06,type='sine',delay=0){if(!settings.sound||!this.ctx||this.ctx.state!=='running')return;const c=this.ctx,t=c.currentTime+delay,osc=c.createOscillator(),g=c.createGain();osc.type=type;osc.frequency.setValueAtTime(f,t);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,v*settings.volume),t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+d);osc.connect(g);g.connect(c.destination);osc.start(t);osc.stop(t+d+.03);osc.onended=()=>{osc.disconnect();g.disconnect();};}
 click(){this.unlock();this.tone(660,.055,.035,'triangle');}
 spin(){this.unlock();[130.81,164.81,196].forEach((n,i)=>this.tone(n,.16,.05,'triangle',i*.035));}
 stop(c){this.tone([174.61,196,233.08,261.63,311.13][c],.11,.09,'triangle');this.tone(68,.07,.08);}
 win(){[261.63,329.63,392,523.25].forEach((n,i)=>this.tone(n,.32,.045,'triangle',i*.07));}
 scatter(n){this.tone([392,493.88,659.25,783.99][Math.min(3,n)],.65,.065,'sine');}
 guardian(){this.tone(55,1.0,.12);this.tone(110,.8,.05,'triangle');[392,466.16,622.25].forEach((n,i)=>this.tone(n,.7,.035,'sine',i*.16));}
 temple(){[130.81,138.59,207.65,261.63,415.3].forEach((n,i)=>this.tone(n,1.4,.06,'triangle',i*.14));}
 big(){[196,261.63,329.63,392,523.25,659.25,783.99].forEach((n,i)=>this.tone(n,.7,.065,'triangle',i*.12));}
}
class Particles{
 constructor(parent){this.layer=new PIXI.Container();parent.addChild(this.layer);this.active=[];this.pool=[];
 this.glow=texFromCanvas(64,64,(c)=>{const g=c.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'#fff');g.addColorStop(.16,'#ffffffe8');g.addColorStop(1,'#ffffff00');c.fillStyle=g;c.fillRect(0,0,64,64);});
 this.star=texFromCanvas(40,40,(c)=>{c.fillStyle='#fff';c.beginPath();c.moveTo(20,1);c.lineTo(24,16);c.lineTo(39,20);c.lineTo(24,24);c.lineTo(20,39);c.lineTo(16,24);c.lineTo(1,20);c.lineTo(16,16);c.closePath();c.fill();});
 this.coin=texFromCanvas(64,64,c=>{const g=c.createRadialGradient(22,17,1,30,32,32);g.addColorStop(0,'#fff5b9');g.addColorStop(.5,'#f7c453');g.addColorStop(.8,'#a76a22');g.addColorStop(1,'#ffdf81');c.fillStyle=g;c.beginPath();c.arc(32,32,29,0,Math.PI*2);c.fill();c.strokeStyle='#ffefa5';c.lineWidth=2;c.beginPath();c.arc(32,32,23,0,Math.PI*2);c.stroke();c.strokeStyle='#8b501d';c.lineWidth=3;c.beginPath();c.ellipse(32,22,6,8,0,0,Math.PI*2);c.moveTo(32,30);c.lineTo(32,47);c.moveTo(23,36);c.lineTo(41,36);c.stroke();});
 }
 emit(x,y,count=30,kind='spark',tint=0xffce63,power=1){
  const cap=settings.reducedMotion?50:settings.quality==='low'?120:300;count=settings.reducedMotion?Math.min(count,10):count;
  for(let i=0;i<count&&this.active.length<cap;i++){
   let p=this.pool.pop();if(!p){const sprite=new PIXI.Sprite(this.glow);sprite.anchor.set(.5);this.layer.addChild(sprite);p={sprite};}
   const angle=Math.random()*Math.PI*2,speed=(40+Math.random()*250)*power,coin=kind==='coin';
   Object.assign(p,{x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-(coin?170:55),age:0,life:coin?1.6+Math.random()*1.9:.7+Math.random()*1.2,gravity:coin?230:18,size:coin?.35+Math.random()*.3:.055+Math.random()*.11,rotation:Math.random()*6.28,spin:(Math.random()-.5)*6,kind});
   const s=p.sprite;s.texture=coin?this.coin:(i%4===0?this.star:this.glow);s.blendMode=coin?'normal':'add';s.tint=coin?0xffffff:tint;s.visible=true;s.position.set(x,y);s.scale.set(p.size);s.alpha=1;this.active.push(p);
  }
 }
 update(dt){for(let i=this.active.length-1;i>=0;i--){const p=this.active[i],s=p.sprite;p.age+=dt;if(p.age>=p.life){s.visible=false;this.pool.push(p);this.active[i]=this.active[this.active.length-1];this.active.pop();continue;}p.vy+=p.gravity*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.rotation+=p.spin*dt;s.position.set(p.x,p.y);s.rotation=p.rotation;s.alpha=Math.min(1,(p.life-p.age)*2.5);s.scale.set(p.kind==='coin'?Math.max(.17,Math.abs(Math.cos(p.age*9)))*p.size:p.size,p.size);}}
}
const CELL=160,REELS_W=800,REELS_H=480,REEL_X=140,REEL_Y=265;
class SymbolView{
 constructor(textures){
  this.textures=textures;this.node=new PIXI.Container();
  this.plate=new PIXI.Graphics().roundRect(-68,-68,136,136,15).fill(0x291235).stroke({color:0xd3a858,width:2});this.node.addChild(this.plate);
  this.sprite=new PIXI.Sprite(textures.ankh);this.sprite.anchor.set(.5);this.node.addChild(this.sprite);
  this.caption=label('SCATTER',10,0xffedb7,'bold');this.caption.y=58;this.node.addChild(this.caption);
  this.base=1;this.id='';this.animation=null;this.animationTime=0;this.animationFrame=0;
  this.beetleLandings=0;this.eyeLandings=0;this.beetlePlaying=false;this.eyePlaying=false;this.beetleFrame=0;this.eyeFrame=0;
  this.pulseTime=0;this.pulseActive=false;
 }
 set(id){
  // An animated texture is not a symbol change. Do not reset the clip from the ticker.
  if(this.id===id)return;
  this.cancelLanding();this.id=id;this.sprite.texture=this.textures[id];
  this.base=fit(this.sprite,id==='anubis'?126:140,id==='anubis'?132:140);
  this.plate.visible=id==='anubis'||id==='wild';this.caption.visible=id==='scatter'||id==='bonus';
  this.caption.text=id==='bonus'?'BONUS':'SCATTER';this.sprite.alpha=1;
  this.sprite.position.set(0,0);this.sprite.anchor.set(.5);this.sprite.tint=0xffffff;
 }
 reset(){this.sprite.scale.set(this.base);this.sprite.alpha=1;this.node.alpha=1;}
 cancelLanding(){
  this.animation=null;this.animationTime=0;this.animationFrame=0;
  this.beetlePlaying=false;this.eyePlaying=false;this.beetleFrame=0;this.eyeFrame=0;
  this.pulseActive=false;this.pulseTime=0;this.sprite.tint=0xffffff;
  if(this.id&&this.textures[this.id])this.sprite.texture=this.textures[this.id];
 }
 land(){
  // Trigger on THIS reel's stop, whether or not the evaluated result pays.
  // The hidden row -1 and 3 views must never receive landing calls.
  const kind=this.id==='scatter'?'beetle':this.id==='eye'?'eyeAnimation':null;
  if(kind){
   this.cancelLanding();const anim=this.animation=this.textures[kind];
   if(!anim)throw new Error('Missing landing animation: '+kind);
   this.sprite.texture=anim.frames[0];this.animationTime=0;this.animationFrame=0;
   if(this.id==='scatter'){this.beetleLandings++;this.beetlePlaying=!settings.reducedMotion;}
   else{this.eyeLandings++;this.eyePlaying=!settings.reducedMotion;}
   if(settings.reducedMotion)this.animation=null;
  }else if(this.id==='eye_blue'||this.id==='scarab_blue'){
   // Different supplied artwork: preserve its blue color, add stationary iris/shell light shimmer.
   this.cancelLanding();this.pulseActive=!settings.reducedMotion;
  }
 }
 update(dt){
  if(settings.reducedMotion){
   if(this.animation||this.pulseActive){this.cancelLanding();}
   return;
  }
  if(this.animation){
   const anim=this.animation;this.animationTime+=dt;
   // Ping-pong around the *authored* frames, avoiding the visible last-to-first snap.
   // All frames use identical 384x384 texture bounds and the EXACT SAME sprite transform.
   const last=anim.frames.length-1,period=Math.max(1,last*2);
   const tick=Math.floor(this.animationTime*anim.fps)%period;
   const frame=tick<=last?tick:period-tick;
   if(frame!==this.animationFrame){this.animationFrame=frame;this.sprite.texture=anim.frames[frame];}
   this.beetleFrame=this.id==='scatter'?frame:0;
   this.eyeFrame=this.id==='eye'?frame:0;
   // No stop condition: loop until the next spin calls cancelLanding().
  }
  if(this.pulseActive){
   this.pulseTime+=dt;
   // Color-only shimmer. Never animate position, pivot, scale or reel mask.
   const w=(1+Math.sin(this.pulseTime*3.7))/2;
   const c=Math.round(232+23*w);
   this.sprite.tint=(0xff<<16)|(c<<8)|0xff;
  }
 }
}

class Reel{
 constructor(c,parent,textures,gpu){this.gpu=gpu;this.c=c;this.textures=textures;this.node=new PIXI.Container();this.node.x=c*CELL;parent.addChild(this.node);this.views=[];for(let r=-1;r<=3;r++){const v=new SymbolView(textures);v.row=r;v.node.position.set(CELL/2,r*CELL+CELL/2);this.node.addChild(v.node);this.views.push(v);}this.pos=0;this.strip=[];this.timeline=null;this.blur=null;this.setStatic(M.START_GRID[c]);}
 setStatic(ids){this.ids=[...ids];this.pos=0;for(const v of this.views){v.cancelLanding();v.set(ids[(v.row+3)%3]);v.node.y=v.row*CELL+CELL/2;v.reset();}if(this.blur){this.node.filters=null;this.blur.destroy();this.blur=null;}}
 refresh(){const k=Math.floor(this.pos),fraction=this.pos-k;for(const v of this.views){const idx=((v.row-k)%this.strip.length+this.strip.length)%this.strip.length;v.set(this.strip[idx]);v.node.y=(v.row+fraction)*CELL+CELL/2;}}
 landSymbols(){for(const v of this.views)if(v.row>=0&&v.row<3)v.land();}
 landBeetles(){this.landSymbols();} // compatibility alias
 spin(target,duration,delay,stop,suspense=false){
  for(const v of this.views)v.cancelLanding();
  const steps=20+this.c*5,L=steps+24;this.strip=Array.from({length:L},()=>M.SYMBOLS[Math.floor(Math.random()*M.SYMBOLS.length)].id);for(let r=0;r<3;r++){this.strip[r]=this.ids[r];this.strip[((r-steps)%L+L)%L]=target[r];}
  this.pos=0;
  if(this.gpu&&settings.quality==='high'&&!settings.reducedMotion){this.blur=new PIXI.BlurFilter({strengthX:0,strengthY:0,quality:2});this.node.filters=[this.blur];}
  return new Promise(resolve=>{
   let done=false;const finish=()=>{if(done)return;done=true;this.setStatic(target);this.timeline=null;this.landSymbols();stop(this.c);resolve();};
   const tl=this.timeline=gsap.timeline({delay,onComplete:finish});
   if(this.blur)tl.to(this.blur,{strengthY:5,duration:.18},0);
   tl.to(this,{pos:steps-1.3,duration:Math.max(.18,duration-.32),ease:'power1.inOut',onUpdate:()=>this.refresh()},0);
   if(suspense)tl.to(this,{pos:steps-.65,duration:settings.turbo?.3:.55,ease:'none',onUpdate:()=>this.refresh()});
   tl.to(this,{pos:steps+.085,duration:settings.turbo?.15:.27,ease:'power2.out',onUpdate:()=>this.refresh()});
   if(this.blur)tl.to(this.blur,{strengthY:0,duration:.18},'-=.18');
   tl.to(this,{pos:steps,duration:settings.reducedMotion?.01:.14,ease:'sine.out',onUpdate:()=>this.refresh()});
  });
 }
 stop(){if(this.timeline)this.timeline.progress(1);}
}
class Scene{
 constructor(app,textures,digitMetrics,sound,spineData){
  this.app=app;this.tex=textures;this.metrics=digitMetrics;this.sound=sound;this.root=new PIXI.Container();app.stage.addChild(this.root);this.time=0;this.isTemple=false;this.winTweens=[];this.guardianTweens=[];this.guardians=[];this.stars=[];this.flames=[];this.designW=1600;this.designH=1024;this.mobile=false;
  this.atmosphere=new PIXI.Container();this.root.addChild(this.atmosphere);this.cabinet=new PIXI.Container();this.root.addChild(this.cabinet);
  // REFERENCE-MATCHED CABINET. Exact user-supplied 1536x1024 images are split
  // into registered rails/columns so the old Pixi 5x3 reel viewport never distorts.
  // Back stone panel is a separate, genuine background layer (not a CSS overlay).
  this.frameBack=new PIXI.Sprite(textures.frameBack);
  this.frameBack.position.set(REEL_X-27,REEL_Y-13);
  this.frameBack.width=REELS_W+54;this.frameBack.height=REELS_H+26;
  this.cabinet.addChild(this.frameBack);
  const wellTex=texFromCanvas(1000,620,c=>{const g=c.createLinearGradient(0,0,0,620);g.addColorStop(0,'#181322');g.addColorStop(.5,'#1d1527');g.addColorStop(1,'#100d17');c.fillStyle=g;c.fillRect(0,0,1000,620);});
  this.well=new PIXI.Sprite(wellTex);this.well.position.set(REEL_X-4,REEL_Y-4);this.well.width=REELS_W+8;this.well.height=REELS_H+8;this.well.alpha=.08;this.cabinet.addChild(this.well);
  this.viewport=new PIXI.Container();this.viewport.position.set(REEL_X,REEL_Y);this.cabinet.addChild(this.viewport);
  this.reelsLayer=new PIXI.Container();this.viewport.addChild(this.reelsLayer);
  this.reels=Array.from({length:5},(_,c)=>new Reel(c,this.reelsLayer,textures,!!app.renderer.gl));
  this.guardianLayer=new PIXI.Container();this.viewport.addChild(this.guardianLayer);
  this.winLayer=new PIXI.Container();this.viewport.addChild(this.winLayer);
  const mask=new PIXI.Graphics().roundRect(REEL_X,REEL_Y,REELS_W,REELS_H,12).fill(0xffffff);
  this.cabinet.addChild(mask);this.viewport.mask=mask;
  // Use the exact full front frame-and-title overlay for a tighter sample match.
  this.frame=new PIXI.Container();this.cabinet.addChild(this.frame);
  this.frameExact=new PIXI.Sprite(textures.frameExact);
  this.frameExact.position.set(-66,-10);
  this.frameExact.width=1222;
  this.frameExact.height=865;
  this.frame.addChild(this.frameExact);
  // Title is already part of the exact overlay artwork.
  this.logo=null;
  this.frameSparkLayer=new PIXI.Container();this.cabinet.addChild(this.frameSparkLayer);
  this.hostLayer=new PIXI.Container();this.root.addChild(this.hostLayer);
  this.particles=new Particles(this.root);this.overlayLayer=new PIXI.Container();this.root.addChild(this.overlayLayer);
  this.makeAtmosphere();
  // One evaluated Spine pose drives both the framed reels and freestanding host.
  // Only the host gets an unframed/full-body texture; reel artwork is unchanged.
  this.spinePlayer=new KemetSpine38.Player(spineData);
  // The regular Anubis symbol is a cropped view of the same live skeletal canvas.
  // The original PNG remains in the paytable/source assets, not on the reels.
  this.tex.anubis=new PIXI.Texture({source:this.spinePlayer.texture.source,frame:new PIXI.Rectangle(15,0,425,600)});
  // Soft stationary contact shadow, not a floating platform or portrait plaque.
  const shadowTexture=texFromCanvas(256,64,c=>{c.translate(128,32);c.scale(1,.25);const g=c.createRadialGradient(0,0,0,0,0,128);g.addColorStop(0,'rgba(18,9,5,.65)');g.addColorStop(.45,'rgba(18,9,5,.35)');g.addColorStop(1,'rgba(18,9,5,0)');c.fillStyle=g;c.fillRect(-128,-128,256,256);});
  this.hostShadow=new PIXI.Container();this.hostShadow.eventMode='none';this.hostLayer.addChild(this.hostShadow);
  for(const [x,y,w,h,a]of [[0,-2,245,34,.55],[-73,3,68,13,.85],[58,-10,103,15,.75]]){const shadow=new PIXI.Sprite(shadowTexture);shadow.anchor.set(.5);shadow.position.set(x,y);shadow.width=w;shadow.height=h;shadow.alpha=a;this.hostShadow.addChild(shadow);}
  this.spineHost=this.spinePlayer.sprite({unframed:true});this.spineHost.scale.set(.58);
  this.spineHost.eventMode='static';this.spineHost.cursor='pointer';
  this.spineHost.hitArea=new PIXI.Rectangle(-205,-445,425,1120);
  this.spineHost.on('pointertap',()=>this.spinePlayer.action('host-click'));
  this.hostLayer.addChild(this.spineHost);
  this.drawGrid(M.START_GRID);this.resize();
  app.ticker.add(ticker=>{this.update(Math.min(.05,ticker.deltaMS/1000));});
 }
 resize(){
  const w=innerWidth,h=innerHeight;this.mobile=w/h<.95;document.body.classList.toggle('mobile',this.mobile);
  this.app.renderer.resize(w,h);
  let scale,ox,oy;
  if(this.mobile){this.designW=1100;scale=w/1100;this.designH=h/scale;ox=0;oy=0;this.cabinet.position.set(10,Math.max(250,(this.designH-1380)*.38+205));}
  else{this.designW=1600;this.designH=1024;scale=Math.min(w/1600,h/1024);ox=(w-1600*scale)/2;oy=(h-1024*scale)/2;this.cabinet.position.set(260,0);}
  this.root.scale.set(scale);this.root.position.set(ox,oy);this.worldScale=scale;this.offsetY=oy;this.atmosphere.visible=!this.mobile;this.hostLayer.visible=!this.mobile;this.positionHost();
  // The full-height host occupies the left side; keep feature information right.
  const badge=$('featureBadge');
  if(this.mobile){for(const prop of ['left','top','width','transform','transformOrigin'])badge.style[prop]='';}
  else{badge.style.left=`${ox+1395*scale}px`;badge.style.top=`${oy+210*scale}px`;badge.style.width='180px';badge.style.transform=`scale(${scale})`;badge.style.transformOrigin='top left';}
  if(this.mobile){$('hud').style.top=`${(this.cabinet.y+832)*scale}px`;$('resultBanner').style.top=`${(this.cabinet.y+775)*scale}px`;$('hint').style.top=`${(this.cabinet.y+832)*scale+168}px`;$('worldUI').style.transform='none';}
  else{$('worldUI').style.transform=`translate(${ox}px,${oy}px) scale(${scale})`;$('hud').style.top='841px';$('resultBanner').style.top='793px';$('hint').style.top='1014px';}
  if(this.winOverlay){const o=this.winOverlay;o.bg.clear().rect(0,0,this.designW,this.designH).fill(0x10091c);o.content.position.set(this.designW/2,this.cabinet.y+REEL_Y+REELS_H/2);}
 }
 positionHost(){
  if(this.mobile||!this.spineHost)return;
  // The background is CSS object-fit:cover while Pixi uses a contained stage.
  // Map the photographed floor line to stage coordinates, including letterbox
  // offsets, so the feet do not float on ultrawide or taller desktop windows.
  const image=$(this.isTemple?'templeScene':'dayScene');
  const iw=image?.naturalWidth||1672,ih=image?.naturalHeight||941;
  const cover=Math.max(innerWidth/iw,innerHeight/ih),floorFraction=(this.isTemple?704:778)/900;
  const screenFloor=(innerHeight-ih*cover)/2+ih*cover*floorFraction;
  const floor=(screenFloor-this.offsetY)/this.worldScale;
  const x=110,scale=.58,footY=664.5;
  this.spineHost.scale.set(scale);this.spineHost.position.set(x,floor-footY*scale);
  this.hostShadow.position.set(x,floor);this.hostGround={x,y:floor,screenY:screenFloor,scale};
 }
 makeAtmosphere(){
  for(let i=0;i<28;i++){const s=new PIXI.Sprite(this.particles.star);s.anchor.set(.5);s.position.set(170+Math.random()*1250,35+Math.random()*205);s.scale.set(.015+Math.random()*.07);s.tint=0xb5d9ff;s.blendMode='add';s._phase=Math.random()*6.28;this.stars.push(s);this.atmosphere.addChild(s);}
  const points=[[46,545,1.8],[170,368,.9],[315,371,.65],[483,461,.5],[1336,400,.9],[1531,336,1.5],[1391,473,.6]];
  for(const [x,y,size]of points){const s=new PIXI.Sprite(this.particles.glow);s.anchor.set(.5);s.position.set(x,y);s.scale.set(size,size*1.4);s.tint=0xffa324;s.blendMode='add';s._base=size;s._phase=Math.random()*6.28;this.flames.push(s);this.atmosphere.addChild(s);}
  for(const [x,y]of [[94,37],[991,37],[250,115],[821,113]]){const s=new PIXI.Sprite(this.particles.star);s.anchor.set(.5);s.position.set(x,y);s.scale.set(.15);s.tint=0xffe4ae;s.blendMode='add';s.alpha=.4;s._phase=x/30;this.frameSparkLayer.addChild(s);}
 }
 update(dt){
  this.time+=dt;this.particles.update(dt);
  for(const reel of this.reels)for(const view of reel.views)view.update(dt);
  this.spinePlayer?.update(dt,{...settings,unframedVisible:!this.mobile,visible:!this.mobile||this.guardians.length>0||this.reels.some(r=>r.views.some(v=>v.id==='anubis'))});
  for(const s of this.stars)s.alpha=this.isTemple?0:.15+.55*Math.pow((1+Math.sin(this.time*.9+s._phase))/2,4);
  for(const s of this.flames){s.visible=!this.isTemple;s.alpha=.2+.09*Math.sin(this.time*9+s._phase)+.04*Math.sin(this.time*21+s._phase);}
  for(const s of this.frameSparkLayer.children){s.alpha=.08+.55*Math.pow((1+Math.sin(this.time*1.2+s._phase))/2,9);s.rotation=this.time*.13;}
  if(this.winOverlay&&!settings.reducedMotion){this.winOverlay.rays.rotation+=dt*.06;this.winOverlay.coinTimer+=dt;if(this.winOverlay.coinTimer>.09){this.winOverlay.coinTimer=0;this.particles.emit(this.designW/2+(Math.random()-.5)*850,this.cabinet.y+170,3,'coin');}}
 }
 drawGrid(grid){this.reels.forEach((reel,c)=>{reel.setStatic(grid[c]);reel.landSymbols();});}
 clearWins(){for(const t of this.winTweens)t.kill();this.winTweens=[];for(const ch of this.winLayer.removeChildren())ch.destroy({children:true});this.reels.forEach(r=>r.views.forEach(v=>v.reset()));}
 clearGuardians(){for(const t of this.guardianTweens)t.kill();this.guardianTweens=[];this.guardians=[];for(const ch of this.guardianLayer.removeChildren())ch.destroy({children:true});}
 async spin(result){
  this.clearWins();this.clearGuardians();this.spinePlayer.action('spin');let landedScatters=0;
  const promises=this.reels.map((reel,c)=>{
   const leftScatters=result.raw.slice(0,c).flat().filter(M.isFeature).length;const suspense=leftScatters>=2&&c>=3&&!settings.reducedMotion;
   const duration=settings.reducedMotion?.32:settings.turbo?.4+c*.045:1.18+c*.13;
   return reel.spin(result.raw[c],duration,settings.turbo?c*.035:c*.07,()=>{
    this.sound.stop(c);landedScatters+=result.raw[c].filter(M.isFeature).length;
    if(result.raw[c].some(M.isFeature))this.sound.scatter(landedScatters-1);
    if(c<4&&landedScatters>=2)this.particles.emit(this.cabinet.x+REEL_X+(c+1)*CELL+CELL/2,this.cabinet.y+REEL_Y+225,settings.reducedMotion?5:12,'spark',0x92f0ca,.6);
   },suspense);
  });
  await Promise.all(promises);
  if(result.expanded.length)await this.expandGuardians(result.expanded);
 }
 stop(){this.reels.forEach(r=>r.stop());}
 async expandGuardians(columns){
  this.sound.guardian();this.spinePlayer.action('guardian-expansion');const animations=[];
  for(const c of columns){
   const node=new PIXI.Container();node.position.set(c*CELL+CELL/2,REELS_H/2);this.guardianLayer.addChild(node);
   const plate=new PIXI.Graphics().roundRect(-CELL/2+2,-REELS_H/2+2,CELL-4,REELS_H-4,15).fill(0x152242).stroke({color:0x62cbe9,width:2});node.addChild(plate);
   const glow=new PIXI.Sprite(this.particles.glow);glow.anchor.set(.5);glow.scale.set(2.2,5.9);glow.tint=0x268add;glow.blendMode='add';node.addChild(glow);
   const hero=this.spinePlayer.sprite();hero.scale.set((CELL-4)/270);hero.y=-5;node.addChild(hero);
   const title=label('ANUBIS  WILD',12,0xd9ffff,'bold');title.y=REELS_H/2-18;node.addChild(title);
   // The flame is part of the supplied Spine rig and follows the hand bone.
   this.guardians.push(node);
   node.scale.set(.25,.2);node.alpha=0;
   animations.push(new Promise(resolve=>gsap.to(node.scale,{x:1,y:1,duration:settings.reducedMotion?.1:.62,ease:'back.out(1.35)',onComplete:resolve})));
   gsap.to(node,{alpha:1,duration:.2});
   // No sprite-scale breathing: bones and mesh deform timelines animate Anubis.
   this.particles.emit(this.cabinet.x+REEL_X+c*CELL+75,this.cabinet.y+REEL_Y+175,35,'spark',0x73ddff,1.2);
  }
  await Promise.all(animations);
 }
 showWins(result){
  if(result.totalCoins>0)this.spinePlayer.action('win');
  this.clearWins();const cells=new Set(result.wins.flatMap(w=>w.cells.map(([c,r])=>c+','+r)));if(result.scatterCount>=3)result.scatters.forEach(([c,r])=>cells.add(c+','+r));
  const outlinedGuardians=new Set();
  for(const cell of cells){
   const[c,r]=cell.split(',').map(Number),expanded=result.expanded.includes(c);
   if(expanded&&outlinedGuardians.has(c))continue;
   if(expanded)outlinedGuardians.add(c);
   const g=new PIXI.Graphics().roundRect(c*CELL+5,expanded?5:r*CELL+5,CELL-10,expanded?REELS_H-10:CELL-10,12).stroke({color:0xffd97a,width:3,alpha:.85});
   this.winLayer.addChild(g);
   if(!settings.reducedMotion)this.winTweens.push(gsap.to(g,{alpha:.2,duration:.65,repeat:-1,yoyo:true,ease:'sine.inOut'}));
   if(!expanded&&!settings.reducedMotion){const v=this.reels[c].views[r+1];this.winTweens.push(gsap.to(v.sprite.scale,{x:v.base*1.055,y:v.base*1.055,duration:.5,repeat:-1,yoyo:true,ease:'sine.inOut'}));}
  }
  const strongest=[...result.wins].sort((a,b)=>b.coins-a.coins).slice(0,2);
  strongest.forEach((win,i)=>{
   const g=new PIXI.Graphics();this.winLayer.addChild(g);const p={v:0};
   const draw=()=>{g.clear();for(const [width,color,alpha]of [[7,0xc67a2c,.28],[2,0xfff1ba,.95]]){g.moveTo(CELL/2,M.LINES[win.line-1][0]*CELL+CELL/2);const max=p.v*(win.count-1);for(let c=1;c<win.count;c++){const f=Math.min(1,Math.max(0,max-c+1));if(f<=0)break;const row0=M.LINES[win.line-1][c-1],row1=M.LINES[win.line-1][c];g.lineTo((c-.5+f)*CELL,(row0+(row1-row0)*f)*CELL+CELL/2);}g.stroke({width,color,alpha});}};
   this.winTweens.push(gsap.to(p,{v:1,duration:settings.reducedMotion?.01:.55,delay:i*.23,onUpdate:draw}));
  });
  if(result.totalCoins>=20*result.level){this.particles.emit(this.cabinet.x+REEL_X+REELS_W/2,this.cabinet.y+REEL_Y+REELS_H/2,settings.reducedMotion?5:28,'spark');}
 }
 async setTemple(enabled){if(enabled)this.spinePlayer.action('temple-entry');this.isTemple=enabled;this.positionHost();$('featureBadge').hidden=!enabled;gsap.to($('templeScene'),{opacity:enabled?1:0,duration:settings.reducedMotion?.15:1.1,ease:'sine.inOut'});gsap.to(this.well,{tint:enabled?0xd1dcff:0xffffff,duration:.7});if(enabled)this.sound.temple();await wait(settings.reducedMotion?.15:.75);}
 makeNumber(){
  const node=new PIXI.Container(),sprites=[];
  node.setNumber=value=>{
   const text=Math.floor(value).toLocaleString('en-US');let x=0;
   for(let i=0;i<text.length;i++){
    const char=text[i],m=this.metrics[char];if(!m)continue;let s=sprites[i];if(!s){s=new PIXI.Sprite(PIXI.Texture.EMPTY);node.addChild(s);sprites.push(s);}s.texture=this.tex['digit_'+char];s.visible=true;s.position.set(x,0);x+=m.advance;
   }
   for(let i=text.length;i<sprites.length;i++)sprites[i].visible=false;
   node.pivot.set(x/2,115);node.scale.set(Math.min(.61,820/Math.max(1,x)));
  };node.setNumber(0);return node;
 }
 celebrate(result,onSkippable){
  this.sound.big();this.spinePlayer.action('big-win');const overlay=new PIXI.Container();this.overlayLayer.addChild(overlay);
  const bg=new PIXI.Graphics().rect(0,0,this.designW,this.designH).fill(0x10091c);bg.alpha=0;overlay.addChild(bg);overlay.addChild(this.particles.layer);
  const content=new PIXI.Container();content.position.set(this.designW/2,this.cabinet.y+REEL_Y+REELS_H/2);overlay.addChild(content);
  const rays=new PIXI.Graphics();for(let i=0;i<16;i++){const a=i*Math.PI/8,b=a+.075;rays.moveTo(0,0).lineTo(Math.cos(a)*1100,Math.sin(a)*1100).lineTo(Math.cos(b)*1100,Math.sin(b)*1100).closePath().fill({color:0xe8ad40,alpha:.055});}content.addChild(rays);
  const crown=new PIXI.Sprite(this.tex.crown);crown.anchor.set(.5);fit(crown,225,180);crown.y=-220;content.addChild(crown);
  const mult=result.totalCoins/(20*result.level);let title;
  if(mult<25){title=new PIXI.Sprite(this.tex.bigWin);title.anchor.set(.5);fit(title,660,162);}else{title=label(mult>=50?"PHARAOH'S WIN":'MEGA WIN',mult>=50?69:100,0xffdf8a,'bold');}
  title.y=-93;content.addChild(title);
  const number=this.makeNumber();number.y=71;content.addChild(number);
  const subtitle=label('PLAY COINS',17,0xe8c996);subtitle.y=181;content.addChild(subtitle);
  const betNote=label(`${money(mult)}× TOTAL BET`,13,0xd5bd9b);betNote.y=216;content.addChild(betNote);
  this.winOverlay={bg,content,rays,coinTimer:0};content.alpha=0;content.scale.set(.8);
  this.particles.emit(this.designW/2,this.cabinet.y+350,100,'coin',0xffffff,1.7);
  return new Promise(resolve=>{
   let done=false;const count={v:0};const finish=()=>{if(done)return;done=true;this.winOverlay=null;this.root.addChildAt(this.particles.layer,3);overlay.destroy({children:true});$('skipWin').hidden=true;onSkippable(null);resolve();};
   const tl=gsap.timeline({onComplete:finish});
   tl.to(bg,{alpha:.88,duration:.25},0).to(content,{alpha:1,duration:.25},0).to(content.scale,{x:1,y:1,duration:.65,ease:'back.out(1.4)'},0);
   tl.to(count,{v:result.totalCoins,duration:settings.reducedMotion?.65:mult>=50?5.5:mult>=25?4.5:3.1,ease:'power2.out',onUpdate:()=>number.setNumber(count.v)},.25);
   tl.to({}, {duration:settings.reducedMotion?.25:.75});tl.to(overlay,{alpha:0,duration:.25});
   $('skipWin').hidden=false;onSkippable(()=>tl.progress(1));
  });
 }
}
class Game{
 constructor(scene,sound){this.scene=scene;this.sound=sound;this.session=new M.Session(read(SAVE_KEY));this.phase='IDLE';this.auto=0;this.nextTimer=null;this.presentationSkip=null;this.showcase=false;this.savedSession=null;this.exitRequested=false;this.errors=[];this.halted=false;this.viewBalance=this.session.state.balance;this.lastWin=0;this.generation=0;this.bind();this.hud();this.scene.drawGrid(this.session.state.lastGrid);}
 persist(){if(!this.showcase)save(SAVE_KEY,this.session.snapshot());}
 hint(text){$('hintText').textContent=text;}
 setPhase(value){this.phase=value;this.hud();}
 hud(){
  const s=this.session.state,f=s.free,level=f?.level||s.level,denom=f?.denom||s.denom;
  $('balanceValue').textContent=Number(this.viewBalance/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});$('betValue').textContent=(20*level*denom/100).toFixed(2);$('levelValue').textContent=level;$('coinValue').textContent=(denom/100).toFixed(2);
  const idle=this.phase==='IDLE'&&!this.halted,locked=!!f||!idle||this.showcase;
  $('levelDown').disabled=locked||M.LEVELS.indexOf(level)===0;$('levelUp').disabled=locked||M.LEVELS.indexOf(level)===M.LEVELS.length-1;
  $('coinDown').disabled=locked||M.DENOMS.indexOf(denom)===0;$('coinUp').disabled=locked||M.DENOMS.indexOf(denom)===M.DENOMS.length-1;$('maxBtn').disabled=locked;
  const spinAction=this.phase==='SPINNING'||!!this.presentationSkip;
  $('spinBtn').disabled=this.halted||!(idle||spinAction)||!!document.querySelector('dialog[open]');$('spinBtn').setAttribute('aria-label',spinAction?'Stop animation; keep the chosen result':'Spin the reels');$('spinStop').hidden=!spinAction;$('spinIcon').hidden=spinAction;
  $('autoBtn').disabled=!!f||this.showcase||(!idle&&this.auto===0);$('autoBtn').classList.toggle('running',this.auto>0);$('autoBtn').setAttribute('aria-label',this.auto>0?'Stop autoplay':'Autoplay options');$('autoLabel').innerHTML=this.auto>0?`STOP AUTO<br>${this.auto} LEFT`:'AUTO<br>PLAY';
  $('freeRemaining').textContent=f?.remaining??0;$('featureRunningWin').textContent='TEMPLE WIN '+money((f?.win??0)/denom);
  $('turboBtn').setAttribute('aria-pressed',String(settings.turbo));$('turboBtn').classList.toggle('active',settings.turbo);$('soundBtn').setAttribute('aria-pressed',String(settings.sound));$('soundBtn').classList.toggle('muted',!settings.sound);$('soundBtn').setAttribute('aria-label',settings.sound?'Mute sound':'Enable sound');
  $('showcaseBtn').disabled=!idle||!!f||this.showcase;
  $('infoBtn').disabled=!idle||!!f;$('settingsBtn').disabled=!idle||!!f;
 }
 clearNext(){if(this.nextTimer){this.nextTimer.kill();this.nextTimer=null;}}
 schedule(){this.clearNext();if(this.halted)return;if(this.exitRequested)return this.endShowcase();if(this.phase!=='IDLE')return;if(this.session.state.free||this.auto>0){const gen=this.generation;this.nextTimer=gsap.delayedCall(settings.turbo?.22:.7,()=>{this.nextTimer=null;if(this.phase==='IDLE'&&gen===this.generation){if(!this.session.state.free&&this.auto>0)this.auto--;this.spin();}});}}
 async spin(options={}){
  if(this.halted)return;
  if(this.phase==='SPINNING'){this.scene.stop();return;}
  if(this.presentationSkip){this.presentationSkip();return;}
  if(this.phase!=='IDLE'||document.querySelector('dialog[open]'))return;
  this.clearNext();this.setPhase('SPINNING');this.lastWin=0;$('smallWin').textContent='';$('resultText').textContent=this.session.state.free?'THE GUARDIAN WATCHES OVER YOUR REELS':'THE REELS OF FATE ARE TURNING';this.hint(this.session.state.free?'ANUBIS EXPANDS TO FILL ITS REEL':'CLICK SPIN AGAIN TO STOP THE REELS');
  let result;
  try{
   if(this.showcase&&this.session.state.free?.played===0&&!options.grid)options={...options,grid:[['ankh','anubis','eye'],['necklace','anubis','ankh'],['necklace','necklace','necklace'],['necklace','necklace','necklace'],['necklace','necklace','necklace']]};
   result=this.session.play(options);this.persist();this.viewBalance=result.afterDebit;this.hud();this.sound.spin();
   await this.scene.spin(result);
   this.setPhase('PRESENTING');this.viewBalance=result.after;this.lastWin=result.totalCoins;this.hud();
   if(result.totalCoins>0){
    this.scene.showWins(result);this.sound.win();const mult=result.totalCoins/(20*result.level);
    $('resultText').textContent=result.wins.length?`${result.wins.length} WINNING ${result.wins.length===1?'LINE':'LINES'}`:'TEMPLE SYMBOL WIN';$('smallWin').textContent=money(result.totalCoins)+' COINS';
    if(mult>=10){await this.scene.celebrate(result,callback=>{this.presentationSkip=callback;this.hud();});}
    else{
     await new Promise(resolve=>{let ended=false;const finish=()=>{if(ended)return;ended=true;this.presentationSkip=null;resolve();};const call=gsap.delayedCall(settings.reducedMotion?.25:settings.turbo?.38:mult>=1?1.1:.72,finish);this.presentationSkip=()=>{call.kill();finish();};this.hud();});
    }
   }else{$('resultText').textContent='THE NEXT TREASURE AWAITS';await wait(settings.turbo?.12:.25);}
   this.presentationSkip=null;
   if(this.exitRequested){this.setPhase('IDLE');this.endShowcase();return;}
   if(result.started){this.auto=0;await this.featureIntro();}
   else if(result.ended){await this.featureOutro(result.summary);}
   else if(result.retrigger){$('resultText').textContent=`+${result.retrigger} FREE SPINS · THE TEMPLE STAYS OPEN`;this.sound.temple();await wait(settings.reducedMotion?.15:1);}
   this.setPhase('IDLE');this.hint(this.session.state.free?'ANUBIS EXPANDS TO FILL ITS REEL':'3 EMERALD SCARABS / BONUS ICONS OPEN THE TEMPLE');this.schedule();
  }catch(error){
   this.auto=0;this.presentationSkip=null;this.viewBalance=this.session.state.balance;this.setPhase('IDLE');this.hint(error.message);this.errors.push(String(error));
   if(!String(error.message).includes('Not enough'))window.kemetFailure(error);
  }
 }
 async featureIntro(){
  const f=this.session.state.free;if(!f)return;
  this.setPhase('FEATURE_INTRO');$('awardedSpins').textContent=f.remaining;$('featureIntro').hidden=false;
  gsap.fromTo($('featureIntro'),{opacity:0},{opacity:1,duration:settings.reducedMotion?.1:.55});
  const enter=new Promise(resolve=>{$('enterTemple').onclick=()=>{$('enterTemple').onclick=null;this.sound.click();resolve();};});await this.scene.setTemple(true);await enter;
  await new Promise(resolve=>gsap.to($('featureIntro'),{opacity:0,duration:settings.reducedMotion?.1:.4,onComplete:resolve}));$('featureIntro').hidden=true;
 }
 async featureOutro(summary){
  this.setPhase('FEATURE_SUMMARY');$('summarySpins').textContent=summary.played+' FREE SPINS PLAYED';$('summaryAmount').textContent=money(summary.win/summary.denom);$('featureOutro').hidden=false;this.sound.big();
  gsap.fromTo($('featureOutro'),{opacity:0},{opacity:1,duration:.4});
  await new Promise(resolve=>{$('leaveTemple').onclick=()=>{$('leaveTemple').onclick=null;this.sound.click();resolve();};});
  await new Promise(resolve=>gsap.to($('featureOutro'),{opacity:0,duration:.35,onComplete:resolve}));$('featureOutro').hidden=true;this.scene.clearGuardians();await this.scene.setTemple(false);
  $('resultText').textContent='TEMPLE TOTAL';$('smallWin').textContent=money(summary.win/summary.denom)+' COINS';
  if(this.showcase)this.exitRequested=true;
 }
 changeBet(which,delta){if(this.phase!=='IDLE'||this.session.state.free||this.showcase)return;this.auto=0;this.clearNext();const s=this.session.state,values=which==='level'?M.LEVELS:M.DENOMS,index=values.indexOf(s[which]);const next=values[Math.max(0,Math.min(values.length-1,index+delta))];this.session.setBet(which==='level'?next:s.level,which==='denom'?next:s.denom);this.persist();this.sound.click();this.hud();}
 openDialog(id){if(this.phase!=='IDLE'||this.session.state.free)return;this.auto=0;this.clearNext();this.sound.click();$(id).showModal();this.hud();}
 toggleSound(){settings.sound=!settings.sound;this.sound.click();$('soundSetting').checked=settings.sound;save(SETTINGS_KEY,settings);this.hud();}
 async fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await $('game').requestFullscreen();}catch{this.hint('Fullscreen is not available in this viewer.');}}
 async startShowcase(){
  if(this.phase!=='IDLE'||this.session.state.free||this.showcase)return;this.auto=0;this.clearNext();this.savedSession=this.session;this.session=new M.Session(null,M.seeded(2188));this.showcase=true;this.exitRequested=false;this.viewBalance=this.session.state.balance;$('showcaseBar').hidden=false;this.hud();
  // This separate, clearly labelled scene is deliberately staged. Never saved.
  const grid=[['scatter','ankh','eye'],['eye','necklace','ankh'],['ankh','scatter','eye'],['necklace','eye','ankh'],['eye','ankh','scatter']];await this.spin({grid});
 }
 endShowcase(){
  if(!this.showcase)return;this.clearNext();this.generation++;this.session=this.savedSession;this.savedSession=null;this.showcase=false;this.exitRequested=false;this.auto=0;this.viewBalance=this.session.state.balance;$('showcaseBar').hidden=true;$('featureIntro').hidden=true;$('featureOutro').hidden=true;this.scene.clearWins();this.scene.clearGuardians();this.scene.drawGrid(this.session.state.lastGrid);this.scene.setTemple(false);this.setPhase('IDLE');$('resultText').textContent='BACK TO YOUR GAME';$('smallWin').textContent='';this.hint('SHOWCASE COMPLETE · YOUR COINS ARE UNCHANGED');
 }
 bind(){
  $('spinBtn').addEventListener('click',()=>this.spin());$('skipWin').addEventListener('click',()=>this.presentationSkip?.());
  $('levelDown').onclick=()=>this.changeBet('level',-1);$('levelUp').onclick=()=>this.changeBet('level',1);$('coinDown').onclick=()=>this.changeBet('denom',-1);$('coinUp').onclick=()=>this.changeBet('denom',1);
  $('maxBtn').onclick=()=>{if(this.phase==='IDLE'&&!this.session.state.free){this.auto=0;this.clearNext();this.session.setBet(M.LEVELS[M.LEVELS.length-1],this.session.state.denom);this.persist();this.sound.click();this.hud();}};
  $('infoBtn').onclick=()=>this.openDialog('infoDialog');$('settingsBtn').onclick=()=>{$('soundSetting').checked=settings.sound;$('volumeSetting').value=settings.volume*100;$('motionSetting').checked=settings.reducedMotion;$('qualitySetting').value=settings.quality;this.openDialog('settingsDialog');};
  $('soundBtn').onclick=()=>this.toggleSound();$('turboBtn').onclick=()=>{settings.turbo=!settings.turbo;save(SETTINGS_KEY,settings);this.sound.click();this.hud();};$('fullscreenBtn').onclick=()=>this.fullscreen();
  $('autoBtn').onclick=()=>{if(this.auto>0){this.auto=0;this.clearNext();this.hint('AUTOPLAY STOPPED');this.hud();}else this.openDialog('autoDialog');};
  document.querySelectorAll('[data-close]').forEach(button=>button.onclick=()=>button.closest('dialog').close());
  document.querySelectorAll('dialog').forEach(d=>{d.addEventListener('close',()=>this.hud());d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});});
  document.querySelectorAll('[data-auto]').forEach(b=>b.onclick=()=>{this.auto=Number(b.dataset.auto);$('autoDialog').close();this.hud();this.schedule();});
  $('soundSetting').onchange=()=>this.toggleSound();$('volumeSetting').oninput=e=>{settings.volume=Number(e.target.value)/100;save(SETTINGS_KEY,settings);};$('motionSetting').onchange=e=>{settings.reducedMotion=e.target.checked;save(SETTINGS_KEY,settings);};$('qualitySetting').onchange=e=>{settings.quality=e.target.value;save(SETTINGS_KEY,settings);};
  let resetUntil=0;$('resetBtn').onclick=()=>{if(this.session.state.free||this.showcase)return;if(Date.now()>resetUntil){resetUntil=Date.now()+4000;$('resetNotice').hidden=false;return;}this.session=new M.Session();this.viewBalance=this.session.state.balance;this.scene.clearWins();this.scene.clearGuardians();this.scene.drawGrid(M.START_GRID);this.persist();this.hud();$('resetNotice').hidden=true;resetUntil=0;$('settingsDialog').close();this.hint('250,000 DEMO COINS RESTORED');};
  $('showcaseBtn').onclick=()=>this.startShowcase();$('exitShowcase').onclick=()=>{this.exitRequested=true;if(this.phase==='FEATURE_INTRO')$('enterTemple').click();else if(this.phase==='FEATURE_SUMMARY')$('leaveTemple').click();else if(this.phase==='IDLE')this.endShowcase();else if(this.presentationSkip)this.presentationSkip();else if(this.phase==='SPINNING')this.scene.stop();};
  window.addEventListener('keydown',e=>{if(e.repeat||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;if(document.querySelector('dialog[open]'))return;const k=e.key.toLowerCase();if(e.code==='Space'){e.preventDefault();if(this.phase==='FEATURE_INTRO')$('enterTemple').click();else if(this.phase==='FEATURE_SUMMARY')$('leaveTemple').click();else this.spin();}else if(k==='m')this.toggleSound();else if(k==='t')$('turboBtn').click();else if(k==='f')this.fullscreen();else if(k==='i')this.openDialog('infoDialog');});
  window.addEventListener('resize',()=>this.scene.resize());
  window.addEventListener('pagehide',()=>this.persist());
 }
 async resume(){if(this.session.state.free){this.setPhase('RESUMING');if(this.session.state.free.played===0)await this.featureIntro();else await this.scene.setTemple(true);this.setPhase('IDLE');this.schedule();}}
}
async function boot(){
 if(!window.PIXI||!window.gsap)throw new Error('The bundled runtime is missing. Open King_Tuts_Temple_PLAY.html or keep the vendor folder beside index.html.');
 const paths={frameTop:'assets/ui/kingtuts_top_title.png',frameLeft:'assets/ui/kingtuts_left_column.png',frameRight:'assets/ui/kingtuts_right_column.png',frameBottom:'assets/ui/kingtuts_bottom_rail.png',frameBack:'assets/ui/kingtuts_stone_reel_bed.png',frameExact:'assets/ui/kingtuts_exact_frame_title.png',logo:'assets/ui/logo.png',bigWin:'assets/wins/big_win.png',crown:'assets/wins/big_win_decor.png',digits:'assets/wins/digits.png',...Object.fromEntries(M.SYMBOLS.map(s=>[s.id,`assets/symbols/${s.id}.png`]))};
 const beetle=window.KEMET_BEETLE_DATA,eye=window.KEMET_EYE_DATA;
 if(!beetle||beetle.frameCount!==54||beetle.frames.length!==54||!(beetle.fps>0))throw new Error('Beetle atlas invalid.');
 if(!eye||eye.frameCount!==35||eye.frames.length!==35||!(eye.fps>0))throw new Error('Eye atlas invalid. Keep eye-data.js with the game.');
 const totalAssets=Object.keys(paths).length+beetle.pages.length+eye.pages.length;
 let loaded=0;const textures={};
 const progress=()=>{$('loadingProgress').style.width=(++loaded/totalAssets*90)+'%';};
 const [pages,,eyePages]=await Promise.all([
  Promise.all(beetle.pages.map(async page=>{const image=await loadImage(page.image);if(image.naturalWidth!==page.width||image.naturalHeight!==page.height)throw new Error('Beetle atlas size mismatch: '+page.image);const texture=PIXI.Texture.from(image);progress();return texture;})),
  Promise.all(Object.entries(paths).map(async([key,path])=>{textures[key]=PIXI.Texture.from(await loadImage(path));progress();})),
  Promise.all(eye.pages.map(async page=>{const image=await loadImage(page.image);if(image.naturalWidth!==page.width||image.naturalHeight!==page.height)throw new Error('Eye atlas size mismatch: '+page.image);const texture=PIXI.Texture.from(image);progress();return texture;}))
 ]);
 // All instances reuse these 54 lightweight texture views and three sources.
 const frames=beetle.frames.map(f=>{const page=pages[f.page];if(!page||f.x<0||f.y<0||f.x+f.w>page.width||f.y+f.h>page.height)throw new Error('Invalid beetle atlas frame: '+f.source);return new PIXI.Texture({source:page.source,frame:new PIXI.Rectangle(f.x,f.y,f.w,f.h)});});
 textures.beetle={frames,pages,fps:beetle.fps,loop:'pingpong'};textures.scatter=frames[0];
 const eyeFrames=eye.frames.map(f=>{const page=eyePages[f.page];if(!page||f.x<0||f.y<0||f.x+f.w>page.width||f.y+f.h>page.height)throw new Error('Invalid eye atlas frame: '+f.source);return new PIXI.Texture({source:page.source,frame:new PIXI.Rectangle(f.x,f.y,f.w,f.h)});});
 textures.eyeAnimation={frames:eyeFrames,pages:eyePages,fps:eye.fps,loop:'pingpong'};textures.eye=eyeFrames[0];
 // Atlas metadata is embedded in both the editable source and standalone build.
 const metrics=window.KEMET_DIGITS;
 if(!metrics)throw new Error('Win-number atlas metadata is missing.');
 for(const[char,m]of Object.entries(metrics))textures['digit_'+char]=new PIXI.Texture({source:textures.digits.source,frame:new PIXI.Rectangle(m.x,m.y,m.w,m.h)});
 const spineData=KemetSpine38.create(window.KEMET_SPINE_DATA,await loadImage('assets/spine/anubis.png'));
 const app=new PIXI.Application();await app.init({width:innerWidth,height:innerHeight,preference:'webgl',backgroundAlpha:0,antialias:true,resolution:Math.min(devicePixelRatio||1,1.5),autoDensity:true,powerPreference:'default'});$('canvasHost').appendChild(app.canvas);
 const sound=new Sound(),scene=new Scene(app,textures,metrics,sound,spineData),game=new Game(scene,sound);
 app.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();game.halted=true;game.auto=0;game.clearNext();game.setPhase('ERROR');game.persist();window.kemetFailure(new Error('The browser lost its WebGL graphics context. Your settled demo progress was saved. Close other graphics-heavy tabs and reload this page.'));});
 $('paytable').innerHTML=M.SYMBOLS.filter(s=>s.pays.length).map(s=>`<article><img src="${asset(`assets/symbols/${s.id}.png`)}" alt="${s.name}"><h3>${s.name}</h3>${s.pays.map((p,i)=>`<p>${i+3} MATCH <b>${p}</b></p>`).join('')}</article>`).join('');
 app.render();$('loadingProgress').style.width='100%';$('loading').hidden=true;
 window.KEMET={version:'king-tuts-temple-2.0.0-reference-ui',pixi:PIXI.VERSION,gsap:gsap.version,renderer:app.renderer.gl?'WebGL':app.renderer.gpu?'WebGPU':'Canvas2D',ready:true,character:()=>scene.spinePlayer.stats(),getState:()=>({phase:game.phase,session:game.session.snapshot(),auto:game.auto,showcase:game.showcase,particles:scene.particles.active.length,pooled:scene.particles.pool.length,errors:[...game.errors]}),spin:()=>game.spin(),showcase:()=>game.startShowcase()};
 if(window.__KEMET_TEST__)window.KEMET_TEST={game,scene,app,math:M};
 console.info(`[King Tuts Temple] ${window.KEMET.renderer} · READY · PixiJS ${PIXI.VERSION} · GSAP ${gsap.version} · Spine 3.8.99 LIVE · bundled/offline · 5×3 / 20 lines`);
 await game.resume();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>boot().catch(window.kemetFailure),{once:true});else boot().catch(window.kemetFailure);
})();
