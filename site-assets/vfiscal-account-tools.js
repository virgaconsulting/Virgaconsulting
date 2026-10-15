import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.1/+esm';
const isAdmin=/\/vfiscal-admin(?:\.html)?$/.test(location.pathname);
const isApp=/\/vfiscal-app(?:\.html)?$/.test(location.pathname);
if(isAdmin||isApp){
const db=createClient('https://kytgwujzjahatblrkhgh.supabase.co','sb_publishable_YqARTOD7oZD5Rg2vu6salQ_jGoGhHzY');
const style=document.createElement('style');style.textContent=`
.vf-tools-card{margin:24px 0;padding:23px;background:#fff;border:1px solid #dde6f0;border-radius:16px;box-shadow:0 5px 20px #1438650a;color:#193251}
.vf-tools-card h2{margin:0 0 7px;font-size:21px;color:#0b3d70}
.vf-tools-card p{font-size:13px;color:#62748b;line-height:1.6;margin:0 0 16px}
.vf-tools-cols{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px}
.vf-tools-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:16px 0}
.vf-tools-metric{background:#f4f8fe;border:1px solid #e4edf9;border-radius:11px;padding:13px}
.vf-tools-metric small{display:block;font-size:11px;color:#5b7391;margin-bottom:7px}.vf-tools-metric strong{font-size:18px;color:#193b6b}
.vf-tools-card select,.vf-tools-card input{padding:11px 12px;border:1px solid #cbd9e8;border-radius:9px;max-width:100%;width:100%;background:#fff;color:#173856}
.vf-tools-card button,.vf-password-entry{cursor:pointer;border:0;border-radius:9px;background:#0b5fc8;color:#fff;padding:10px 15px;font-weight:700}
.vf-tools-card button.danger{background:#ba2c35}
.vf-tools-card button:disabled{opacity:.45;cursor:not-allowed}
.vf-tools-stat-note{font-size:12px;color:#677e98}
.vf-tools-bar-months{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:6px;align-items:end;height:150px;margin:18px 0 8px;border-bottom:1px solid #e0e7ef}
.vf-tools-month{height:100%;display:flex;flex-direction:column;justify-content:end;align-items:center;gap:5px}
.vf-tools-month i{width:min(100%,24px);border-radius:4px 4px 0 0;background:#4893ea;display:block;min-height:2px}
.vf-tools-month span{font-size:10px;color:#637a99}
.vf-password-entry{font-size:12px;margin:8px}
.vf-password-shade{position:fixed;inset:0;background:#081c379c;z-index:9999;display:none;align-items:center;justify-content:center;padding:14px}
.vf-password-shade.visible{display:flex}
.vf-password-dialog{background:#fff;color:#173551;width:min(440px,100%);border-radius:16px;padding:22px;box-shadow:0 16px 58px #0c1c3880}
.vf-password-dialog h3{margin:0 0 12px;color:#0b3d70}
.vf-password-dialog label{display:block;margin:12px 0;font-size:13px}
.vf-password-dialog input{display:block;margin-top:6px;width:100%;padding:11px;border:1px solid #cddbe9;border-radius:9px;color:#153858;background:#fff}
.vf-password-dialog button{cursor:pointer;padding:11px;border:0;border-radius:10px;background:#0c59bb;color:#fff;font-weight:750}
.vf-password-dialog button.secondary{background:#eaf0f7;color:#1c416c}
.vf-password-dialog .actions{display:flex;gap:8px;justify-content:end}
@media(max-width:760px){.vf-tools-cols{grid-template-columns:1fr}.vf-tools-metrics{grid-template-columns:1fr}.vf-tools-card{padding:16px}}
`;document.head.append(style);
const euro=v=>v===null||v===undefined||!Number.isFinite(Number(v))?'Non disponibile':new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(Number(v));
const fmtDate=v=>v?new Date(v).toLocaleString('it-IT'):'—';
if(isAdmin){
 const pane=document.createElement('section');pane.className='vf-tools-card';pane.id='vf-studio-finance';
 pane.style.display='none';
 pane.innerHTML='<h2>Andamento fiscale dei clienti</h2><p>Visualizza incassi, imposte e contributi di ogni cliente, incluso o pagante. Dati sincronizzati dalla sua dashboard e disponibili senza alterare i movimenti.</p><div class="vf-tools-cols"><label>Seleziona un cliente<select id="vf-finance-user"><option value="">Scegli un cliente</option></select></label><label>Anno fiscale<select id="vf-finance-year" disabled><option value="">Nessun dato</option></select></label></div><div id="vf-finance-result" style="margin-top:14px">Seleziona un cliente per vedere i dati disponibili.</div><hr style="margin:26px 0;border:0;border-top:1px solid #e3eaf3"><h2>Gestione account</h2><p>Per eliminare un account gratuito selezionalo in alto e premi il pulsante qui sotto. La cancellazione è definitiva e comprende i dati fiscali salvati. Gli account amministratore e quelli con collegamenti Stripe sono protetti.</p><button class="danger" id="vf-studio-delete" type="button" disabled>Elimina account selezionato</button><div id="vf-studio-delete-status" role="status" style="margin-top:12px;font-size:13px"></div>';
 let selected='',current=null,clients=[];
 const pick=pane.querySelector('#vf-finance-user'),year=pane.querySelector('#vf-finance-year'),result=pane.querySelector('#vf-finance-result'),deleteBtn=pane.querySelector('#vf-studio-delete');
 function flash(text){pane.querySelector('#vf-studio-delete-status').textContent=text}
 async function call(body){
   const {data:{session}}=await db.auth.getSession();
   if(!session?.access_token)throw Error('Accedi come amministratore.');
   const res=await fetch('https://kytgwujzjahatblrkhgh.supabase.co/functions/v1/vfiscal-admin-clients',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token,'apikey':'sb_publishable_YqARTOD7oZD5Rg2vu6salQ_jGoGhHzY'},body:JSON.stringify(body)});
   const json=await res.json().catch(()=>({}));
   if(!res.ok)throw Error(json.error||'Operazione non riuscita');
   return json;
 }
 function renderYear(){
   const data=current?.years?.find(r=>String(r.tax_year)===year.value);
   result.replaceChildren();
   if(!data){result.textContent='Non sono ancora presenti dati fiscali sincronizzati per questo cliente.';return}
   const head=document.createElement('div');head.className='vf-tools-stat-note';
   head.textContent='Anno '+data.tax_year+' · Ultimo aggiornamento: '+fmtDate(data.updated_at)+' · Origine: '+(data.source==='dashboard'?'dashboard cliente':'archivio fiscale');
   result.appendChild(head);
   const blocks=document.createElement('div');blocks.className='vf-tools-metrics';
   for(const [label,value] of [['Incassi registrati',data.receipts_total],['Imposta sostitutiva stimata',data.tax_estimated],['Contributi stimati',data.social_estimated],['Totale imposta + contributi',data.tax_estimated==null||data.social_estimated==null?null:Number(data.tax_estimated)+Number(data.social_estimated)],['Saldo incassi iniziali',data.opening_balance],['Fondo tasse già accantonato',data.reserve_held]]){
     const item=document.createElement('div');item.className='vf-tools-metric';
     const small=document.createElement('small');small.textContent=label;
     const strong=document.createElement('strong');strong.textContent=euro(value);
     item.append(small,strong);blocks.appendChild(item);
   }
   result.appendChild(blocks);
   const values=Array.isArray(data.monthly_receipts)?data.monthly_receipts.map(v=>Math.max(0,Number(v)||0)):null;
   const note=document.createElement('p');note.className='vf-tools-stat-note';
   note.textContent=values?.some(v=>v>0)?'Andamento degli incassi con data, per mese. Il saldo iniziale è incluso nel totale ma non nelle barre.':'Nessun movimento mensile datato disponibile. Il saldo iniziale, se presente, è incluso negli incassi totali.';
   result.appendChild(note);
   if(values?.some(v=>v>0)){
     const chart=document.createElement('div');chart.className='vf-tools-bar-months';
     const max=Math.max(...values,1),months=['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
     values.forEach((v,i)=>{const m=document.createElement('div');m.className='vf-tools-month';m.title=months[i]+': '+euro(v);const bar=document.createElement('i');bar.style.height=(v?Math.max(3,v/max*115):2)+'px';const label=document.createElement('span');label.textContent=months[i];m.append(bar,label);chart.appendChild(m)});
     result.appendChild(chart);
   }
 }
 async function loadOne(){
   selected=pick.value;year.replaceChildren();result.textContent='Caricamento dati fiscali...';current=null;
   deleteBtn.disabled=!selected;
   if(!selected){result.textContent='Seleziona un cliente.';year.disabled=true;return}
   try{current=await call({action:'financial_overview',user_id:selected});
     for(const row of current.years||[]){const opt=document.createElement('option');opt.value=String(row.tax_year);opt.textContent=String(row.tax_year);year.appendChild(opt)}
     year.disabled=!(current.years||[]).length;
     if(!current.years?.length){const opt=document.createElement('option');opt.value='';opt.textContent='Nessun anno disponibile';year.appendChild(opt)}
     renderYear();
   }catch(e){result.textContent=e.message}
 }
 async function loadUsers(){
   const {data:{session}}=await db.auth.getSession();if(!session?.user)return;
   try{
     const list=await call({action:'list'});pane.style.display='block';
     clients=list.clients||[];
     window.vfStudioAdminCall=call;
     window.dispatchEvent(new Event('vf-studio-admin-ready'));
     const old=pick.value;pick.replaceChildren();
     const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Scegli un cliente';pick.appendChild(placeholder);
     clients.forEach(c=>{const option=document.createElement('option');option.value=c.user_id;option.textContent=(c.email||'Cliente')+' — '+(c.access_type==='virga_client'?'Incluso':'Pagante/altro');pick.appendChild(option)});
     if(clients.some(c=>c.user_id===old))pick.value=old;
   }catch(e){pane.style.display='none'}
 }
 pick.addEventListener('change',loadOne);
 year.addEventListener('change',renderYear);
 deleteBtn.addEventListener('click',async()=>{
   const c=clients.find(x=>x.user_id===pick.value);
   if(!c)return;
   const exact=prompt('Eliminazione DEFINITIVA di '+c.email+' e dei suoi dati fiscali.\nDigita ELIMINA ACCOUNT per confermare:');
   if(exact!=='ELIMINA ACCOUNT'){flash('Eliminazione annullata.');return}
   if(!confirm('Ultima conferma: eliminare definitivamente '+c.email+'? L’operazione non si può annullare.'))return;
   deleteBtn.disabled=true;flash('Verifica e cancellazione in corso...');
   try{
     await call({action:'delete_account',user_id:c.user_id,email:c.email,confirmation:exact});
     flash('Account eliminato.');selected='';current=null;await loadUsers();pick.value='';await loadOne();
   }catch(e){flash(e.message)}finally{deleteBtn.disabled=!pick.value}
 });
 db.auth.onAuthStateChange((event)=>{
   if(event==='SIGNED_OUT'){
     delete window.vfStudioAdminCall;
     window.dispatchEvent(new Event('vf-studio-admin-signed-out'));
     pane.style.display='none';
   }
 });
 // Wait for existing admin login to complete; only allowlisted administrators get data.
 (document.querySelector('main')||document.body).appendChild(pane);
 setInterval(()=>{if(!pane.isConnected)return;if(pane.style.display==='none')loadUsers()},4500);
 setTimeout(loadUsers,1300);
}
if(isApp){
 const box=document.createElement('div');
 box.className='vf-password-shade';box.innerHTML='<section class="vf-password-dialog" role="dialog" aria-modal="true" aria-label="Cambia password"><h3>Cambia la tua password</h3><p style="font-size:12px;color:#5e7086">Solo tu puoi cambiarla. Inserisci prima la password attuale.</p><form id="vf-change-password-form"><label>Password attuale<input id="vf-old-password" type="password" autocomplete="current-password" required></label><label>Nuova password<input id="vf-new-password" type="password" autocomplete="new-password" minlength="10" required></label><label>Conferma nuova password<input id="vf-repeat-password" type="password" autocomplete="new-password" minlength="10" required></label><div class="actions"><button class="secondary" id="vf-pw-cancel" type="button">Annulla</button><button type="submit">Salva password</button></div><p id="vf-password-status" role="status" style="margin:10px 0 0;font-size:12px"></p></form></section>';
 document.body.appendChild(box);
 const open=document.createElement('button');open.className='vf-password-entry';open.textContent='Cambia password';open.type='button';
 const close=()=>{box.classList.remove('visible');box.querySelector('form').reset();box.querySelector('#vf-password-status').textContent=''};
 open.addEventListener('click',()=>box.classList.add('visible'));
 box.querySelector('#vf-pw-cancel').addEventListener('click',close);
 box.addEventListener('click',e=>{if(e.target===box)close()});
 box.querySelector('form').addEventListener('submit',async e=>{
   e.preventDefault();
   const status=box.querySelector('#vf-password-status'),old=box.querySelector('#vf-old-password').value,
     fresh=box.querySelector('#vf-new-password').value,repeated=box.querySelector('#vf-repeat-password').value;
   if(fresh!==repeated||fresh.length<10){status.textContent='Le nuove password devono coincidere e contenere almeno 10 caratteri.';return}
   if(fresh===old){status.textContent='La nuova password deve essere diversa da quella attuale.';return}
   status.textContent='Verifica password e aggiornamento...';
   const {data:{session}}=await db.auth.getSession();
   if(!session?.user?.email){status.textContent='Effettua nuovamente l’accesso.';return}
   const {error:verifyError}=await db.auth.signInWithPassword({email:session.user.email,password:old});
   if(verifyError){status.textContent='Password attuale non corretta.';return}
   const {error:updateError}=await db.auth.updateUser({password:fresh});
   if(updateError){status.textContent='Impossibile aggiornare la password: '+updateError.message;return}
   status.textContent='Password aggiornata correttamente.';
   setTimeout(close,1500);
 });
 function mount(){if(open.isConnected)return;const root=document.querySelector('#dashboardPro .vf-side-footer')||document.querySelector('#dashboardPro .head-tools');if(root)root.appendChild(open)}
 setInterval(mount,3000);if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
}
}
