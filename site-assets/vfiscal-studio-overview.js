/* Private studio-wide overview: data retrieved only through existing authorized admin call. */
if(/\/vfiscal-admin(?:\.html)?$/.test(location.pathname)){
const root=document.createElement('section');root.id='vf-studio-overview';
root.innerHTML='<div class="vfo-head"><div><h2>Panoramica dello Studio</h2><p>Il colpo d’occhio su tutti i clienti. Il dettaglio individuale rimane più sotto.</p></div><div class="vfo-controls"><select id="vfo-year" aria-label="Anno fiscale"></select><button id="vfo-refresh">↻ Aggiorna</button></div></div><p id="vfo-state"></p><div class="vfo-filter"><button class="active" data-vfo="all">Tutti</button><button data-vfo="paid">Paganti</button><button data-vfo="virga_client">Inclusi</button></div><div id="vfo-kpis" class="vfo-metrics"></div><div id="vfo-coverage" class="vfo-coverage"></div><div class="vfo-card"><h3>Incassi mensili</h3><p>Blu: paganti · Verde: inclusi dello Studio</p><div id="vfo-chart"></div><p class="vfo-note">Il saldo iniziale senza data rientra negli incassi totali, non nelle barre mensili.</p></div><div class="vfo-card"><h3>Clienti e andamento fiscale</h3><p>Ordinati per incassi. Seleziona Dettaglio solo quando serve.</p><div id="vfo-table"></div></div>';
const dom=id=>root.querySelector('#'+id);
const valid=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
const cash=v=>valid(v)?new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(+v):'—';
const n=v=>valid(v)?Math.max(0,+v):0;
const yr=dom('vfo-year');const now=new Date().getFullYear();
for(let y=2026;y<=Math.min(2035,Math.max(2029,now+3));y++){
 const o=document.createElement('option');o.value=y;o.textContent=y;yr.append(o);
}
yr.value=Math.max(2026,Math.min(now,2035));
let data=null,filter='all',busy=false;
const rows=()=>Array.isArray(data?.customers)?data.customers.filter(x=>filter==='all'||x.access_type===filter):[];
function kpi(parent,name,value,note){
 const box=document.createElement('div');box.className='vfo-metric';
 for(const [tag,t] of [['b',name],['strong',value],['small',note]]){
  const e=document.createElement(tag);e.textContent=t;box.append(e);
 }parent.append(box);
}
function chart(list){
 const host=dom('vfo-chart');host.replaceChildren();
 const months=['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
 const bins=Array.from({length:12},()=>({paid:0,free:0}));
 for(const c of list){
  if(!Array.isArray(c.monthly_receipts)||c.monthly_receipts.length!==12)continue;
  c.monthly_receipts.forEach((v,i)=>bins[i][c.access_type==='paid'?'paid':'free']+=n(v));
 }
 const max=Math.max(0,...bins.map(x=>x.paid+x.free));
 if(!max){const msg=document.createElement('div');msg.className='vfo-empty';msg.textContent='Non ci sono ancora movimenti mensili datati per questi clienti.';host.append(msg);return;}
 const graph=document.createElement('div');graph.className='vfo-chart';
 bins.forEach((v,i)=>{
  const col=document.createElement('div');col.className='vfo-month';
  const bar=document.createElement('div');bar.className='vfo-bar';
  const total=v.paid+v.free;bar.style.height=Math.max(2,total/max*128)+'px';
  const paid=document.createElement('i');paid.style.height=(total?v.paid/total*100:0)+'%';
  const free=document.createElement('i');free.className='green';free.style.height=(total?v.free/total*100:0)+'%';
  bar.append(paid,free);const label=document.createElement('small');label.textContent=months[i];
  col.title=months[i]+': paganti '+cash(v.paid)+' · inclusi '+cash(v.free);
  col.append(bar,label);graph.append(col);
 });host.append(graph);
}
function table(list){
 const host=dom('vfo-table');host.replaceChildren();
 if(!list.length){host.textContent='Nessun cliente per questo filtro.';return;}
 const wrap=document.createElement('div');wrap.className='vfo-table-wrap';
 const t=document.createElement('table'),h=document.createElement('thead'),hr=document.createElement('tr');
 ['Cliente','Tipo','Incassi','Imposta','Contributi',''].forEach(text=>{const c=document.createElement('th');c.textContent=text;hr.append(c)});
 h.append(hr);t.append(h);const body=document.createElement('tbody');
 list.forEach(c=>{
  const tr=document.createElement('tr');
  [c.email||'—',c.access_type==='paid'?'Pagante':'Incluso',
   c.has_data?cash(c.receipts_total):'Dati assenti',
   c.has_data?cash(c.tax_estimated):'—',c.has_data?cash(c.social_estimated):'—'
  ].forEach(value=>{const td=document.createElement('td');td.textContent=value;tr.append(td)});
  const cell=document.createElement('td'),button=document.createElement('button');button.textContent='Dettaglio';
  button.addEventListener('click',()=>{
   const select=document.getElementById('vf-finance-user');
   if(!select)return;
   select.value=c.user_id;select.dispatchEvent(new Event('change',{bubbles:true}));
   document.getElementById('vf-studio-finance')?.scrollIntoView({behavior:'smooth'});
  });cell.append(button);tr.append(cell);body.append(tr);
 });t.append(body);wrap.append(t);host.append(wrap);
}
function render(){
 if(!data)return;
 const list=rows(),have=list.filter(x=>x.has_data);
 const tax=have.filter(x=>valid(x.tax_estimated)),social=have.filter(x=>valid(x.social_estimated));
 const full=have.filter(x=>valid(x.tax_estimated)&&valid(x.social_estimated));
 const container=dom('vfo-kpis');container.replaceChildren();
 const paid=list.filter(x=>x.access_type==='paid'&&['active','trialing'].includes(x.status)).length;
 const free=list.filter(x=>x.access_type==='virga_client'&&x.status==='active').length;
 kpi(container,'Clienti',String(list.length),paid+' paganti attivi · '+free+' inclusi attivi');
 kpi(container,'Incassi registrati',have.length?cash(have.reduce((s,x)=>s+n(x.receipts_total),0)):'—',have.length+' su '+list.length+' con dati');
 kpi(container,'Imposta stimata',tax.length?cash(tax.reduce((s,x)=>s+n(x.tax_estimated),0)):'—',tax.length+' clienti con dato');
 kpi(container,'Contributi stimati',social.length?cash(social.reduce((s,x)=>s+n(x.social_estimated),0)):'—',social.length+' clienti con dato');
 kpi(container,'Totale carico fiscale',full.length?cash(full.reduce((s,x)=>s+n(x.tax_estimated)+n(x.social_estimated),0)):'—',full.length+' clienti con stime complete');
 kpi(container,'Clienti senza dati',String(list.length-have.length),'Non ancora sincronizzati');
 dom('vfo-coverage').textContent='Anno '+data.year+' · dati disponibili per '+have.length+' clienti su '+list.length+'. I totali sono parziali se mancano gli altri dati.';
 chart(have);table(list);
 dom('vfo-state').textContent='Aggiornato: '+new Date(data.generated_at).toLocaleString('it-IT');
}
async function load(){
 if(busy||document.hidden||typeof window.vfStudioAdminCall!=='function')return;
 busy=true;dom('vfo-refresh').disabled=true;
 try{
  data=await window.vfStudioAdminCall({action:'studio_overview',year:Number(yr.value)});
  if(!root.isConnected){
   const detail=document.getElementById('vf-studio-finance');
   const main=document.querySelector('main');
   const parent=main||detail?.parentElement||document.body;
   parent.insertBefore(root,main?parent.firstChild:detail||parent.firstChild);
  }
  root.style.display='block';render();
 }catch(e){if(root.isConnected)dom('vfo-state').textContent=e.message||'Dati non disponibili'}
 finally{busy=false;dom('vfo-refresh').disabled=false}
}
yr.addEventListener('change',load);dom('vfo-refresh').addEventListener('click',load);
root.querySelectorAll('[data-vfo]').forEach(button=>button.addEventListener('click',()=>{
 filter=button.dataset.vfo;root.querySelectorAll('[data-vfo]').forEach(x=>x.classList.toggle('active',x===button));render();
}));
window.addEventListener('vf-studio-admin-ready',load);
window.addEventListener('vf-studio-admin-signed-out',()=>{data=null;root.style.display='none'});
setInterval(()=>{if(!data||Date.now()-new Date(data.generated_at).getTime()>120000)load()},12000);
setTimeout(load,1500);
}