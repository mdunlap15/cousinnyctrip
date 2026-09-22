import fs from 'node:fs'; import { JSDOM } from 'jsdom';
const root='/home/user/cousinnyctrip'; const read=(p)=>fs.readFileSync(root+'/'+p,'utf8');
const dom=new JSDOM(read('index.html'),{url:'https://x.test/',runScripts:'outside-only',pretendToBeVisual:true});
const {window}=dom; window.matchMedia=()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});
window.fetch=()=>Promise.resolve({ok:true,json:async()=>({daily:null})}); window.scrollTo=()=>{}; window.Element.prototype.scrollIntoView=()=>{}; window.requestAnimationFrame=(cb)=>setTimeout(cb,0);
for(const f of ['config.js','data/geo.js','data/plan.js','data/places.js','data/guide.js','app.js']) window.eval(read(f));
const N=window.NYC,T=window.TRIP,G=window.GEO;
const hm=(m)=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
for(const k of (process.argv[2]||'d2,d6').split(',')){
  const rows=N.agReflow(k,N.agIds(k)); const st=N.dayStats(k,rows);
  console.log('\n'+k);
  rows.forEach((r,i)=>{
    const p=r.it.p;
    const hub=p?G.nearestHub(p[0],p[1]):null;
    console.log(`  ${hm(r.start)} +${String(r.gap).padStart(3)}m ${(r.mode||'').padEnd(7)} ${(r.it.en||'').slice(0,42).padEnd(44)} ${p?p.map(x=>x.toFixed(4)).join(','):'-'} hub=${hub?hub.hub.key+'/'+hub.km.toFixed(2)+'km':'-'}`);
  });
  console.log(`  load=${st.load} travel=${st.travel} lvl=${st.lvl} home=${hm(st.homeBy)}`);
}
process.exit(0);
