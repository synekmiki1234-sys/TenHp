const http=require('http'),fs=require('fs'),cr=require('crypto'),{WebSocketServer}=require('ws');
const PORT=process.env.PORT||8080,KEY=process.env.ADMIN_KEY||'',F=process.env.DATA_FILE||'./accounts.json',ADM=['devczorii','devinfection'],HP=10,DMG=5,WIN=5;
const UU=process.env.UPSTASH_REDIS_REST_URL,UT=process.env.UPSTASH_REDIS_REST_TOKEN;let acc={};
async function load(){try{if(UU){const r=await fetch(UU+'/get/tenhp',{headers:{Authorization:'Bearer '+UT}}).then(r=>r.json());if(r.result)acc=JSON.parse(r.result)}else acc=JSON.parse(fs.readFileSync(F))}catch(e){console.log('load',e.message)}console.log('accounts:',Object.keys(acc).length)}
let stm=0;const save=()=>{clearTimeout(stm);stm=setTimeout(()=>{const s=JSON.stringify(acc);if(UU)fetch(UU+'/set/tenhp',{method:'POST',headers:{Authorization:'Bearer '+UT},body:s}).catch(()=>{});else fs.writeFile(F,s,()=>{})},800)};
const hs=(p,s)=>cr.scryptSync(p,s,32).toString('hex');
const REQ=[],hsh=s=>cr.createHash('sha256').update(s).digest('hex');
const ACH=[['first',a=>a.k>=1,1],['w1',a=>a.w>=1,2],['w5',a=>a.w>=5,3],['flaw',a=>a.fl,4],['w25',a=>a.w>=25,5],['k50',a=>a.k>=50,0]];
function ach(a){a.ach=a.ach||[];a.inv=a.inv||[0];const nw=[];ACH.forEach(([id,f,s])=>{if(!a.ach.includes(id)&&f(a)){a.ach.push(id);nw.push(id);if(s){if(!a.inv.includes(s))a.inv.push(s)}else a.xp+=100}});return nw}
const pub=a=>({n:a.n,w:a.w,l:a.l,k:a.k,d:a.d,xp:a.xp,c:a.c,inv:a.inv,eq:a.eq,ach:a.ach||[]});
const srv=http.createServer((q,r)=>{const u=q.url.split('?')[0].slice(1),f=/^[\w.-]+\.glb$/.test(u)?[u,'model/gltf-binary']:['index.html','text/html; charset=utf-8'];fs.readFile(__dirname+'/'+f[0],(e,d)=>{if(e)return r.end('TENHP ok');r.writeHead(200,{'Content-Type':f[1]});r.end(d)})}),wss=new WebSocketServer({server:srv});
const P=new Map();let nid=1;
const tx=(p,o)=>{if(p.ws.readyState===1)p.ws.send(JSON.stringify(o))};
const lobby=()=>{const l=[...P.values()].filter(p=>p.a).map(p=>({id:p.id,n:p.a.n,lv:Math.floor(p.a.xp/100)+1,adm:ADM.includes(p.a.n.toLowerCase())?1:0,st:p.m?'game':'lobby'}));P.forEach(p=>p.a&&tx(p,{t:'lob',l}))};
function start(h,g,ar){const m={ar,ps:[h,g],hp:[HP,HP],am:[7,7],last:[0,0],rl:[0,0],dt:[0,0],pos:[{},{}],over:0,dead:[0,0]};h.m=g.m=m;h.i=0;g.i=1;h.inv=g.inv=null;
 [h,g].forEach(p=>tx(p,{t:'go',ar,side:p.i,opp:m.ps[1-p.i].a.n,skin:p.a.eq,os:m.ps[1-p.i].a.eq}));sync(m);lobby()}
function sync(m,ev){m.ps.forEach((p,i)=>tx(p,{t:'s',hp:[m.hp[i],m.hp[1-i]],sc:[m.dt[1-i],m.dt[i]],am:m.am[i],ev:ev===undefined?null:(ev===i?'me':'opp')}))}
function end(m,w){if(m.over)return;m.over=1;m.ps.forEach((p,i)=>{const a=p.a,win=i===w;win?a.w++:a.l++;a.k+=m.dt[1-i];a.d+=m.dt[i];a.xp+=(win?30:10)+5*m.dt[1-i];const gc=0;a.c+=gc;if(win&&m.dt[i]===0)a.fl=1;const nw=ach(a);p.m=null;tx(p,{t:'end',win,sc:[m.dt[1-i],m.dt[i]],a:pub(a),g:gc,nw})});save();lobby()}
wss.on('connection',ws=>{ws.al=1;ws.on('pong',()=>ws.al=1);const p={ws,id:nid++,a:null,m:null,inv:null,t:0};P.set(p.id,p);
 ws.on('message',d=>{let m;try{m=JSON.parse(d)}catch{return}if(typeof m!=='object'||!m)return;
  if(m.t==='auth'||m.t==='acode'||m.t==='asel'){if(Date.now()-p.t<500)return;p.t=Date.now();
   const fin=(a,r)=>{const o=[...P.values()].find(o=>o!==p&&o.a===a);if(o){o.a=null;try{o.ws.close()}catch{}}if(a.n.toLowerCase()==='devinfection')a.n='DevINFECTION';p.a=a;a.c=a.c??100;a.inv=a.inv||[0];a.eq=a.eq||0;let tk;if(r){tk=cr.randomBytes(24).toString('hex');a.tks=[...(a.tks||[]),hsh(tk)].slice(-5);save()}const ad=ADM.includes(a.n.toLowerCase());tx(p,{t:'ok',a:pub(a),adm:ad?1:0,tk});if(ad)tx(p,{t:'rql',l:REQ});lobby()};
   if(m.t==='acode'){if(KEY&&m.k===KEY)tx(p,{t:'who'});else tx(p,{t:'err',m:'Zły kod admina'});return}
   if(m.t==='asel'){const n=ADM.find(x=>x===String(m.n).toLowerCase());if(!KEY||m.k!==KEY||!n)return tx(p,{t:'err',m:'Zły kod admina'});let a=acc[n];if(!a){const s=cr.randomBytes(8).toString('hex');a=acc[n]={n:n==='devczorii'?'DevCzorii':'DevINFECTION',s,h:hs(cr.randomBytes(16).toString('hex'),s),w:0,l:0,k:0,d:0,xp:0,c:100,inv:[0],eq:0};save()}return fin(a,m.r)}
   const n=String(m.n||''),k=n.toLowerCase(),pw=String(m.p||'');
   if(m.m==='tok'){const a=acc[k];if(a&&a.tks&&a.tks.includes(hsh(String(m.tk))))return fin(a,0);return tx(p,{t:'err',m:'Sesja wygasła — zaloguj się ponownie',tok:1})}
   if(!/^[A-Za-z0-9_]{3,16}$/.test(n)||pw.length<4||pw.length>64)return tx(p,{t:'err',m:'Nazwa 3–16 znaków (litery, cyfry, _), hasło min. 4'});
   if(m.m==='reg'){if(acc[k])return tx(p,{t:'err',m:'Nazwa zajęta'});if(ADM.includes(k)&&(!KEY||m.k!==KEY))return tx(p,{t:'err',m:'Ta nazwa wymaga klucza admina',key:1});const s=cr.randomBytes(8).toString('hex');acc[k]={n,s,h:hs(pw,s),w:0,l:0,k:0,d:0,xp:0,c:100,inv:[0],eq:0};save()}
   const a=acc[k];if(!a||a.h!==hs(pw,a.s))return tx(p,{t:'err',m:'Zła nazwa lub hasło'});return fin(a,m.r)}
  if(!p.a)return;const m0=p.m;
  if(m.t==='inv'){const o=P.get(m.to);if(o&&o!==p&&o.a&&!o.m&&!p.m){o.inv={from:p.id,ar:(m.ar>=0&&m.ar<8?m.ar|0:0)};tx(o,{t:'inv',fid:p.id,from:p.a.n,ar:(m.ar>=0&&m.ar<8?m.ar|0:0)})}}
  else if(m.t==='acc'){const o=P.get(m.to);if(o&&!o.m&&!p.m&&p.inv&&p.inv.from===o.id)start(o,p,p.inv.ar)}
  else if(m.t==='dec'){const o=P.get(m.to);if(o)tx(o,{t:'dec'});p.inv=null}
  else if(m.t==='ann'&&ADM.includes(p.a.n.toLowerCase()))P.forEach(o=>tx(o,{t:'ann',from:p.a.n,x:String(m.x).slice(0,80)}));
  else if(m.t==='req'&&false){if(Date.now()-(p.rq||0)<60000)return tx(p,{t:'note',x:'Poczekaj chwilę przed kolejną prośbą'});p.rq=Date.now();const ads=[...P.values()].filter(o=>o.a&&ADM.includes(o.a.n.toLowerCase()));if(!REQ.some(r=>r.n===p.a.n))REQ.push({id:p.id,n:p.a.n});ads.forEach(o=>tx(o,{t:'rq',id:p.id,n:p.a.n}));tx(p,{t:'note',x:ads.length?'Wysłano prośbę do admina':'Prośba zapisana — admin zobaczy ją po wejściu'})}
  else if(m.t==='give'&&false&&ADM.includes(p.a.n.toLowerCase())){const t=acc[String(m.n).toLowerCase()],v=Math.max(1,Math.min(1e6,m.v|0));if(!t)return tx(p,{t:'note',x:'Nie ma takiego gracza'});t.c=(t.c||0)+v;save();const q=REQ.findIndex(r=>r.n===t.n);if(q>=0)REQ.splice(q,1);const o=[...P.values()].find(o=>o.a===t);if(o)tx(o,{t:'acc',a:pub(t),x:'Admin '+p.a.n+' dał Ci '+v+' 🪙'});tx(p,{t:'note',x:'Dodano '+v+' 🪙 dla '+t.n});P.forEach(z=>z.a&&ADM.includes(z.a.n.toLowerCase())&&tx(z,{t:'rql',l:REQ}))}
  else if(m.t==='forget'){p.a.tks=(p.a.tks||[]).filter(h=>h!==hsh(String(m.tk)));save()}
  else if(m.t==='crate'&&false){p.a.c-=100;let r=Math.random()*100,s=1;const W=[47,28,15,8,2];for(let i=0;i<5;i++){if(r<W[i]){s=i+1;break}r-=W[i]}const dup=p.a.inv.includes(s);if(dup)p.a.c+=40;else p.a.inv.push(s);save();tx(p,{t:'crate',s,dup,a:pub(p.a)})}
  else if(m.t==='eq'&&p.a.inv.includes(m.s|0)){p.a.eq=m.s|0;save();tx(p,{t:'acc',a:pub(p.a)})}
  else if(m0&&!m0.over){const i=p.i,j=1-i,o=m0.ps[j];
   if(m.t==='p'){m0.pos[i]=m.v;tx(o,{t:'p',v:m.v})}
   else if(m.t==='f'&&m0.hp[i]>0&&m0.hp[j]>=0&&!m0.dead[i]){const n=Date.now();if(n-m0.last[i]<340||m0.rl[i]||m0.am[i]<=0)return;m0.last[i]=n;m0.am[i]--;tx(o,{t:'f',o:m.o,d:m.d,e:m.e});
    if(m.h&&!m0.dead[j]){const a=m0.pos[i],b=m0.pos[j];if(a.x===undefined||b.x===undefined||Math.hypot(a.x-b.x,a.z-b.z)<70){m0.hp[j]-=DMG;
     if(m0.hp[j]<=0){m0.dead[j]=1;m0.dt[j]++;sync(m0,j);if(m0.dt[j]>=WIN)return end(m0,i);setTimeout(()=>{if(m0.over)return;m0.hp[j]=HP;m0.am[j]=7;m0.dead[j]=0;tx(m0.ps[j],{t:'rs'});sync(m0)},2000);return}}}
    sync(m0)}
   else if(m.t==='rl'&&m0.am[i]<7&&!m0.rl[i]){m0.rl[i]=1;setTimeout(()=>{m0.rl[i]=0;m0.am[i]=7;sync(m0)},1600)}
   else if(m.t==='leave')end(m0,j)}});
 ws.on('close',()=>{if(p.m)end(p.m,1-p.i);P.delete(p.id);lobby()})});
setInterval(()=>wss.clients.forEach(w=>{if(!w.al)return w.terminate();w.al=0;w.ping()}),25000);
load().then(()=>srv.listen(PORT,()=>console.log('TENHP :'+PORT)));
