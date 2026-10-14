
/* vFiscal: responsive overview v3. Strictly read-only; all figures come from the authenticated fiscal model. */
(function(){
  'use strict';
  if(!location.pathname.includes('vfiscal-app'))return;
  const nf=new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2});
  const pct=new Intl.NumberFormat('it-IT',{maximumFractionDigits:1});
  const months=['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
  const fullMonths=['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
  const finite=(v)=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
  const number=(v)=>finite(v)?Math.max(0,Number(v)):0;
  const euro=(v)=>finite(v)?nf.format(number(v)):'—';
  const percent=(v)=>pct.format(v)+'%';
  const clamp=(x)=>Math.max(0,Math.min(100,Number.isFinite(x)?x:0));
  let panel=null, lastSignature='';
  const markup=[
    '<div class="vfd-grid">',
      '<article class="vfd-card vfd-card-breakdown" aria-label="Ripartizione delle stime fiscali">',
        '<div class="vfd-card-head"><h3>Imposta e contributi</h3><p class="vfd-sub">Composizione del carico fiscale stimato</p></div>',
        '<div class="vfd-donut-row">',
          '<div class="vfd-donut" data-vfd="ring" role="img" aria-label="Ripartizione imposta e contributi">',
            '<div class="vfd-donut-hole"><strong data-vfd="total">—</strong><span>Totale stimato</span></div>',
          '</div>',
          '<div class="vfd-legend">',
            '<div class="vfd-legend-row"><i class="vfd-dot vfd-tax-dot" aria-hidden="true"></i><div><b>Imposta</b><span data-vfd="tax" class="vfd-legend-amount tax">—</span></div></div>',
            '<div class="vfd-legend-row"><i class="vfd-dot vfd-social-dot" aria-hidden="true"></i><div><b>Contributi</b><span data-vfd="social" class="vfd-legend-amount social">—</span></div></div>',
          '</div>',
        '</div>',
      '</article>',
      '<article class="vfd-card vfd-card-fund">',
        '<div class="vfd-card-head"><h3>Fondo tasse</h3><p class="vfd-sub">Quanto hai già accantonato rispetto alla stima</p></div>',
        '<div class="vfd-big" data-vfd="fundPercent">—</div>',
        '<div class="vfd-big-note">del fabbisogno stimato</div>',
        '<div class="vfd-progress"><div data-vfd="fundBar"></div></div>',
        '<div class="vfd-progress-labels"><span>0%</span><span>100%</span></div>',
        '<div class="vfd-progress-copy"><span>Già accantonato: <strong data-vfd="held">—</strong></span><span>Da accantonare: <strong data-vfd="missing">—</strong></span></div>',
      '</article>',
      '<article class="vfd-card vfd-card-threshold">',
        '<div class="vfd-card-head"><h3>Soglia del forfettario</h3><p class="vfd-sub">Incassi rispetto al limite applicabile per l’anno</p></div>',
        '<div class="vfd-big" data-vfd="receipts">—</div>',
        '<div class="vfd-threshold-flex"><div class="vfd-progress"><div data-vfd="thresholdBar"></div></div><b data-vfd="thresholdPct">—</b></div>',
        '<div class="vfd-progress-copy"><span data-vfd="thresholdLabel">Soglia: <strong data-vfd="threshold">—</strong></span><span>Margine residuo: <strong data-vfd="margin">—</strong></span></div>',
        '<div class="vfd-note" data-vfd="thresholdNote" hidden></div>',
      '</article>',
      '<article class="vfd-card vfd-card-income">',
        '<div class="vfd-chart-top"><div class="vfd-card-head"><h3>Andamento degli incassi</h3><p class="vfd-sub">Incassi registrati mese per mese</p></div><span class="vfd-year" data-vfd="year">—</span></div>',
        '<div data-vfd="monthly" aria-live="polite"></div>',
      '</article>',
    '</div>',
    '<div class="vfd-kpis">',
      '<div class="vfd-kpi tax"><span class="vfd-kpi-icon" aria-hidden="true">€</span><div><small>Imposta stimata</small><strong data-vfd="taxKpi">—</strong></div></div>',
      '<div class="vfd-kpi social"><span class="vfd-kpi-icon" aria-hidden="true">◎</span><div><small>Contributi stimati</small><strong data-vfd="socialKpi">—</strong></div></div>',
      '<div class="vfd-kpi total"><span class="vfd-kpi-icon" aria-hidden="true">∑</span><div><small>Totale stimato</small><strong data-vfd="totalKpi">—</strong></div></div>',
    '</div>',
    '<p class="vfd-footnote">Stime indicative basate sul tuo profilo fiscale. Il saldo e gli acconti sono disponibili nelle rispettive sezioni.</p>'
  ].join('');
  function create(){
    const host=document.getElementById('mainDashboardContent');
    const shell=document.getElementById('dashboardPro');
    if(!host||!shell)return false;
    if(!panel){
      panel=document.createElement('section');
      panel.id='vf-dashboard-v3';
      panel.setAttribute('aria-label','Panoramica fiscale vFiscal');
      panel.innerHTML=markup;
    }
    if(!panel.isConnected)host.insertBefore(panel,host.firstChild);
    const actions=shell.querySelector('.head-tools');
    if(actions&&!actions.querySelector('.vfd-register')){
      const button=document.createElement('button');
      button.type='button';
      button.className='vfd-register';
      button.textContent='+ Registra incasso';
      button.addEventListener('click',()=>{
        if(typeof window.openReceiptComposer==='function')window.openReceiptComposer();
        else if(typeof window.vfNavigate==='function')window.vfNavigate('receipts');
      });
      actions.appendChild(button);
    }
    shell.classList.add('vfd-restyled');
    return true;
  }
  function field(name){return panel?.querySelector('[data-vfd="'+name+'"]')}
  function put(name,value){const target=field(name);if(target&&target.textContent!==String(value))target.textContent=value}
  function progress(name,value){const target=field(name);if(target)target.style.width=clamp(value)+'%'}
  function drawMonthly(d){
    const target=field('monthly');if(!target)return;
    const values=Array.isArray(d.monthly)&&d.monthly.length===12?d.monthly.map(number):null;
    const known=values&&values.some(v=>v>0);
    if(!known){
      const note=number(d.openingBalance)>0?
        'Hai un saldo iniziale di '+euro(d.openingBalance)+'. È incluso negli incassi totali, ma non nel grafico mensile perché non ha una data.' :
        'Registra il primo incasso con data per visualizzare l’andamento mese per mese.';
      target.className='vfd-chart-empty';
      if(target.textContent!==note)target.textContent=note;
      return;
    }
    target.className='vfd-chart';
    const max=Math.max(...values,1);
    target.replaceChildren();
    values.forEach((value,i)=>{
      const item=document.createElement('div');item.className='vfd-month';
      item.title=fullMonths[i]+': '+euro(value);
      const bar=document.createElement('div');bar.className='vfd-bar';
      bar.style.height=value>0?Math.max(3,Math.round(value/max*135))+'px':'2px';
      const label=document.createElement('span');label.className='vfd-month-label';label.textContent=months[i];
      item.append(bar,label);target.appendChild(item);
    });
  }
  function draw(d){
    const tax=finite(d.tax)?number(d.tax):null;
    const social=finite(d.social)?number(d.social):null;
    const total=tax!==null&&social!==null?tax+social:null;
    const held=number(d.held);
    const reserveTarget=finite(d.reserveTarget)?number(d.reserveTarget):total;
    const fraction=total&&total>0?tax/total*100:0;
    put('total',euro(total));
    put('tax',euro(tax)+(total>0?' ('+percent(fraction)+')':''));
    put('social',euro(social)+(total>0?' ('+percent(100-fraction)+')':''));
    const ring=field('ring');
    if(ring){
      ring.style.background=total>0?
        'conic-gradient(#1268ef 0% '+fraction+'%,#23bf7c '+fraction+'% 100%)':'#eaf0f7';
      ring.setAttribute('aria-label',total>0?'Imposta '+euro(tax)+'; contributi '+euro(social):'Stima non ancora disponibile');
    }
    const fundPercent=reserveTarget!==null&&reserveTarget>0?held/reserveTarget*100:(reserveTarget===0?100:0);
    put('fundPercent',reserveTarget===null?'—':percent(Math.round(fundPercent)));
    put('held',euro(held));
    put('missing',reserveTarget===null?'—':euro(Math.max(0,reserveTarget-held)));
    progress('fundBar',fundPercent);
    const receipts=number(d.receipts);
    const threshold=finite(d.threshold)&&Number(d.threshold)>0?Number(d.threshold):85000;
    const thresholdRatio=threshold>0?receipts/threshold*100:0;
    put('receipts',euro(receipts));
    put('threshold',euro(threshold));
    put('margin',euro(Math.max(0,threshold-receipts)));
    put('thresholdPct',percent(thresholdRatio));
    progress('thresholdBar',thresholdRatio);
    const firstYear=String(d.startDate||'').slice(0,4)===String(d.year);
    const isProrated=firstYear&&threshold<84999.5;
    const thresholdLabel=field('thresholdLabel');
    if(thresholdLabel){thresholdLabel.firstChild.textContent=isProrated?'Limite ragguagliato: ':'Soglia annua: '}
    const note=field('thresholdNote');
    if(note){
      note.hidden=!isProrated;
      if(isProrated){
        const month=Number(String(d.startDate).slice(5,7))-1;
        const label=fullMonths[month]||'quest’anno';
        note.textContent='P.IVA aperta a '+label+' '+d.year+': limite di 85.000 € ragguagliato al periodo di attività.';
      }
    }
    const thresholdProgress=field('thresholdBar')?.parentElement;
    if(thresholdProgress)thresholdProgress.classList.toggle('warning',thresholdRatio>=100);
    put('year',d.year);
    put('taxKpi',euro(tax));
    put('socialKpi',euro(social));
    put('totalKpi',euro(total));
    drawMonthly(d);
  }
  function refresh(){
    if(typeof window.vfAnalyticsSnapshot!=='function')return;
    let snapshot=null;
    try{snapshot=window.vfAnalyticsSnapshot()}catch(err){console.warn('Dati grafici non disponibili:',err);return}
    if(!snapshot?.ready)return;
    if(!create())return;
    const signature=JSON.stringify(snapshot);
    if(signature===lastSignature)return;
    lastSignature=signature;
    draw(snapshot);
  }
  window.vfRefreshDashboardV3=refresh;
  setInterval(()=>{if(!document.hidden)refresh()},2400);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});
  else refresh();
})();
