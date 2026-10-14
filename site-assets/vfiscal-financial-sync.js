import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.1/+esm';

// Persist only the authenticated user's own read-only fiscal overview.
// RLS disallows reading or writing any other user's data from the client.
if(/\/vfiscal-app(?:\.html)?$/.test(location.pathname)){
  const db=createClient(
    'https://kytgwujzjahatblrkhgh.supabase.co',
    'sb_publishable_YqARTOD7oZD5Rg2vu6salQ_jGoGhHzY'
  );
  let syncing=false,lastPayload='',retryAfter=0;
  function sanitize(){
    const d=window.vfAnalyticsSnapshot?.();
    if(!d?.ready||!Number.isInteger(Number(d.year)))return null;
    const n=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Math.min(999999999999,Math.max(0,Number(v))):null;
    const months=Array.isArray(d.monthly)&&d.monthly.length===12?d.monthly.map(x=>n(x)??0):Array(12).fill(0);
    return {
      tax_year:Number(d.year),receipts_total:n(d.receipts)??0,
      opening_balance:n(d.openingBalance)??0,
      tax_estimated:n(d.tax),social_estimated:n(d.social),
      reserve_target:n(d.reserveTarget),reserve_held:n(d.held)??0,
      monthly_receipts:months
    };
  }
  async function sync(){
    if(syncing||document.hidden||Date.now()<retryAfter)return;
    const snapshot=sanitize();if(!snapshot)return;
    const signature=JSON.stringify(snapshot);
    if(signature===lastPayload)return;
    syncing=true;
    try{
      const {data:{session},error:authError}=await db.auth.getSession();
      if(authError||!session?.user?.id||!window.VFISCAL_AUTH_USER?.id||session.user.id!==window.VFISCAL_AUTH_USER.id)return;
      const {error}=await db.from('fiscal_dashboard_snapshots').upsert(
        {...snapshot,user_id:session.user.id,updated_at:new Date().toISOString()},
        {onConflict:'user_id,tax_year'}
      );
      if(error){retryAfter=Date.now()+60000;console.warn('vFiscal: riepilogo studio non sincronizzato',error.message);return;}
      lastPayload=signature;retryAfter=0;
    }catch(e){retryAfter=Date.now()+60000;console.warn('vFiscal: riepilogo studio non disponibile',e)}
    finally{syncing=false}
  }
  setInterval(sync,10000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(sync,1200),{once:true});
  else setTimeout(sync,1200);
}
