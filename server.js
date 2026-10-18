const http=require('http'),fs=require('fs'),cr=require('crypto'),{WebSocketServer}=require('ws');
const PORT=process.env.PORT||8080,KEY=process.env.ADMIN_KEY||'',F=process.env.DATA_FILE||'./accounts.json',ADM=['devczorii','devinfection'],HP=10,DMG=5,WIN=5;
let acc={};try{acc=JSON.parse(fs.readFileSync(F))}catch{}
const save=()=>fs.writeFile(F,JSON.stringify(acc),()=>{});
const hs=(p,s)=>cr.scryptSync(p,s,32).toString('hex');
const pub=a=>({n:a.n,w:a.w,l:a.l,k:a.k,d:a.d,xp:a.xp});
const srv=http.createServer((q,r)=>r.end('TENHP ok')),wss=new WebSocketServer({server:srv});
const P=new Map();let nid=1;
const tx=(p,o)=>{if(p.ws.readyState===1)p.ws.send(JSON.stringify(o))};
const lobby=()=>{const l=[...P.values()].filter(p=>p.a).map(p=>({id:p.id,n:p.a.n,lv:Math.floor(p.a.xp/100)+1,adm:ADM.includes(p.a.n.toLowerCase())?1:0,st:p.m?'game':'lobby'}));P.forEach(p=>p.a&&tx(p,{t:'lob',l}))};
function start(h,g,ar){const m={ar,ps:[h,g],hp:[HP,HP],am:[7,7],last:[0,0],rl:[0,0],dt:[0,0],pos:[{},{}],over:0,dead:[0,0]};h.m=g.m=m;h.i=0;g.i=1;h.inv=g.inv=null;
 [h,g].forEach(p=>tx(p,{t:'go',ar,side:p.i,opp:m.ps[1-p.i].a.n}));sync(m);lobby()}
function sync(m,ev){m.ps.forEach((p,i)=>tx(p,{t:'s',hp:[m.hp[i],m.hp[1-i]],sc:[m.dt[1-i],m.dt[i]],am:m.am[i],ev:ev===undefined?null:(ev===i?'me':'opp')}))}
function end(m,w){if(m.over)return;m.over=1;m.ps.forEach((p,i)=>{const a=p.a,win=i===w;win?a.w++:a.l++;a.k+=m.dt[1-i];a.d+=m.dt[i];a.xp+=(win?30:10)+5*m.dt[1-i];p.m=null;tx(p,{t:'end',win,sc:[m.dt[1-i],m.dt[i]],a:pub(a)})});save();lobby()}
wss.on('connection',ws=>{const p={ws,id:nid++,a:null,m:null,inv:null,t:0};P.set(p.id,p);
 ws.on('message',d=>{let m;try{m=JSON.parse(d)}catch{return}if(typeof m!=='object'||!m)return;
  if(m.t==='auth'){if(Date.now()-p.t<600)return;p.t=Date.now();const n=String(m.n||''),k=n.toLowerCase(),pw=String(m.p||'');
   if(!/^[A-Za-z0-9_]{3,16}$/.test(n)||pw.length<4||pw.length>64)return tx(p,{t:'err',m:'Nazwa 3–16 znaków (litery, cyfry, _), hasło min. 4'});
   if(m.m==='reg'){if(acc[k])return tx(p,{t:'err',m:'Nazwa zajęta'});if(ADM.includes(k)&&(!KEY||m.k!==KEY))return tx(p,{t:'err',m:'Ta nazwa wymaga klucza admina',key:1});
    const s=cr.randomBytes(8).toString('hex');acc[k]={n,s,h:hs(pw,s),w:0,l:0,k:0,d:0,xp:0};save()}
   const a=acc[k];if(!a||a.h!==hs(pw,a.s))return tx(p,{t:'err',m:'Zła nazwa lub hasło'});
   if([...P.values()].some(o=>o!==p&&o.a===a))return tx(p,{t:'err',m:'Konto już zalogowane'});
   p.a=a;tx(p,{t:'ok',a:pub(a),adm:ADM.includes(k)?1:0});return lobby()}
  if(!p.a)return;const m0=p.m;
  if(m.t==='inv'){const o=P.get(m.to);if(o&&o!==p&&o.a&&!o.m&&!p.m){o.inv={from:p.id,ar:m.ar|0};tx(o,{t:'inv',fid:p.id,from:p.a.n,ar:m.ar|0})}}
  else if(m.t==='acc'){const o=P.get(m.to);if(o&&!o.m&&!p.m&&p.inv&&p.inv.from===o.id)start(o,p,p.inv.ar)}
  else if(m.t==='dec'){const o=P.get(m.to);if(o)tx(o,{t:'dec'});p.inv=null}
  else if(m.t==='ann'&&ADM.includes(p.a.n.toLowerCase()))P.forEach(o=>tx(o,{t:'ann',from:p.a.n,x:String(m.x).slice(0,80)}));
  else if(m0&&!m0.over){const i=p.i,j=1-i,o=m0.ps[j];
   if(m.t==='p'){m0.pos[i]=m.v;tx(o,{t:'p',v:m.v})}
   else if(m.t==='f'&&m0.hp[i]>0&&m0.hp[j]>=0&&!m0.dead[i]){const n=Date.now();if(n-m0.last[i]<340||m0.rl[i]||m0.am[i]<=0)return;m0.last[i]=n;m0.am[i]--;tx(o,{t:'f',o:m.o,d:m.d,e:m.e});
    if(m.h&&!m0.dead[j]){const a=m0.pos[i],b=m0.pos[j];if(a.x===undefined||b.x===undefined||Math.hypot(a.x-b.x,a.z-b.z)<70){m0.hp[j]-=DMG;
     if(m0.hp[j]<=0){m0.dead[j]=1;m0.dt[j]++;sync(m0,j);if(m0.dt[j]>=WIN)return end(m0,i);setTimeout(()=>{if(m0.over)return;m0.hp[j]=HP;m0.am[j]=7;m0.dead[j]=0;tx(m0.ps[j],{t:'rs'});sync(m0)},2000);return}}}
    sync(m0)}
   else if(m.t==='rl'&&m0.am[i]<7&&!m0.rl[i]){m0.rl[i]=1;setTimeout(()=>{m0.rl[i]=0;m0.am[i]=7;sync(m0)},1600)}
   else if(m.t==='leave')end(m0,j)}});
 ws.on('close',()=>{if(p.m)end(p.m,1-p.i);P.delete(p.id);lobby()})});
srv.listen(PORT,()=>console.log('TENHP :'+PORT));
