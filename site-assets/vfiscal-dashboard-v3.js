/* vFiscal customer overview: simple, readable, based only on saved fiscal data. */
(function(){
'use strict';
if(!/\/vfiscal-app(?:\.html)?$/.test(location.pathname))return;
const eur=new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'});
const pct=new Intl.NumberFormat('it-IT',{maximumFractionDigits:1});
const months=['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
const valid=v=>v!==undefined&&v!==null&&v!==''&&Number.isFinite(Number(v));
const cash=v=>valid(v)?eur.format(Number(v)):'—';
const n=v=>valid(v)?Math.max(0,Number(v)):0;
const clamp=v=>Math.min(100,Math.max(0,Number.isFinite(v)?v:0));
let panel=null,last='';
const html=[
'<div class="v4-hero"><div><span class="v4-eyebrow">Incassi registrati · <span data-v4="year">—</span></span>',
'<strong data-v4="receipts">—</strong><div class="v4-muted">I tuoi incassi reali, non una previsione.</div></div>',
'<button class="v4-primary" type="button" data-v4-action="receipt">＋ Registra incasso</button></div>',
'<div class="v4-cards">',
'<article class="v4-card"><h3>Tasse e contributi stimati</h3>',
'<p class="v4-muted">Quanto stai maturando con gli incassi registrati.</p>',
'<div class="v4-value blue" data-v4="burden">—</div>',
'<div class="v4-divider"></div>',
'<div class="v4-split"><span><i></i> Imposta sostitutiva</span><strong data-v4="tax">—</strong></div>',
'<div class="v4-split" style="margin-top:9px"><span><i class="green"></i> Contributi</span><strong data-v4="social">—</strong></div>',
'<p class="v4-notice">È un costo stimato dell’anno, non la somma dei prossimi F24.</p></article>',
'<article class="v4-card"><h3>Quanto mettere da parte</h3>',
'<p class="v4-muted">La parte non ancora coperta dal fondo tasse.</p>',
'<div class="v4-value green" data-v4="missing">—</div>',
'<div class="v4-track green"><div data-v4="fundBar"></div></div>',
'<div class="v4-split"><span>Già accantonato</span><strong data-v4="held">—</strong></div>',
'<div class="v4-foot" style="margin-top:14px"><span class="v4-muted" data-v4="fundPct">—</span>',
'<button class="v4-light" type="button" data-v4-action="fund">Gestisci fondo</button></div>',
'<p class="v4-notice">Accantonamento rispetto alle imposte e ai contributi stimati; i saldi e gli acconti hanno scadenze proprie.</p></article>',
'<article class="v4-card"><h3>Limite forfettario</h3>',
'<p class="v4-muted">Il tetto di incassi applicabile all’anno selezionato.</p>',
'<div class="v4-value" data-v4="threshold">—</div>',
'<div class="v4-track" data-v4="thresholdTrack"><div data-v4="thresholdBar"></div></div>',
'<div class="v4-split"><span>Margine rimasto</span><strong data-v4="margin">—</strong></div>',
'<p class="v4-notice" data-v4="thresholdNote">—</p></article>',
'<article class="v4-card"><div class="v4-foot"><div><h3>Incassi mese per mese</h3>',
'<p class="v4-muted">Solo i movimenti che hanno una data.</p></div>',
'<button class="v4-light" type="button" data-v4-action="history">Vedi incassi</button></div>',
'<div data-v4="chart"></div>',
'<p class="v4-notice">I saldi iniziali senza data restano nel totale degli incassi, ma non vengono collocati in un mese arbitrario.</p></article>',
'</div>',
'<div class="v4-foot" style="padding:2px 1px 16px">',
'<span class="v4-muted">Vuoi sapere quando pagare, quanto e perché?</span>',
'<button class="v4-light" type="button" data-v4-action="deadlines">Vai alle scadenze →</button></div>'
].join('');
function field(key){return panel?.querySelector('[data-v4="'+key+'"]')}
function set(key,value){const el=field(key);if(el&&el.textContent!==String(value))el.textContent=value}
function bar(key,value){const el=field(key);if(el)el.style.width=clamp(value)+'%'}
function monthChart(d){
 const host=field('chart');if(!host)return;
 const data=Array.isArray(d.monthly)&&d.monthly.length===12?d.monthly.map(n):null;
 const any=data&&data.some(x=>x>0);
 const signature=JSON.stringify(data);
 if(host.dataset.last===signature)return;
 host.dataset.last=signature;host.replaceChildren();
 if(!any){
   const empty=document.createElement('div');empty.className='v4-blank';
   empty.textContent=n(d.openingBalance)>0?
      'Gli incassi sono presenti come saldo iniziale. Registra i prossimi incassi con data per vedere il grafico.':
      'Nessun incasso datato ancora registrato. Il grafico si compila automaticamente.';
   host.append(empty);return;
 }
 const graph=document.createElement('div');graph.className='v4-chart';
 const max=Math.max(1,...data);
 data.forEach((value,i)=>{
   const col=document.createElement('div');col.className='v4-month';
   const item=document.createElement('div');item.className='v4-bar';
   item.style.height=value?Math.max(3,value/max*95)+'px':'2px';
   col.title=months[i]+': '+cash(value);
   const label=document.createElement('small');label.textContent=months[i];
   col.append(item,label);graph.append(col);
 });
 host.append(graph);
}
function render(d){
 set('year',d.year);
 set('receipts',cash(d.receipts));
 const hasSocial=valid(d.social)&&!(d.socialScheme==='custom'&&n(d.social)===0);
 const complete=valid(d.tax)&&hasSocial;
 const burden=complete?n(d.tax)+n(d.social):null;
 set('tax',cash(d.tax));
 set('social',hasSocial?cash(d.social):'Da completare');
 set('burden',complete?cash(burden):'Da completare');
 const held=n(d.held);
 set('held',cash(held));
 const target=complete&&valid(d.reserveTarget)?n(d.reserveTarget):burden;
 set('missing',target!==null?cash(Math.max(0,target-held)):'—');
 const filled=target!==null?(target>0?held/target*100:100):0;
 bar('fundBar',filled);
 set('fundPct',target===null?'Completa i dati previdenziali':pct.format(filled)+'% del carico stimato coperto');
 const limit=valid(d.threshold)&&Number(d.threshold)>0?Number(d.threshold):null;
 const use=limit?n(d.receipts)/limit*100:0;
 set('threshold',limit?cash(limit):'Da completare');
 set('margin',limit?cash(Math.max(0,limit-n(d.receipts))):'—');
 bar('thresholdBar',use);
 field('thresholdTrack')?.classList.toggle('warning',!!limit&&use>=100);
 const isFirst=String(d.startDate||'').slice(0,4)===String(d.year);
 const prorated=isFirst&&limit&&n(d.thresholdDays)>0&&n(d.yearDays)>0&&n(d.thresholdDays)<n(d.yearDays);
 let note=prorated?'P.IVA aperta il '+d.startDate.split('-').reverse().join('/')+
   ': limite ragguagliato a '+d.thresholdDays+' giorni su '+d.yearDays+'.':
   'Limite annuale ordinario di 85.000 € (quando applicabile).';
 if(!limit)note='Inserisci una data di apertura valida nel Profilo fiscale per calcolare il limite.';
 if(limit&&n(d.receipts)>100000)note+=' Attenzione: oltre 100.000 € può scattare l’uscita immediata.';
 else if(limit&&n(d.receipts)>limit)note+=' Limite ordinario superato: verifica la permanenza nel regime.';
 set('thresholdNote',note);
 monthChart(d);
}
function mount(){
 const host=document.getElementById('mainDashboardContent'),dash=document.getElementById('dashboardPro');
 if(!host||!dash)return false;
 if(!panel){
   panel=document.createElement('section');panel.id='vf-dashboard-v3';
   panel.setAttribute('aria-label','Panoramica vFiscal essenziale');
   panel.innerHTML=html;
   panel.addEventListener('click',e=>{
     const btn=e.target.closest('[data-v4-action]');if(!btn)return;
     const action=btn.dataset.v4Action;
     if(action==='receipt')window.openReceiptComposer?.();
     else if(action==='history')window.showDashPanel?.('history');
     else if(action==='fund')window.showDashPanel?.('fund');
     else if(action==='deadlines')window.vfNavigate?.('deadlines');
   });
 }
 if(!panel.isConnected)host.prepend(panel);
 dash.classList.add('vfd-restyled');return true;
}
function update(){
 if(document.hidden||typeof window.vfAnalyticsSnapshot!=='function')return;
 let d=null;try{d=window.vfAnalyticsSnapshot()}catch(e){console.warn('Panoramica non disponibile',e);return}
 if(!d?.ready||!mount())return;
 const next=JSON.stringify(d);
 if(next===last)return;last=next;render(d);
}
window.vfRefreshDashboardV3=update;
setInterval(update,2700);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)update()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',update,{once:true});else update();
})();
