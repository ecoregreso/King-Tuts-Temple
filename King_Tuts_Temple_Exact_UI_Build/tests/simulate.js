/* Reproducible empirical check, NOT theoretical or certified RTP.
   Usage: node tests/simulate.js 100000 20261009 */
'use strict';
const M=require('../math.js');
const cycles=Number(process.argv[2]||100000),seed=Number(process.argv[3]||20261009);
if(!Number.isSafeInteger(cycles)||cycles<1000||cycles>10000000)throw new Error('Choose 1000–10000000 paid cycles.');
const s=new M.Session(null,M.seeded(seed));s.state.balance=1e12;
let sum=0,sum2=0,features=0,paidHits=0,freeSpins=0,maxSpin=0;
for(let i=0;i<cycles;i++){
 let r=s.play(),payout=r.winUnits;const cost=r.cost;
 if(r.winUnits>0)paidHits++;if(r.started)features++;maxSpin=Math.max(maxSpin,r.winUnits/cost);
 while(s.state.free){r=s.play();payout+=r.winUnits;freeSpins++;maxSpin=Math.max(maxSpin,r.winUnits/cost);}
 const multiple=payout/cost;sum+=multiple;sum2+=multiple*multiple;
}
const mean=sum/cycles,variance=(sum2-sum*sum/cycles)/(cycles-1),se=Math.sqrt(variance/cycles);
console.log(JSON.stringify({paidCycles:cycles,seed,simulatedReturn:mean,approximate95PercentInterval:[mean-1.96*se,mean+1.96*se],paidSpinHitRate:paidHits/cycles,features,freeSpins,largestObservedSingleSpinBetMultiple:maxSpin,warning:'Empirical seeded simulation including the complete free-spin feature after each paid trigger. A winning spin can pay less than its cost. Interval is an approximate normal confidence interval, not certification or a guaranteed payout. No certified or exact theoretical RTP is claimed.'},null,2));
