/* vFiscal: simplify deadlines without changing calculations, historical payments or forms. */
(function(){
'use strict';
if(!/\/vfiscal-app(?:\.html)?$/.test(location.pathname))return;
const eur=new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'});
const cash=x=>x!==undefined&&x!==null&&Number.isFinite(Number(x))?eur.format(Math.max(0,Number(x))):'Da calcolare';
let panel=null,last='';
function makeFold(label,partList,open=false){
 const fold=document.createElement('details');fold.className='v4-fold';fold.open=open;
 const summary=document.createElement('summary');summary.textContent=label;
 const inner=document.createElement('div');inner.className='v4-fold-body';
 partList.forEach(item=>{if(item)inner.append(item)});
 fold.append(summary,inner);return fold;
}
function mount(){
 const root=document.getElementById('dashPanelPayments');
 if(!root)return false;
 if(panel===root)return true;
 const header=root.querySelector(':scope > .panel-head');
 const yearSlot=document.getElementById('paymentSourceYear');
 if(header?.querySelector('h3')?.firstChild)header.querySelector('h3').firstChild.textContent='Scadenze fiscali · anno ';
 const intro=document.createElement('section');intro.className='v4-pay-summary';
 intro.setAttribute('aria-label','Riepilogo scadenze, prima delle impostazioni');
 intro.innerHTML=[
 '<p>Prima le risposte utili: <b>quando pagare e quanto prevedere</b>. Sono stime da confermare con gli F24.</p>',
 '<div class="v4-pay-cards">',
 '<article class="v4-pay-card"><div class="v4-pay-date" data-vpay="juneDate">Giugno</div>',
 '<strong data-vpay="juneAmount">Da calcolare</strong>',
 '<p>Saldo anno precedente + primo acconto</p>',
 '<button type="button" class="tiny-btn secondary" data-vpay-toggle="june" style="margin-top:13px">Da cosa è composto?</button>',
 '<div class="v4-pay-line" data-vpay-lines="june" hidden></div></article>',
 '<article class="v4-pay-card"><div class="v4-pay-date" data-vpay="novDate">Novembre</div>',
 '<strong data-vpay="novAmount">Da calcolare</strong>',
 '<p>Secondo acconto dell’anno</p>',
 '<button type="button" class="tiny-btn secondary" data-vpay-toggle="nov" style="margin-top:13px">Da cosa è composto?</button>',
 '<div class="v4-pay-line" data-vpay-lines="nov" hidden></div></article>',
 '</div><div class="v4-pay-explainer" data-vpay="notice">',
 'Saldo = differenza ancora da versare per l’anno precedente. Acconto = anticipo sulle imposte dell’anno successivo. Non sono due volte le stesse tasse.',
 '</div>'
 ].join('');
 header?.insertAdjacentElement('afterend',intro);
 intro.querySelectorAll('[data-vpay-toggle]').forEach(button=>button.addEventListener('click',()=>{
   const target=intro.querySelector('[data-vpay-lines="'+button.dataset.vpayToggle+'"]');
   if(!target)return;
   target.hidden=!target.hidden;
   button.textContent=target.hidden?'Da cosa è composto?':'Nascondi composizione';
 }));
 const introLegacy=root.querySelector(':scope > p.micro');
 if(introLegacy)introLegacy.classList.add('v4-legacy-intro');
 const form=root.querySelector(':scope > .form-grid');
 const save=root.querySelector(':scope > button[onclick="savePaymentData()"]');
 const technical=root.querySelector('#paymentDetailBox');
 if(form&&save&&technical){
   const fold=makeFold('Opzioni avanzate · acconti, correzioni e criteri di calcolo',[form,save,technical]);
   intro.insertAdjacentElement('afterend',fold);
 }
 const records=root.querySelector('.payment-records-box');
 if(records){
   const form=records.querySelector(':scope > .form-grid');
   const save=records.querySelector(':scope > button[onclick="savePaymentRecord()"]');
   if(form&&save){
     const fold=makeFold('＋ Registra un F24 già pagato',[form,save]);
     const list=records.querySelector('#paymentRecordsList');
     if(list)records.insertBefore(fold,list);else records.append(fold);
   }
   const head=records.querySelector('.panel-head h3');
   if(head)head.textContent='Pagamenti già registrati';
   const text=records.querySelector(':scope > p.micro');
   if(text)text.textContent='Qui trovi gli F24 registrati. Per inserirne uno nuovo, apri la voce qui sotto.';
 }
 root.classList.add('v4-pay-clean');
 panel=root;return true;
}
function set(id,value){const e=panel?.querySelector('[data-vpay="'+id+'"]');if(e)e.textContent=value}
function pairs(area,items){
 const host=panel?.querySelector('[data-vpay-lines="'+area+'"]');if(!host)return;
 host.replaceChildren();
 for(const [label,value] of items){
   const row=document.createElement('div');
   const text=document.createElement('span');text.textContent=label;
   const bold=document.createElement('b');bold.textContent=value;
   row.append(text,bold);host.append(row);
 }
}
function update(){
 if(document.hidden||typeof window.vfPaymentCalendar!=='function'||typeof window.vfPaymentSourceYear!=='function')return;
 if(!mount())return;
 try{
  const source=Number(window.vfPaymentSourceYear());
  if(!Number.isInteger(source)||source<2026)return;
  const q=window.vfPaymentCalendar(source);
  const signature=JSON.stringify({source,june:q.june,nov:q.nov,projection:q.projection});
  if(signature===last)return;last=signature;
  set('juneDate',q.juneDate+' · indicativa');
  set('novDate',q.novDate+' · indicativa');
  set('juneAmount',q.june);
  set('novAmount',q.nov);
  const p=q.projection;
  if(p?.ready){
   pairs('june',[
    ['Saldo imposta '+source,cash(p.taxBalance)],
    ['Saldo contributi '+source,cash(p.socialBalance)],
    ['Primo acconto imposta '+p.paymentYear,cash(p.taxAdvance?.first)],
    ['Primo acconto contributi '+p.paymentYear,cash(p.socialAdvance?.first)]
   ]);
   pairs('nov',[
    ['Secondo acconto imposta '+p.paymentYear,cash(p.taxAdvance?.second)],
    ['Secondo acconto contributi '+p.paymentYear,cash(p.socialAdvance?.second)]
   ]);
  }else{
   pairs('june',[['Importi','Completa il profilo e il calcolo fiscale '+source]]);
   pairs('nov',[['Importi','Disponibili dopo il calcolo '+source]]);
  }
  let note='Il saldo riguarda il '+source+'; gli acconti sono anticipi per il '+(source+1)+
    '. Non sommare queste scadenze al totale fiscale maturato: sono due prospettive diverse. Date indicative: verifica F24, eventuali proroghe e dichiarazione.';
  if(source>=2027)note+=' Le stime usano provvisoriamente parametri fiscali e INPS 2026.';
  if(p?.socialFixedDue>0)note+=' I contributi fissi di artigiani/commercianti hanno proprie scadenze INPS e non sono inclusi in questi importi.';
  const profile=window.vfAnalyticsSnapshot?.();
  if(profile?.socialScheme==='custom')note+=' Per una Cassa professionale servono gli importi e le regole della Cassa.';
  if(!p?.ready)note='Importi da calcolare: completa prima i dati fiscali dell’anno '+source+'. '+note;
  set('notice',note);
 }catch(err){console.warn('Scadenze semplificate non disponibili',err)}
}
window.vfRefreshSimplePayments=update;
setInterval(update,2600);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)update()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',update,{once:true});else update();
})();
