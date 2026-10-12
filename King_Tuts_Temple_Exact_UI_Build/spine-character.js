/*!
Spine Runtimes License Agreement
Last updated April 5, 2025. Replaces all prior versions.

Copyright (c) 2013-2025, Esoteric Software LLC

Integration of the Spine Runtimes into software or otherwise creating derivative works of the Spine Runtimes is permitted under the terms and conditions of Section 2 of the Spine Editor License Agreement:
http://esotericsoftware.com/spine-editor-license

Otherwise, it is permitted to integrate the Spine Runtimes into software or otherwise create derivative works of the Spine Runtimes (collectively, "Products"), provided that each user of the Products must obtain their own Spine Editor license and redistribution of the Products in any form must include this license and copyright notice.

THE SPINE RUNTIMES ARE PROVIDED BY ESOTERIC SOFTWARE LLC "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
IN NO EVENT SHALL ESOTERIC SOFTWARE LLC BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES, BUSINESS INTERRUPTION, OR LOSS OF USE, DATA, OR PROFITS) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THE SPINE RUNTIMES, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

*/
/* Crowns of Kemet — live Spine 3.8 Anubis adapter.
 * Reads the supplied skeleton, skins, atlas, weighted meshes and animation data.
 * This is a rig-specific player, NOT a replacement for the general Spine runtime.
 * Bone transform and atlas conventions follow Esoteric Software's 3.8 runtime.
 * See docs/SPINE_RUNTIME_LICENSE.txt and docs/SPINE_INTEGRATION.md.
 * No animation frames are baked. A live skeleton is rasterized into a shared
 * transparent Pixi texture, retaining the existing working game renderer.
 */
(function (global) {
'use strict';
const DEG=Math.PI/180, RAD=180/Math.PI;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const wrap=x=>((x+180)%360+360)%360-180;
const lerp=(a,b,t)=>a+(b-a)*t;
const color=s=>{s=s||'ffffffff';return [0,2,4,6].map((i)=>parseInt(s.slice(i,i+2)||'ff',16)/255);};
const boneDefaults={x:0,y:0,rotation:0,scaleX:1,scaleY:1,shearX:0,shearY:0};
const keys=Object.keys(boneDefaults);
function fail(message){throw new Error('Anubis Spine: '+message);}

function bezier(frame,x){
 if(frame.curve==='stepped')return 0;
 if(frame.curve===undefined)return x;
 const c=Array.isArray(frame.curve)?frame.curve:[frame.curve,frame.c2??0,frame.c3??1,frame.c4??1];
 let a=0,b=1,t=x;
 // Monotonic Bezier x coordinate; deterministic and stable for short keyframes.
 for(let i=0;i<14;i++){
  const q=1-t,px=3*q*q*t*c[0]+3*q*t*t*c[2]+t*t*t;
  if(Math.abs(px-x)<1e-6)break;
  if(px<x)a=t;else b=t;t=(a+b)/2;
 }
 const q=1-t;return 3*q*q*t*c[1]+3*q*t*t*c[3]+t*t*t;
}
function interval(frames,time){
 if(!frames.length||time<(frames[0].time||0))return null;
 let lo=0,hi=frames.length-1;
 while(lo<hi){const m=(lo+hi+1)>>1;if((frames[m].time||0)<=time)lo=m;else hi=m-1;}
 const a=frames[lo],b=frames[lo+1];
 return [a,b,b?bezier(a,clamp((time-(a.time||0))/((b.time||0)-(a.time||0)),0,1)):0];
}
function value(frames,time,fields,defaults,rotation=false){
 const q=interval(frames,time);if(!q)return null;
 const [a,b,f]=q;
 return fields.map((k,i)=>{const av=a[k]??defaults[i],bv=b?(b[k]??defaults[i]):av;return av+(rotation?wrap(bv-av):bv-av)*f;});
}
function parseAtlas(text,image){
 const lines=text.trim().split(/\r?\n/);let region=null;const result=new Map();
 const page=lines.shift();if(page!=='character_anubis.png')fail('Unexpected atlas page '+page);
 for(const line of lines){
  if(!line.trim())continue;
  if(!/^\s/.test(line)&&!line.includes(':')){region={name:line.trim()};result.set(region.name,region);continue;}
  if(!region)continue;
  const i=line.indexOf(':');const k=line.slice(0,i).trim(),v=line.slice(i+1).trim();
  region[k]=k==='rotate'?(v==='true'?90:v==='false'?0:Number(v)):v.split(',').map(Number);
 }
 for(const r of result.values()){
  if(!r.xy||!r.size||!r.orig||!r.offset)fail('Incomplete atlas region '+r.name);
  const [x,y]=r.xy,[w,h]=r.size,[ow,oh]=r.orig,[ox,oy]=r.offset;
  const c=document.createElement('canvas');c.width=ow;c.height=oh;
  const ctx=c.getContext('2d');const top=oh-oy-h;
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  if(r.rotate===90){ctx.translate(ox+w,top);ctx.rotate(Math.PI/2);ctx.drawImage(image,x,y,h,w,0,0,h,w);}
  else if(r.rotate===0)ctx.drawImage(image,x,y,w,h,ox,top,w,h);
  else fail('Unsupported atlas rotation '+r.rotate);
  r.image=c;r.width=ow;r.height=oh;
 }
 return result;
}
function geometry(raw,count){
 const v=raw.vertices||[];
 if(v.length===count*2)return {weighted:false,local:new Float64Array(v),deformLength:count*2,count};
 let p=0,d=0;const influences=[];
 for(let i=0;i<count;i++){
  const n=v[p++],list=[];if(!Number.isInteger(n)||n<1)fail('Malformed weighted vertex');
  for(let j=0;j<n;j++){const bone=v[p++],x=v[p++],y=v[p++],weight=v[p++];list.push({bone,x,y,weight,d});d+=2;}
  influences.push(list);
 }
 if(p!==v.length)fail('Weighted vertex count mismatch');
 return {weighted:true,influences,deformLength:d,count};
}
class RigData {
 constructor(exported,image){
  this.json=exported.skeleton;
  if(this.json.skeleton.spine!=='3.8.99')fail('This adapter expects the supplied 3.8.99 export.');
  this.regions=parseAtlas(exported.atlas,image);
  const validateColors=x=>{if(Array.isArray(x))x.forEach(validateColors);else if(x&&typeof x==='object'){if(typeof x.color==='string'&&!x.color.startsWith('ffffff'))fail('RGB tint requires the full Spine renderer');Object.values(x).forEach(validateColors);}};
  validateColors(this.json);
  this.bones=this.json.bones.map((b,i)=>({...boneDefaults,...b,index:i}));
  this.boneMap=new Map(this.bones.map(b=>[b.name,b.index]));
  this.slots=this.json.slots.map((s,i)=>({...s,index:i,boneIndex:this.boneMap.get(s.bone),rgba:color(s.color)}));
  this.slotMap=new Map(this.slots.map(s=>[s.name,s.index]));
  this.attachments=new Map();this.meshCount=0;this.triangleCount=0;
  const skin=this.json.skins.find(s=>s.name==='default');if(!skin)fail('Default skin missing');
  for(const [slot,attachments]of Object.entries(skin.attachments))for(const[name,raw]of Object.entries(attachments)){
   const type=raw.type||'region';if(!['mesh','linkedmesh','region','clipping'].includes(type))fail('Unsupported attachment '+type);
   const a={raw,name,slot,type,color:color(raw.color),deformKey:slot+'\0'+name};
   this.attachments.set(slot+'\0'+name,a);
  }
  const finish=a=>{
   if(a.done)return;a.done=true;
   const r=a.raw;
   if(a.type==='linkedmesh'){
    const parent=this.attachments.get(a.slot+'\0'+r.parent);if(!parent)fail('Linked mesh parent missing: '+r.parent);
    finish(parent);a.geo=parent.geo;a.uv=parent.uv;a.triangles=parent.triangles;
    if(r.deform!==false)a.deformKey=parent.deformKey;
   }else if(a.type==='mesh'){
    a.geo=geometry(r,r.uvs.length/2);a.uv=r.uvs;a.triangles=r.triangles;
   }else if(a.type==='clipping'){
    a.geo=geometry(r,r.vertexCount);a.end=r.end;return;
   }else{
    const w=r.width,h=r.height,ang=(r.rotation||0)*DEG,c=Math.cos(ang),s=Math.sin(ang),sx=r.scaleX??1,sy=r.scaleY??1;
    const local=[];
    for(const[x,y]of [[-w/2,h/2],[-w/2,-h/2],[w/2,-h/2],[w/2,h/2]])local.push(c*x*sx-s*y*sy+(r.x||0),s*x*sx+c*y*sy+(r.y||0));
    a.geo={weighted:false,local:new Float64Array(local),count:4,deformLength:0};
    a.uv=[0,0,0,1,1,1,1,0];a.triangles=[0,1,2,2,3,0];
   }
   a.region=this.regions.get(r.path||a.name);if(!a.region)fail('Atlas region missing: '+(r.path||a.name));
   a.uvPixels=new Float64Array(a.uv.map((v,i)=>v*(i%2?a.region.height:a.region.width)));
   a.triData=[];
   for(let i=0;i<a.triangles.length;i+=3){
    const ia=a.triangles[i]*2,ib=a.triangles[i+1]*2,ic=a.triangles[i+2]*2;
    const u0=a.uvPixels[ia],v0=a.uvPixels[ia+1],u1=a.uvPixels[ib],v1=a.uvPixels[ib+1],u2=a.uvPixels[ic],v2=a.uvPixels[ic+1];
    const den=u0*(v1-v2)+u1*(v2-v0)+u2*(v0-v1);
    if(Math.abs(den)<1e-8)continue;
    a.triData.push({ia,ib,ic,u0,v0,u1,v1,u2,v2,inv:1/den});
   }
   this.meshCount++;this.triangleCount+=a.triData.length;
  };
  for(const a of this.attachments.values())finish(a);
  this.animations=new Map();
  for(const[name,raw]of Object.entries(this.json.animations)){
   let duration=0;const visit=x=>{if(Array.isArray(x))x.forEach(visit);else if(x&&typeof x==='object'){if(typeof x.time==='number')duration=Math.max(duration,x.time);Object.values(x).forEach(visit);}};visit(raw);
   const anim={name,duration,bones:[],slots:[],deform:[]};
   for(const[bone,timelines]of Object.entries(raw.bones||{})){
    for(const[type,frames]of Object.entries(timelines)){
     if(!['rotate','translate','scale','shear'].includes(type))fail('Unsupported bone timeline '+type);
     anim.bones.push({index:this.boneMap.get(bone),type,frames});
    }
   }
   for(const[slot,timelines]of Object.entries(raw.slots||{}))for(const[type,frames]of Object.entries(timelines)){
    if(!['color','attachment'].includes(type))fail('Unsupported slot timeline '+type);
    anim.slots.push({index:this.slotMap.get(slot),type,frames:frames.map(f=>type==='color'?{...f,rgba:color(f.color)}:f)});
   }
   for(const[skin,slots]of Object.entries(raw.deform||{})){
    if(skin!=='default')fail('Unsupported animation skin '+skin);
    for(const[slot,items]of Object.entries(slots))for(const[name,frames]of Object.entries(items)){
     const att=this.attachments.get(slot+'\0'+name);if(!att)fail('Deform attachment not found '+name);
     const compiled=frames.map(f=>{const data=new Float64Array(att.geo.deformLength);if(f.vertices)data.set(f.vertices,f.offset||0);return {...f,data};});
     anim.deform.push({key:att.deformKey,frames:compiled,length:att.geo.deformLength});
    }
   }
   this.animations.set(name,anim);
  }
  if(!this.animations.has('idle')||!this.animations.has('action'))fail('Idle/action clips are missing');
  for(const b of this.bones)if(!['normal','noRotationOrReflection'].includes(b.transform||'normal'))fail('Unsupported bone transform '+b.transform);
  for(const t of this.json.transform||[])if((t.rotateMix??1)!==0||(t.scaleMix??1)!==0||(t.shearMix??1)!==0||t.local||t.relative)fail('Unexpected transform constraint configuration');
  if((this.json.path||[]).length)fail('Path constraints are not supported by this asset-specific player');
 }
 pose(){return {bones:this.bones.map(b=>keys.map(k=>b[k])),colors:this.slots.map(s=>s.rgba.slice()),names:this.slots.map(s=>s.attachment||null),deform:new Map()};}
 sample(name,time){
  const a=this.animations.get(name);if(!a)fail('Unknown animation '+name);
  const p=this.pose();
  for(const t of a.bones){
   const b=p.bones[t.index],setup=this.bones[t.index];let v;
   if(t.type==='rotate'){v=value(t.frames,time,['angle'],[0],true);if(v)b[2]=setup.rotation+v[0];}
   else if(t.type==='translate'){v=value(t.frames,time,['x','y'],[0,0]);if(v){b[0]=setup.x+v[0];b[1]=setup.y+v[1];}}
   else if(t.type==='scale'){v=value(t.frames,time,['x','y'],[1,1]);if(v){b[3]=setup.scaleX*v[0];b[4]=setup.scaleY*v[1];}}
   else{v=value(t.frames,time,['x','y'],[0,0]);if(v){b[5]=setup.shearX+v[0];b[6]=setup.shearY+v[1];}}
  }
  for(const t of a.slots){const q=interval(t.frames,time);if(!q)continue;const[a,b,f]=q;
   if(t.type==='attachment')p.names[t.index]=a.name??null;
   else p.colors[t.index]=a.rgba.map((v,i)=>lerp(v,b?b.rgba[i]:v,f));
  }
  for(const t of a.deform){const q=interval(t.frames,time);if(!q)continue;const[a,b,f]=q,d=new Float64Array(t.length);for(let i=0;i<d.length;i++)d[i]=lerp(a.data[i],b?b.data[i]:a.data[i],f);p.deform.set(t.key,d);}
  return p;
 }
 mix(a,b,f){
  for(let i=0;i<b.bones.length;i++)for(let k=0;k<7;k++)b.bones[i][k]=a.bones[i][k]+(k===2?wrap(b.bones[i][k]-a.bones[i][k]):b.bones[i][k]-a.bones[i][k])*f;
  for(let i=0;i<b.colors.length;i++)for(let k=0;k<4;k++)b.colors[i][k]=lerp(a.colors[i][k],b.colors[i][k],f);
  for(const key of new Set([...a.deform.keys(),...b.deform.keys()])){const av=a.deform.get(key),bv=b.deform.get(key),out=new Float64Array((av||bv).length);for(let i=0;i<out.length;i++)out[i]=lerp(av?.[i]||0,bv?.[i]||0,f);b.deform.set(key,out);}
  return b;
 }
}
class Skeleton {
 constructor(data){
  this.data=data;this.bones=data.bones.map(b=>({...b,a:1,b:0,c:0,d:1,worldX:0,worldY:0,children:[]}));
  for(const b of this.bones){b.parentBone=b.parent?this.bones[data.boneMap.get(b.parent)]:null;if(b.parentBone)b.parentBone.children.push(b);}
  this.constraints=[...(data.json.ik||[]).map(c=>({...c,kind:'ik'})),...(data.json.transform||[]).map(c=>({...c,kind:'transform'}))].sort((a,b)=>(a.order||0)-(b.order||0));
  this.pose=data.pose();this.worldVertices=new Map();this.apply(this.pose);
 }
 world(b){
  const {x,y,rotation:r,scaleX:sx,scaleY:sy,shearX:shx,shearY:shy}=b,p=b.parentBone;
  let la=Math.cos((r+shx)*DEG)*sx,lc=Math.sin((r+shx)*DEG)*sx,lb=Math.cos((r+90+shy)*DEG)*sy,ld=Math.sin((r+90+shy)*DEG)*sy;
  if(!p){b.a=la;b.b=lb;b.c=lc;b.d=ld;b.worldX=x;b.worldY=y;return;}
  b.worldX=p.a*x+p.b*y+p.worldX;b.worldY=p.c*x+p.d*y+p.worldY;
  let pa=p.a,pb=p.b,pc=p.c,pd=p.d;
  if(b.transform==='noRotationOrReflection'){
   let s=pa*pa+pc*pc,prx;
   if(s>.0001){s=Math.abs(pa*pd-pb*pc)/s;pb=pc*s;pd=pa*s;prx=Math.atan2(pc,pa)*RAD;}
   else{pa=pc=0;prx=90-Math.atan2(pd,pb)*RAD;}
   const rx=(r+shx-prx)*DEG,ry=(r+shy-prx+90)*DEG;
   la=Math.cos(rx)*sx;lb=Math.cos(ry)*sy;lc=Math.sin(rx)*sx;ld=Math.sin(ry)*sy;
   b.a=pa*la-pb*lc;b.b=pa*lb-pb*ld;b.c=pc*la+pd*lc;b.d=pc*lb+pd*ld;
  }else{b.a=pa*la+pb*lc;b.b=pa*lb+pb*ld;b.c=pc*la+pd*lc;b.d=pc*lb+pd*ld;}
 }
 branch(b){this.world(b);b.children.forEach(c=>this.branch(c));}
 apply(pose){
  this.pose=pose;
  for(let i=0;i<this.bones.length;i++){const b=this.bones[i];keys.forEach((k,j)=>b[k]=pose.bones[i][j]);this.world(b);}
  for(const constraint of this.constraints){
   if(constraint.kind==='ik')this.ik(constraint);else{
    const t=this.bones[this.data.boneMap.get(constraint.target)],x=constraint.x||0,y=constraint.y||0,mix=constraint.translateMix??1;
    const wx=t.a*x+t.b*y+t.worldX,wy=t.c*x+t.d*y+t.worldY;
    for(const name of constraint.bones){const b=this.bones[this.data.boneMap.get(name)];b.worldX+=(wx-b.worldX)*mix;b.worldY+=(wy-b.worldY)*mix;b.children.forEach(c=>this.branch(c));}
   }
  }
 }
 ik(c){
  if(c.bones.length!==2)fail('Expected a two-bone IK chain');
  const parent=this.bones[this.data.boneMap.get(c.bones[0])],child=this.bones[this.data.boneMap.get(c.bones[1])],target=this.bones[this.data.boneMap.get(c.target)],p=parent.parentBone;
  // Both exported leg chains have positive, uniform parent scale and no shear.
  // Reject incompatible rigs instead of silently approximating general Spine IK.
  if(Math.abs(parent.scaleX-parent.scaleY)>1e-5||parent.scaleX<=0||child.scaleX<=0||parent.shearX||parent.shearY)fail('Unexpected IK scale/shear');
  const det=p.a*p.d-p.b*p.c;if(Math.abs(det)<1e-10)return;
  const dx=target.worldX-p.worldX,dy=target.worldY-p.worldY;
  const tx=(dx*p.d-dy*p.b)/det-parent.x,ty=(dy*p.a-dx*p.c)/det-parent.y;
  const offset=Math.atan2(child.y,child.x),l1=Math.hypot(child.x,child.y)*parent.scaleX,l2=(child.length||0)*child.scaleX*parent.scaleX;
  const a2=Math.acos(clamp((tx*tx+ty*ty-l1*l1-l2*l2)/(2*l1*l2),-1,1))*(c.bendPositive===false?-1:1);
  const a1=Math.atan2(ty,tx)-Math.atan2(l2*Math.sin(a2),l1+l2*Math.cos(a2)),mix=c.mix??1;
  parent.rotation+=wrap((a1-offset)*RAD-parent.rotation)*mix;
  child.rotation+=wrap((a2+offset)*RAD-child.shearX-child.rotation)*mix;
  this.branch(parent);
 }
 vertices(attachment,slot){
  const g=attachment.geo;let out=this.worldVertices.get(attachment);
  if(!out){out=new Float64Array(g.count*2);this.worldVertices.set(attachment,out);}
  const deform=this.pose.deform.get(attachment.deformKey);
  if(g.weighted){
   for(let i=0;i<g.count;i++){let x=0,y=0;for(const v of g.influences[i]){const b=this.bones[v.bone],vx=v.x+(deform?.[v.d]||0),vy=v.y+(deform?.[v.d+1]||0);x+=(b.a*vx+b.b*vy+b.worldX)*v.weight;y+=(b.c*vx+b.d*vy+b.worldY)*v.weight;}out[i*2]=x;out[i*2+1]=y;}
  }else{const b=this.bones[slot.boneIndex];for(let i=0;i<out.length;i+=2){const x=g.local[i]+(deform?.[i]||0),y=g.local[i+1]+(deform?.[i+1]||0);out[i]=b.a*x+b.b*y+b.worldX;out[i+1]=b.c*x+b.d*y+b.worldY;}}
  return out;
 }
}
class Player {
 constructor(data,{fps=30,decorations=true,width=600,height=880}={}){
  this.data=data;this.skeleton=new Skeleton(data);this.fps=fps;this.decorations=decorations;
  this.canvas=document.createElement('canvas');this.canvas.width=width;this.canvas.height=height;
  this.ctx=this.canvas.getContext('2d',{alpha:true});
  // Fixed framing: no per-frame fit/bounds jitter. Original frame centered at x=0.
  this.bounds={x:-160,y:-415,width:600,height:880};this.name='idle';this.time=0;this.loop=true;this.speed=1;this.mixFrom=null;this.mixElapsed=0;this.mixDuration=.16;this.accumulator=0;
  this.unframedView=null;this.frames=0;this.actionCount=0;this.events=[];this.disposed=false;this.lastReason='idle';this.sprites=new Set();
  this.renderPose();this.texture=PIXI.Texture.from(this.canvas);
 }
 play(name,{loop=name==='idle',speed=1,mix=.16,reason='game'}={}){
  if(this.disposed)return;if(!this.data.animations.has(name))fail('Animation not available: '+name);
  this.mixFrom=this.skeleton.pose;this.mixElapsed=0;this.mixDuration=Math.max(.001,mix);this.name=name;this.time=0;this.loop=loop;this.speed=speed;this.lastReason=reason;
  if(name==='action')this.actionCount++;this.events.push({animation:name,reason});if(this.events.length>20)this.events.shift();this.accumulator=1/this.fps;
 }
 action(reason='action'){this.play('action',{loop:false,reason});}
 update(dt,{reducedMotion=false,quality='high',visible=true,unframedVisible=true}={}){
  if(this.disposed)return;
  if(this.unframedView)this.unframedView.enabled=unframedVisible;
  if(reducedMotion){if(!this.wasReduced){this.name='idle';this.time=0;this.mixFrom=null;this.renderPose();this.wasReduced=true;}return;}
  this.wasReduced=false;const elapsed=Math.max(0,Math.min(dt,.1));this.time+=elapsed*this.speed;this.mixElapsed+=elapsed;
  const duration=this.data.animations.get(this.name).duration;
  if(this.time>=duration){if(this.loop)this.time%=duration;else this.play('idle',{reason:'action-complete'});}
  if(!visible){this.accumulator=0;return;}
  this.accumulator+=elapsed;const fps=quality==='low'?15:this.fps;
  if(this.accumulator>=1/fps){this.accumulator%=1/fps;this.renderPose();}
 }
 renderPose(){
  const pose=this.data.sample(this.name,this.time);
  if(this.mixFrom){const f=clamp(this.mixElapsed/this.mixDuration,0,1);this.data.mix(this.mixFrom,pose,f);if(f>=1)this.mixFrom=null;}
  this.skeleton.apply(pose);this.draw();this.frames++;this.texture?.source.update();
  // A second presentation of the SAME evaluated pose, only for the outside host.
  // The framed reel texture above remains unchanged, including its original crop.
  if(this.unframedView?.enabled){this.draw(this.unframedView);this.unframedView.texture.source.update();this.unframedView.frames++;}
 }
 draw(target=this){
  const ctx=target.ctx,b=target.bounds,sx=target.canvas.width/b.width,sy=target.canvas.height/b.height;
  ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,target.canvas.width,target.canvas.height);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  ctx.setTransform(sx,0,0,-sy,-b.x*sx,(b.y+b.height)*sy);let clipping=false,clipEnd=null;
  for(const slot of this.data.slots){
   const name=this.skeleton.pose.names[slot.index];const a=name?this.data.attachments.get(slot.name+'\0'+name):null;
   if(a?.type==='clipping'){
    if(target.clipping===false)continue;
    if(!clipping){const v=this.skeleton.vertices(a,slot);ctx.save();ctx.beginPath();ctx.moveTo(v[0],v[1]);for(let i=2;i<v.length;i+=2)ctx.lineTo(v[i],v[i+1]);ctx.closePath();ctx.clip();clipping=true;clipEnd=a.end;}
    continue;
   }
   // Remove only portrait decoration from the freestanding view. Body shadows,
   // armor, feet and the hand's animated flame remain part of the authored rig.
   if(a&&(target.decorations||!/(^character_symbol_anubis_(?:bg2?|shadow)$|_frame|overall_shadow|^light$|^coin_light)/.test(slot.name))){
    const rgba=this.skeleton.pose.colors[slot.index],alpha=rgba[3]*a.color[3];
    if(alpha>.003){ctx.globalAlpha=alpha;ctx.globalCompositeOperation=slot.blend==='additive'?'lighter':'source-over';this.drawAttachment(a,this.skeleton.vertices(a,slot),ctx);}
   }
   if(clipping&&slot.name===clipEnd){ctx.restore();clipping=false;}
  }
  if(clipping)ctx.restore();ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
 }
 drawAttachment(a,v,ctx=this.ctx){
  const img=a.region.image;
  for(const t of a.triData){
   const x0=v[t.ia],y0=v[t.ia+1],x1=v[t.ib],y1=v[t.ib+1],x2=v[t.ic],y2=v[t.ic+1];
   // UV-to-world affine transform, one per original mesh triangle.
   const aa=(x0*(t.v1-t.v2)+x1*(t.v2-t.v0)+x2*(t.v0-t.v1))*t.inv;
   const bb=(y0*(t.v1-t.v2)+y1*(t.v2-t.v0)+y2*(t.v0-t.v1))*t.inv;
   const cc=(x0*(t.u2-t.u1)+x1*(t.u0-t.u2)+x2*(t.u1-t.u0))*t.inv;
   const dd=(y0*(t.u2-t.u1)+y1*(t.u0-t.u2)+y2*(t.u1-t.u0))*t.inv;
   const tx=x0-aa*t.u0-cc*t.v0,ty=y0-bb*t.u0-dd*t.v0;
   if(Math.abs(aa*dd-bb*cc)<1e-9)continue;
   // Expand the clip very slightly in world space to avoid antialiased cracks.
   const mx=(x0+x1+x2)/3,my=(y0+y1+y2)/3;
   const pad=(x,y)=>{const len=Math.hypot(x-mx,y-my)||1;return [x+(x-mx)*1.05/len,y+(y-my)*1.05/len];};
   const p0=pad(x0,y0),p1=pad(x1,y1),p2=pad(x2,y2);
   ctx.save();ctx.beginPath();ctx.moveTo(...p0);ctx.lineTo(...p1);ctx.lineTo(...p2);ctx.closePath();ctx.clip();ctx.transform(aa,bb,cc,dd,tx,ty);ctx.drawImage(img,0,0);ctx.restore();
  }
 }
 sprite({unframed=false}={}){
  let view=this;
  if(unframed){
   if(!this.unframedView){
    // Fixed full-body bounds cover BOTH authored clips, feet and flame included.
    // Never auto-fit each pose: that would visibly slide the feet on the floor.
    const canvas=document.createElement('canvas');canvas.width=700;canvas.height=1260;
    view=this.unframedView={canvas,ctx:canvas.getContext('2d',{alpha:true}),bounds:{x:-240,y:-700,width:700,height:1260},decorations:false,clipping:false,enabled:true,frames:1};
    this.draw(view);view.texture=PIXI.Texture.from(canvas);
   }
   view=this.unframedView;
  }
  const sprite=new PIXI.Sprite(view.texture);sprite.anchor.set(-view.bounds.x/view.bounds.width,(view.bounds.y+view.bounds.height)/view.bounds.height);this.sprites.add(sprite);sprite.on('destroyed',()=>this.sprites.delete(sprite));return sprite;
 }
 stats(){return {version:'3.8.99',animation:this.name,time:this.time,bones:this.skeleton.bones.length,slots:this.data.slots.length,meshes:this.data.meshCount,triangles:this.data.triangleCount,frames:this.frames,actions:this.actionCount,reason:this.lastReason,events:this.events.slice(),views:this.sprites.size,playback:'live bones + weighted meshes + deform timelines'};}
 destroy(){if(this.disposed)return;this.disposed=true;for(const s of this.sprites)if(!s.destroyed)s.destroy();this.sprites.clear();this.texture.destroy(true);if(this.unframedView){this.unframedView.texture.destroy(true);this.unframedView.canvas.width=this.unframedView.canvas.height=1;this.unframedView=null;}this.canvas.width=this.canvas.height=1;}
}
function create(exported,image){return new RigData(exported,image);}
global.KemetSpine38={create,Player,Skeleton,version:'3.8.99',_test:{bezier,interval,value}};
})(window);
