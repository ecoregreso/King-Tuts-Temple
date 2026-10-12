/* Crowns of Kemet — deterministic, renderer-independent demo game math. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.KemetMath=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const VERSION=1, START_UNITS=1000000;
const LEVELS=Object.freeze([1,2,3,5,10]);
const DENOMS=Object.freeze([1,2,5,10]);
const SYMBOLS=Object.freeze([
 {id:'ankh',name:'Golden Ankh',weight:23,freeWeight:24,pays:[10,27,85]},
 {id:'eye',name:'Eye of Horus · Animated',weight:20,freeWeight:21,pays:[14,34,119]},
 {id:'necklace',name:'Royal Collar',weight:17,freeWeight:18,pays:[17,51,170]},
 {id:'anubis',name:'Anubis · Living',weight:5,freeWeight:2,pays:[34,136,510]},
 {id:'wild',name:'Crown · Wild',weight:2,freeWeight:2,pays:[85,340,1700]},
 {id:'scatter',name:'Emerald Scarab · Animated',weight:2,freeWeight:2,pays:[]},
 {id:'pharaoh',name:'Pharaoh',weight:3,freeWeight:3,pays:[54,204,884]},
 {id:'cleopatra',name:'Cleopatra',weight:3,freeWeight:3,pays:[48,163,714]},
 {id:'anubis_tile',name:'Anubis Guardian Tile',weight:3,freeWeight:2,pays:[41,136,595]},
 {id:'mummy',name:'Royal Mummy',weight:3,freeWeight:3,pays:[37,109,476]},
 {id:'scarab_blue',name:'Azure Scarab',weight:3,freeWeight:3,pays:[27,75,306]},
 {id:'eye_blue',name:'Azure Eye',weight:3,freeWeight:3,pays:[24,68,272]},
 {id:'royal_ankh',name:'Royal Ankh',weight:3,freeWeight:3,pays:[27,82,340]},
 {id:'lotus',name:'Lotus of the Nile',weight:3,freeWeight:4,pays:[31,92,374]},
 {id:'cobra',name:'Royal Cobra',weight:3,freeWeight:3,pays:[34,109,476]},
 {id:'treasure',name:'Pharaoh’s Treasure',weight:3,freeWeight:3,pays:[41,136,612]},
 {id:'bonus',name:'Treasure Temple · BONUS',weight:1,freeWeight:1,pays:[]}
].map(x=>Object.freeze({...x,pays:Object.freeze(x.pays)})));
const FEATURE_SYMBOLS=Object.freeze(['scatter','bonus']);
const isFeature=id=>FEATURE_SYMBOLS.includes(id);
const MAP=Object.freeze(Object.fromEntries(SYMBOLS.map(s=>[s.id,s])));
const LINES=Object.freeze([
 [1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],
 [0,0,1,2,2],[2,2,1,0,0],[1,0,0,0,1],[1,2,2,2,1],[0,1,1,1,0],
 [2,1,1,1,2],[1,0,1,2,1],[1,2,1,0,1],[0,1,0,1,0],[2,1,2,1,2],
 [1,1,0,1,1],[1,1,2,1,1],[0,2,0,2,0],[2,0,2,0,2],[0,2,2,2,0]
].map(Object.freeze));
const START_GRID=Object.freeze([
 ['ankh','eye','necklace'],['eye','anubis','ankh'],['necklace','wild','eye'],['ankh','necklace','scatter'],['scatter','eye','ankh']
].map(Object.freeze));
const clone=g=>g.map(col=>[...col]);
function validateGrid(g){if(!Array.isArray(g)||g.length!==5||g.some(c=>!Array.isArray(c)||c.length!==3||c.some(id=>!MAP[id])))throw new Error('Expected five reels, three rows, and known symbol IDs.');return g;}
function randomInt(n){
 if(!Number.isSafeInteger(n)||n<1||n>4294967296)throw new RangeError('Invalid random range.');
 if(!globalThis.crypto?.getRandomValues)throw new Error('This browser does not provide secure random values.');
 const a=new Uint32Array(1),limit=Math.floor(4294967296/n)*n;let value;
 do{crypto.getRandomValues(a);value=a[0];}while(value>=limit);
 return value%n;
}
function seeded(seed){let t=seed>>>0;return n=>{t+=0x6D2B79F5;let x=t;x=Math.imul(x^(x>>>15),x|1);x^=x+Math.imul(x^(x>>>7),x|61);return Math.floor(((x^(x>>>14))>>>0)/4294967296*n);};}
function pick(rng=randomInt,free=false){let n=rng(100);for(const s of SYMBOLS){n-=free?s.freeWeight:s.weight;if(n<0)return s.id;}throw new Error('Symbol weights must total 100.');}
function roll(rng=randomInt,free=false){return Array.from({length:5},()=>Array.from({length:3},()=>pick(rng,free)));}
function awardFree(scatterCount){return scatterCount>=5?16:scatterCount===4?12:scatterCount===3?8:0;}
function evaluate(grid,level=1){
 validateGrid(grid);if(!LEVELS.includes(level))throw new Error('Invalid bet level.');
 const wins=[];let lineCoins=0;const candidates=SYMBOLS.filter(s=>s.pays.length);
 LINES.forEach((line,i)=>{
  let best=null;
  for(const target of candidates){let count=0;while(count<5){const id=grid[count][line[count]];if(id!==target.id&&id!=='wild')break;count++;}
   if(count>=3){const coins=target.pays[count-3]*level;if(!best||coins>best.coins)best={line:i+1,symbol:target.id,count,coins,cells:line.slice(0,count).map((r,c)=>[c,r])};}
  }
  if(best){wins.push(best);lineCoins+=best.coins;}
 });
 const scatters=[];grid.forEach((col,c)=>col.forEach((id,r)=>{if(isFeature(id))scatters.push([c,r]);}));
 const count=scatters.length,totalBet=20*level,scatterMultiplier=count>=5?20:count===4?5:count===3?2:0;
 const scatterCoins=totalBet*scatterMultiplier;
 return {wins,lineCoins,scatterCoins,totalCoins:lineCoins+scatterCoins,scatters,scatterCount:count,freeAward:awardFree(count)};
}
class Session{
 constructor(saved=null,rng=randomInt){
  this.rng=rng;this.state={version:VERSION,balance:START_UNITS,level:1,denom:10,spins:0,free:null,lastGrid:clone(START_GRID)};
  if(saved){
   try{
    if(saved.version!==VERSION||!Number.isSafeInteger(saved.balance)||saved.balance<0||saved.balance>1e14||!LEVELS.includes(saved.level)||!DENOMS.includes(saved.denom)||!Number.isSafeInteger(saved.spins)||saved.spins<0)throw new Error('Invalid saved session.');
    validateGrid(saved.lastGrid);
    if(saved.free){const f=saved.free;if(!Number.isInteger(f.remaining)||f.remaining<1||f.remaining>50||!Number.isInteger(f.played)||f.played<0||f.played+f.remaining>50||!LEVELS.includes(f.level)||!DENOMS.includes(f.denom)||!Number.isSafeInteger(f.win)||f.win<0||!Number.isInteger(f.awarded)||f.awarded!==f.played+f.remaining||f.awarded>50)throw new Error('Invalid saved feature.');}
    this.state=JSON.parse(JSON.stringify(saved));
   }catch(_){/* An invalid local demo save must not prevent boot. */}
  }
 }
 snapshot(){return JSON.parse(JSON.stringify(this.state));}
 setBet(level,denom){if(this.state.free)throw new Error('Bet is locked during free spins.');if(!LEVELS.includes(level)||!DENOMS.includes(denom))throw new Error('Unsupported bet.');this.state.level=level;this.state.denom=denom;}
 play(options={}){
  const s=this.state,free=s.free,isFree=!!free,level=free?free.level:s.level,denom=free?free.denom:s.denom;
  const cost=isFree?0:20*level*denom,before=s.balance;
  if(before<cost)throw new Error('Not enough play coins. Lower the bet or reset demo credits in Settings.');
  const raw=options.grid?clone(validateGrid(options.grid)):roll(this.rng,isFree);
  const expanded=[];
  if(isFree&&free.played===0&&!options.skipGuaranteedGuardian)raw[this.rng(5)][this.rng(3)]='anubis';
  const grid=clone(raw);
  if(isFree)grid.forEach((col,c)=>{if(col.includes('anubis')||col.includes('anubis_tile')){expanded.push(c);grid[c]=['wild','wild','wild'];}});
  const result=evaluate(grid,level),winUnits=result.totalCoins*denom;
  const after=before-cost+winUnits;if(!Number.isSafeInteger(after))throw new Error('Demo balance exceeds safe integer range.');
  s.balance=after;s.spins++;s.lastGrid=clone(grid);
  let started=false,ended=false,retrigger=0,summary=null;
  if(isFree){
   free.remaining--;free.played++;free.win+=winUnits;
   if(result.scatterCount>=3){retrigger=Math.min(3,50-free.played-free.remaining);free.remaining+=retrigger;free.awarded+=retrigger;}
   if(free.remaining===0){summary={...free};s.free=null;ended=true;}
  }else if(result.freeAward){
   s.free={remaining:result.freeAward,played:0,awarded:result.freeAward,level,denom,win:0};started=true;
  }
  return {...result,raw,grid,expanded,isFree,level,denom,cost,before,afterDebit:before-cost,after,winUnits,started,ended,retrigger,summary,feature:s.free?{...s.free}:null};
 }
}
return Object.freeze({VERSION,START_UNITS,LEVELS,DENOMS,SYMBOLS,MAP,FEATURE_SYMBOLS,isFeature,LINES,START_GRID,clone,validateGrid,randomInt,seeded,pick,roll,awardFree,evaluate,Session});
});
