import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.1/+esm';
const app=/\/vfiscal-app(?:\.html)?$/.test(location.pathname);
const admin=/\/vfiscal-admin(?:\.html)?$/.test(location.pathname);
if(app||admin){
const db=createClient('https://kytgwujzjahatblrkhgh.supabase.co','sb_publishable_YqARTOD7oZD5Rg2vu6salQ_jGoGhHzY');
const style=document.createElement('style');
style.textContent='.vmsg-open{position:fixed;bottom:24px;right:18px;z-index:9001;background:#174e88;color:#fff;border:0;border-radius:48px;padding:14px 18px;box-shadow:0 8px 28px #18467055;font-weight:750;cursor:pointer;display:none}.vmsg-shade{position:fixed;inset:0;z-index:9100;background:#0a1b2b88;display:none;align-items:end;justify-content:end}.vmsg-shade.visible{display:flex}.vmsg-box{display:flex;flex-direction:column;background:#fff;color:#173757;font:14px Inter,system-ui,sans-serif;width:min(430px,100%);height:min(700px,95dvh);margin:18px;border-radius:18px;overflow:hidden;box-shadow:0 12px 65px #07152b66}.vmsg-head{background:#103f76;color:white;padding:17px;display:flex;align-items:center;justify-content:space-between}.vmsg-head strong{font-size:17px}.vmsg-head small{display:block;font-size:11px;opacity:.85;margin-top:5px}.vmsg-head button{background:none;color:white;border:1px solid #ffffff66;border-radius:24px;padding:6px 10px;cursor:pointer}.vmsg-tip{padding:12px 15px;background:#eef4fb;color:#5a7190;font-size:12px;line-height:1.6}.vmsg-flow{flex:1;min-height:130px;overflow-y:auto;display:flex;flex-direction:column;gap:11px;padding:16px}.vmsg-bubble{background:#eff3f8;border-radius:13px 13px 13px 3px;padding:11px 13px;max-width:88%;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.5;font-size:13px}.vmsg-bubble.mine{align-self:flex-end;border-radius:13px 13px 3px 13px;background:#e0edff}.vmsg-bubble.theirs{align-self:flex-start}.vmsg-bubble small{display:block;color:#617a95;font-size:10px;margin-top:7px;text-align:right}.vmsg-empty{margin:auto;color:#698198;text-align:center;font-size:13px}.vmsg-send{display:flex;gap:8px;border-top:1px solid #e0e8f1;padding:12px}.vmsg-send textarea{flex:1;min-width:0;border:1px solid #ccd8e6;border-radius:10px;resize:vertical;padding:10px;font:13px Inter,system-ui,sans-serif;max-height:105px}.vmsg-send button,.vmsg-action{background:#174e88;color:#fff;border:0;border-radius:10px;padding:12px;font-weight:750;cursor:pointer}.vmsg-send button:disabled{opacity:.55}.vmsg-warn{font-size:10px;color:#788da1;line-height:1.45;padding:0 14px 10px}.vmsg-error{min-height:16px;color:#b22f46;padding:0 14px;font-size:12px}.vmsg-admin{display:none;margin:22px auto;padding:22px;max-width:1160px;border:1px solid #e3ebf4;border-radius:18px;background:white;color:#173757;font-family:Inter,system-ui,sans-serif}.vmsg-admin h2{font-size:23px;color:#12416f}.vmsg-admin-grid{display:grid;grid-template-columns:minmax(220px,270px) 1fr;border:1px solid #dce6f0;border-radius:14px;overflow:hidden;height:520px}.vmsg-contacts{background:#f4f7fc;overflow-y:auto;border-right:1px solid #e2eaf2}.vmsg-contact{display:block;width:100%;border:0;border-bottom:1px solid #e0e8f1;padding:13px;text-align:left;background:transparent;color:#164474;cursor:pointer;overflow-wrap:anywhere}.vmsg-contact.selected{background:#dcecff}.vmsg-contact small{display:block;color:#71869c;margin-top:5px}.vmsg-thread{display:flex;flex-direction:column;min-height:0}.vmsg-thread h3{margin:0;padding:16px;border-bottom:1px solid #e2eaf2;font-size:14px;overflow-wrap:anywhere}@media(max-width:600px){.vmsg-box{width:100%;height:98dvh;margin:0;border-radius:18px 18px 0 0}.vmsg-admin{padding:12px}.vmsg-admin-grid{height:730px;grid-template-columns:1fr;grid-template-rows:180px 1fr}.vmsg-contacts{border-right:0;border-bottom:1px solid #e2eaf2}.vmsg-open{right:12px;bottom:calc(14px + env(safe-area-inset-bottom))}}';
document.head.append(style);
const byId=id=>document.getElementById(id);
const stamp=d=>new Date(d).toLocaleString('it-IT',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
let user=null,selected=null,last='',pending=false,opened=false;
async function getSession(){return (await db.auth.getSession()).data.session}
function showError(id,text){if(byId(id))byId(id).textContent=text||''}
function renderMessage(msg,own,view){const item=document.createElement('div');item.className='vmsg-bubble '+(msg.sender_role===own?'mine':'theirs');const b=document.createElement('div');b.textContent=msg.body;const t=document.createElement('small');t.textContent=(msg.sender_role==='admin'?'Studio':'Cliente')+' · '+stamp(msg.created_at);item.append(b,t);view.append(item)}
async function thread(uid,viewId,own,errorId){const v=byId(viewId);if(!uid||!v)return;const {data,error}=await db.from('support_messages').select('id,sender_role,body,created_at').eq('user_id',uid).order('created_at',{ascending:true}).limit(300);if(error){showError(errorId,'Non riesco a caricare i messaggi.');return}v.replaceChildren();if(!data.length){const p=document.createElement('p');p.className='vmsg-empty';p.textContent=own==='client'?'Scrivi il tuo primo messaggio allo studio.':'Nessun messaggio.';v.append(p)}else data.forEach(m=>renderMessage(m,own,v));v.scrollTop=v.scrollHeight}
async function send(uid,role,textId,errorId,viewId){if(pending||!user||!uid)return;const el=byId(textId),body=el.value.trim();if(!body||body.length>2000){showError(errorId,'Scrivi da 1 a 2.000 caratteri.');return}pending=true;try{const {error}=await db.from('support_messages').insert({user_id:uid,sender_id:user.id,sender_role:role,body});if(error){showError(errorId,'Messaggio non inviato. Verifica il tuo accesso e riprova.');return}el.value='';showError(errorId,'');await thread(uid,viewId,role,errorId)}finally{pending=false}}
const roleActive=s=>s&&((s.access_type==='virga_client'&&s.status==='active')||(s.access_type==='paid'&&['active','trialing'].includes(s.status)&&s.current_period_end&&Date.parse(s.current_period_end)>Date.now()));
if(app){
const launch=document.createElement('button');launch.id='vmsg-launch';launch.className='vmsg-open';launch.type='button';launch.textContent='✉  Messaggi allo studio';
const shade=document.createElement('div');shade.id='vmsg-shade';shade.className='vmsg-shade';
shade.innerHTML='<section class="vmsg-box" role="dialog" aria-modal="true" aria-label="Messaggi allo studio"><header class="vmsg-head"><div><strong>Messaggi al commercialista</strong><small>Virga Consulting · Conversazione privata</small></div><button type="button" id="vmsg-close" aria-label="Chiudi">✕</button></header><p class="vmsg-tip">Scrivi allo studio per chiarimenti sull’utilizzo di vFiscal. Le risposte saranno disponibili qui.</p><div id="vmsg-client-flow" class="vmsg-flow"></div><div id="vmsg-client-error" class="vmsg-error" role="status"></div><form id="vmsg-client-form" class="vmsg-send"><textarea id="vmsg-client-text" maxlength="2000" required aria-label="Messaggio" placeholder="Scrivi un messaggio..."></textarea><button type="submit">Invia</button></form><div class="vmsg-warn">Non inviare password, codici o documenti con informazioni sensibili. Non è un canale per urgenze.</div></section>';
document.body.append(launch,shade);
const close=()=>{shade.classList.remove('visible');opened=false};
launch.addEventListener('click',async()=>{opened=true;shade.classList.add('visible');await thread(user.id,'vmsg-client-flow','client','vmsg-client-error');byId('vmsg-client-text').focus()});
byId('vmsg-close').addEventListener('click',close);shade.addEventListener('click',e=>{if(e.target===shade)close()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&opened)close()});
byId('vmsg-client-form').addEventListener('submit',async e=>{e.preventDefault();await send(user?.id,'client','vmsg-client-text','vmsg-client-error','vmsg-client-flow')});
async function refreshApp(){const s=await getSession(),id=s?.user?.id||'';if(id===last)return;last=id;user=s?.user||null;launch.style.display='none';close();if(user){const {data}=await db.from('subscriptions').select('access_type,status,current_period_end').eq('user_id',id).maybeSingle();if(roleActive(data))launch.style.display='block'}}
setInterval(refreshApp,2500);setInterval(()=>{if(opened&&user)thread(user.id,'vmsg-client-flow','client','vmsg-client-error')},16000);db.auth.onAuthStateChange(()=>{last='';setTimeout(refreshApp,100)});refreshApp();
}
if(admin){
const box=document.createElement('section');box.id='vmsg-admin';box.className='vmsg-admin';
box.innerHTML='<h2>Messaggi dei clienti</h2><p>Conversazioni riservate dei clienti vFiscal. Rispondi direttamente da questa pagina.</p><button type="button" id="vmsg-admin-reload" class="vmsg-action">Aggiorna conversazioni</button><div class="vmsg-admin-grid" style="margin-top:14px"><nav id="vmsg-contacts" class="vmsg-contacts" aria-label="Clienti">Nessuna conversazione.</nav><section class="vmsg-thread"><h3 id="vmsg-thread-title">Seleziona un cliente</h3><div id="vmsg-admin-flow" class="vmsg-flow"></div><div id="vmsg-admin-error" class="vmsg-error" role="status"></div><form id="vmsg-admin-form" class="vmsg-send" style="display:none"><textarea id="vmsg-admin-text" maxlength="2000" required aria-label="Risposta al cliente" placeholder="Scrivi una risposta..."></textarea><button type="submit">Invia</button></form></section></div>';
(document.querySelector('main')||document.body).append(box);
async function inbox(){const {data,error}=await db.rpc('vf_support_inbox');if(error){showError('vmsg-admin-error','Impossibile caricare le conversazioni.');return}const nav=byId('vmsg-contacts');nav.replaceChildren();if(!data.length){nav.textContent='Nessuna conversazione ricevuta.';return}for(const c of data){const button=document.createElement('button');button.type='button';button.className='vmsg-contact'+(selected===c.client_user_id?' selected':'');const name=document.createElement('strong');name.textContent=c.client_email||'Cliente';const small=document.createElement('small');small.textContent='Ultimo messaggio: '+stamp(c.last_message_at);button.append(name,small);button.addEventListener('click',async()=>{selected=c.client_user_id;byId('vmsg-thread-title').textContent=c.client_email||'Cliente';byId('vmsg-admin-form').style.display='flex';for(const e of nav.children)e.classList.toggle('selected',e===button);await thread(selected,'vmsg-admin-flow','admin','vmsg-admin-error')});nav.append(button)}if(selected)await thread(selected,'vmsg-admin-flow','admin','vmsg-admin-error')}
byId('vmsg-admin-reload').addEventListener('click',inbox);
byId('vmsg-admin-form').addEventListener('submit',async e=>{e.preventDefault();await send(selected,'admin','vmsg-admin-text','vmsg-admin-error','vmsg-admin-flow');await inbox()});
async function refreshAdmin(){const s=await getSession(),id=s?.user?.id||'';if(id===last)return;last=id;user=s?.user||null;box.style.display='none';selected=null;if(!user)return;const {data,error}=await db.rpc('vf_support_is_admin');if(!error&&data===true){box.style.display='block';await inbox()}}
setInterval(refreshAdmin,2500);setInterval(()=>{if(box.style.display==='block')inbox()},23000);db.auth.onAuthStateChange(()=>{last='';setTimeout(refreshAdmin,100)});refreshAdmin();
}
}


/* vFiscal: progressive dashboard visualization layer. Only displays actual UI values. */
if (/\\/vfiscal-app(?:\\.html)?$/.test(location.pathname)) {
(() => {
  const id='vf-visual-analytics';
  const css=document.createElement('style');
  css.textContent=`
  #vf-visual-analytics{margin:22px 0;padding:22px;border:1px solid #dce6f3;border-radius:22px;background:linear-gradient(125deg,#f8fbff,#fff);color:#153557;font:14px Inter,system-ui,sans-serif}
  #vf-visual-analytics *{box-sizing:border-box}
  #vf-visual-analytics h2{font:700 25px/1.25 Inter,system-ui,sans-serif;margin:0;color:#12395e}
  #vf-visual-analytics .vf-v-head{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:18px}
  #vf-visual-analytics .vf-v-desc{font-size:12px;color:#71859b;margin-top:6px}
  #vf-visual-analytics .vf-v-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px}
  #vf-visual-analytics .vf-v-box{background:white;padding:19px;border:1px solid #e5ecf5;border-radius:18px;min-width:0}
  #vf-visual-analytics .vf-v-box h3{margin:0 0 8px;color:#12395e;font:750 15px Inter,system-ui,sans-serif}
  #vf-visual-analytics .vf-v-sub{color:#71859b;font-size:12px;margin:0 0 14px}
  #vf-visual-analytics .vf-v-track{height:14px;border-radius:20px;overflow:hidden;background:#eaf0f9}
  #vf-visual-analytics .vf-v-fill{height:100%;width:0;background:linear-gradient(90deg,#3266c7,#7564dd);transition:width .5s}
  #vf-visual-analytics .vf-v-ring{width:154px;height:154px;border-radius:50%;display:grid;place-items:center;margin:6px auto;background:conic-gradient(#5869dc 0 0,#40bfa7 0 0,#e9edf7 0)}
  #vf-visual-analytics .vf-v-ring-inner{background:white;border-radius:50%;width:112px;height:112px;display:grid;place-items:center;text-align:center}
  #vf-visual-analytics .vf-v-number{font-size:20px;font-weight:800;display:block;color:#12395e}
  #vf-visual-analytics .vf-v-meta{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:12px;margin-top:11px;color:#59728d}
  #vf-visual-analytics .vf-v-empty{color:#8091a3;font-size:13px;margin-top:13px}
  #vf-visual-analytics .vf-v-link{display:inline-flex;gap:6px;padding:10px 13px;border-radius:10px;background:#154b86;color:white;border:0;text-decoration:none;font:700 12px Inter,system-ui,sans-serif;cursor:pointer}
  #vf-visual-analytics .vf-v-link.secondary{color:#154b86;background:#e9f1fb}
  #vf-visual-analytics .vf-v-actions{display:flex;gap:8px;flex-wrap:wrap}
  @media(max-width:740px){#vf-visual-analytics{padding:15px}#vf-visual-analytics .vf-v-grid{grid-template-columns:1fr}}
  `;
  document.head.append(css);
  const panel=document.createElement('section');
  panel.id=id;panel.setAttribute('aria-label','Grafici fiscali');
  panel.innerHTML=`<div class="vf-v-head"><div><h2>La tua attività, in grafici</h2><div class="vf-v-desc">Visualizzazioni indicative basate sui dati visibili della dashboard.</div></div><div class="vf-v-actions"><button type="button" class="vf-v-link secondary" data-action="refresh">Aggiorna grafici ↻</button><button type="button" class="vf-v-link" data-action="register">+ Registra incasso</button></div></div><div class="vf-v-grid"><div class="vf-v-box"><h3>Imposta e contributi</h3><p class="vf-v-sub">Composizione del carico fiscale stimato</p><div class="vf-v-ring"><div class="vf-v-ring-inner"><div><span class="vf-v-number" data-val="total">—</span><small>Totale stimato</small></div></div></div><div class="vf-v-meta"><span data-val="tax">Imposta: —</span><span data-val="social">Contributi: —</span></div></div><div class="vf-v-box"><h3>Fondo tasse</h3><p class="vf-v-sub">Quanto hai già accantonato rispetto alla stima</p><span class="vf-v-number" data-val="reserve">—</span><div class="vf-v-track" style="margin-top:16px"><div class="vf-v-fill" data-fill="reserve"></div></div><div class="vf-v-meta"><span data-val="held">Già accantonato: —</span><span data-val="remaining">Da accantonare: —</span></div></div><div class="vf-v-box"><h3>Soglia del forfettario</h3><p class="vf-v-sub">Incassi dichiarati nella dashboard, rispetto al limite ordinario</p><span class="vf-v-number" data-val="receipts">—</span><div class="vf-v-track" style="margin-top:16px"><div class="vf-v-fill" data-fill="threshold"></div></div><div class="vf-v-meta"><span data-val="threshold">Limite 85.000 €</span><span data-val="margin">Margine: —</span></div></div><div class="vf-v-box"><h3>Andamento degli incassi</h3><p class="vf-v-sub">Riepilogo mensile, disponibile quando i movimenti datati sono leggibili</p><div data-area="monthly" class="vf-v-empty">Registra incassi datati per visualizzare l'andamento mensile.</div></div></div>`;
  let last='',reading=false;
  const euro=v=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(v);
  const amount=t=>{const m=String(t||'').match(/(?:€\\s*)?(-?\\d{1,3}(?:\\.\\d{3})*(?:,\\d{1,2})|-?\\d+(?:,\\d{1,2})?)\\s*€?/);if(!m)return null;const n=Number(m[1].replace(/\\./g,'').replace(',','.'));return Number.isFinite(n)&&n>=0?n:null};
  const get=(label)=>{
    const els=[...document.querySelectorAll('main *, .app *, body *')].filter(x=>x!==panel&&!panel.contains(x)&&x.children.length<=1&&x.textContent?.trim().toLowerCase()===label.toLowerCase());
    for(const el of els){
      let p=el.parentElement;
      for(let i=0;i<3&&p;i++,p=p.parentElement){
        const candidates=[...p.querySelectorAll('strong,b,[class*="value"],[class*="amount"]')].filter(x=>x!==el&&!el.contains(x));
        for(const x of candidates){const v=amount(x.textContent);if(v!==null)return v;}
      }
    }
    return null;
  };
  const put=(key,val)=>{const el=panel.querySelector('[data-val="'+key+'"]');if(el)el.textContent=val};
  const fill=(key,n)=>{const el=panel.querySelector('[data-fill="'+key+'"]');if(el)el.style.width=Math.max(0,Math.min(100,n))+'%'};
  function update(){
    if(reading||!panel.isConnected)return;reading=true;
    try {
      const tax=get('Imposta stimata')??get('Imposta sostitutiva');
      const social=get('Contributi stimati')??get('Contributi previdenziali');
      const held=get('Fondo tasse già accantonato');
      const receipts=get('Incassi 2026')??get('Incassi dell’anno')??get('Incassi anno')??get('Incassi');
      const total=tax!==null&&social!==null?tax+social:null;
      put('tax','Imposta: '+(tax===null?'—':euro(tax)));
      put('social','Contributi: '+(social===null?'—':euro(social)));
      put('total',total===null?'—':euro(total));
      const ring=panel.querySelector('.vf-v-ring');
      if(total!==null&&total>0){const percent=tax/total*100;ring.style.background='conic-gradient(#5869dc 0 '+percent+'%,#40bfa7 '+percent+'% 100%)'}
      else ring.style.background='#e9edf7';
      put('held','Già accantonato: '+(held===null?'—':euro(held)));
      put('remaining','Da accantonare: '+(total===null||held===null?'—':euro(Math.max(0,total-held))));
      put('reserve',total===null||held===null?'—':Math.round(total>0?held/total*100:100)+'% del fabbisogno');
      fill('reserve',total!==null&&held!==null?(total>0?held/total*100:100):0);
      put('receipts',receipts===null?'—':euro(receipts));
      const cap=85000;
      put('margin','Margine: '+(receipts===null?'—':euro(Math.max(0,cap-receipts))));
      fill('threshold',receipts===null?0:receipts/cap*100);
      put('threshold','Soglia ordinaria: '+euro(cap));
    }finally{reading=false}
  }
  function attach(){
    if(panel.isConnected)return;
    const headings=[...document.querySelectorAll('h2,h3')].filter(x=>/panoramica/i.test(x.textContent||''));
    const target=headings.find(x=>!x.closest('#'+id));
    if(!target)return;
    const block=target.closest('section')||target.parentElement;
    if(block&&block.parentElement)block.insertAdjacentElement('afterend',panel);
    update();
  }
  panel.querySelector('[data-action="refresh"]').addEventListener('click',update);
  panel.querySelector('[data-action="register"]').addEventListener('click',()=>{
    const buttons=[...document.querySelectorAll('button')].filter(x=>!panel.contains(x));
    const btn=buttons.find(x=>/registra (un )?incasso|nuovo movimento/i.test(x.textContent||''));
    if(btn)btn.click();else document.querySelector('#movementAmount')?.focus();
  });
  let tick=0;const observer=new MutationObserver(()=>{if(tick)return;tick=setTimeout(()=>{tick=0;attach();update()},900)});
  observer.observe(document.body,{childList:true,subtree:true,characterData:true});
  setInterval(()=>{attach();update()},4500);attach();
})();
}
