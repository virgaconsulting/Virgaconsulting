#!/usr/bin/env python3
"""Enable multi-year forecasts in the EXISTING vFiscal UI, with explicit 2026 rulepack provenance."""
from pathlib import Path
import re,sys
p=Path(sys.argv[1]);s=p.read_text()

def replace_function(name,src):
    global s
    pattern=r"(?m)^function "+re.escape(name)+r"\([^)]*\)\s*\{.*?^\}"
    s,n=re.subn(pattern,lambda _:src,s,count=1,flags=re.S|re.M)
    if n!=1:raise SystemExit("Cannot upgrade function "+name+": "+str(n))

def single(old,new,what):
    global s
    if s.count(old)!=1:raise SystemExit("Cannot upgrade "+what+": unexpected source count "+str(s.count(old)))
    s=s.replace(old,new,1)

rules="""function vfRulesForYear(year){
  const y=Number(year);
  if(!Number.isInteger(y)||y<2026||y>2035)throw new Error('Anno fiscale non supportato.');
  if(y===2026)return RULES_IT_2026;
  // 2027+ is ALWAYS labelled as provisional, not a purported approved rate pack.
  return {...RULES_IT_2026,id:'IT-'+y+'-PREVISIONE-CON-REGOLE-2026',
    taxYear:y,sources:[...RULES_IT_2026.sources,
      'PARAMETRI 2026 usati a solo scopo previsionale per l’anno '+y]};
}
function vfIsFutureFiscalEstimate(year){return Number(year)>2026}
"""
single("function vfInputForYear(year){",rules+"\nfunction vfInputForYear(year){","annual rules entrypoint")

replace_function("vfInputForYear","""function vfInputForYear(year){
  const taxYear=Number(year);
  const p=VF_MODEL.profile||vfProfileFromInputs();
  if(!p||!vfIsValidISODate(p.startDate))throw new Error('Inserisci una data di apertura valida nel profilo.');
  const startYear=Number(p.startDate.slice(0,4));
  if(taxYear<startYear)throw new Error('L’attività non era ancora aperta.');
  const y=VF_MODEL.years[String(taxYear)]||vfYearByNumber(taxYear);
  const prev=VF_MODEL.years[String(taxYear-1)]||null;
  const prevKnown=!!prev&&!!(prev.dataUpdatedAt||prev.lastUpdated||prev.lastCalculated||
    Number(prev.openingBalance||0)>0||(prev.movements||[]).length);
  const previousDayCount=taxYear===startYear?365:Math.max(1,vfThresholdForYear(taxYear-1).days||365);
  const prevYearLength=(Date.UTC(taxYear,0,1)-Date.UTC(taxYear-1,0,1))/86400000;
  const normalizedDays=previousDayCount*365/prevYearLength;
  const manualDeductible=Math.max(0,Number(y.deductiblePaid||0));
  const recordedDeductible=Math.max(0,vfDeductibleSocialPaidInYear(taxYear));
  const rate=Number(p.taxRate||15)===5 && taxYear>=startYear+5?15:Number(p.taxRate||15);
  return {
    taxYear,
    activities:[{label:p.activityLabel||'Attività principale',receipts:vfReceiptsTotal(y),coefficient:Number(p.coefficient||.78)}],
    eligibility:{
      currentYearRevenueLimit:vfThresholdForYear(taxYear).threshold,
      previousYearReceipts:taxYear===startYear?0:prevKnown?vfReceiptsTotal(prev):null,
      previousYearActiveDays:taxYear===startYear?365:normalizedDays,
      previousYearEmployeeCosts:taxYear===startYear?0:null,
      previousYearEmployeeIncome:null,employmentRelationshipCeased:null,
      specialVatRegime:null,participatesInPartnershipOrTransparentEntity:null,
      controlsRelatedSrl:null,nonResidentIneligible:null,
      employerRelatedReceiptsSharePercent:null,compulsoryPracticeException:false
    },
    startup:{
      startYear,requestedRate:rate/100,noPriorBusiness3Years:p.startupNoPriorBusiness3Years,
      notMereContinuation:p.startupNotMereContinuation,
      takesOverExistingActivity:!!p.startupTakesOverExisting,
      predecessorRevenueWithinLimit:p.startupTakesOverExisting?p.startupPredecessorWithinLimit:true
    },
    socialSecurity:{
      scheme:p.socialScheme||'gestione_separata',otherMandatoryCoverage:!!p.otherMandatoryCoverage,
      pensioner:false,otherGsTaxableIncome:0,monthsActive:vfMonthsActiveForYear(taxYear,p.startDate),
      reducedForfettario35:!!p.reducedForfettario35,
      newArtCom2025Reduction50:!!p.newArtCom2025Reduction50,
      over65PensionerReduction50:!!p.over65PensionerReduction50,
      pre1996ContributionSeniority:!!p.pre1996ContributionSeniority,
      customEstimatedCurrentYear:Number(p.customContribution||0)
    },
    cash:{
      deductibleMandatoryContributionsPaid:manualDeductible+recordedDeductible,
      substituteTaxPaidAgainstCurrentYearLiability:0,
      contributionsPaidAgainstCurrentYearLiability:0,
      knownUpcomingF24Other:0,safetyBuffer:0,
      currentLiquidity:Number(y.liquidity||0),taxReserveHeld:Number(y.reserveHeld||0)
    }
  };
}""")

replace_function("vfCalculateSelected","""function vfCalculateSelected(){
  const year=Number(VF_MODEL.selectedYear||2026);
  if(!VF_MODEL.profile||!Number.isInteger(year)||year<2026||year>2035)return null;
  try{
    const r=calculateVFiscal(vfInputForYear(year),vfRulesForYear(year));
    vfSaveCalculation(r,year);
    return r;
  }catch(e){console.warn('Calcolo '+year+' non disponibile',e);return null}
}""")

replace_function("vfPopulateYearSelector","""function vfPopulateYearSelector(){
  const sel=document.getElementById('taxYearSelector');if(!sel)return;
  const selected=Number(VF_MODEL.selectedYear||2026),current=new Date().getFullYear();
  const maxYear=Math.min(2035,Math.max(2029,current+3,selected));
  const years=[];for(let y=2026;y<=maxYear;y++)years.push(y);
  sel.innerHTML=years.map(y=>'<option value="'+y+'">'+y+'</option>').join('');
  sel.value=String(selected);
}""")

replace_function("refreshFromModel","""function refreshFromModel(){
  if(!VF_MODEL.profile)return;
  vfApplyProfileToInputs();vfSyncYearInputs();
  const r=vfCalculateSelected();updateDashboardUI();
  const line=document.getElementById('dashLiveLine');
  if(line&&r)line.textContent='Aggiornato ora • '+VF_MODEL.selectedYear+
    ' • '+eur(r.income.totalReceipts)+' di incassi'+
    (vfIsFutureFiscalEstimate(VF_MODEL.selectedYear)?' • parametri 2026 provvisori':'');
}""")

replace_function("switchTaxYear","""function switchTaxYear(value){
  const year=Number(value);
  if(!Number.isInteger(year)||year<2026||year>2035)return;
  VF_MODEL.selectedYear=year;vfYearByNumber(year);
  vfSaveModel();closeDashPanels();vfSyncYearInputs();updateDashboardUI();
}""")

old="""  // Calcola prima il 2026: il calendario saldo/acconti dipende dal risultato corrente.
  let currentYearResult=null;
  if(year===2026) currentYearResult=vfCalculateSelected()||calculateVFiscal(vfInputForYear(2026));
  const future=document.getElementById('futureYearNotice');if(future){future.style.display=year===2026?'none':'block';if(year!==2026)future.innerHTML="""
# The original line has a JS template literal: match only its reliable prefix, not interpolated content.
prefix=old
if s.count(prefix)!=1:raise SystemExit("Dashboard calculation entrypoint not found")
line_start=s.index(prefix)
line_end=s.index("\n",line_start+len(prefix))
replacement="""  const currentYearResult=vfCalculateSelected();
  const future=document.getElementById('futureYearNotice');
  if(future){
    future.style.display=year===2026?'none':'block';
    if(year!==2026){
      const start=Number((VF_MODEL.profile?.startDate||'2026').slice(0,4));
      const expired=Number(VF_MODEL.profile?.taxRate)===5&&year>=start+5;
      future.textContent='Stima '+year+' PROVVISORIA, basata sulle regole fiscali e INPS 2026. Aliquote, minimali e massimali devono essere aggiornati per '+year+'. Ogni annualità resta separata.'+
        (expired?' Dal sesto anno la simulazione applica il 15% al posto del 5%.':'');
    }
  }"""
s=s[:line_start]+replacement+s[line_end:]
i=s.index("function updateDashboardUI(){")
j=s.index("\n}",i)+2
chunk=s[i:j]
if chunk.count("  if(year===2026){")!=1:raise SystemExit("Expected exact year branch")
chunk=chunk.replace("  if(year===2026){","  if(currentYearResult){",1)
chunk=chunk.replace("vfThresholdForYear(2026)","vfThresholdForYear(year)")
chunk=chunk.replace("state.scheme==='custom'","VF_MODEL.profile?.socialScheme==='custom'")
chunk=chunk.replace("Limite 2026","Limite "+chr(36)+"{year}")
# The projection in a future year must NOT scale assumed receipts by elapsed days of 2026.
pat=r"    const elapsed=currentProjectionDays\(\{startDate:VF_MODEL.profile.startDate,activeDays:th.days\}\);.*?set\('opProjectionText',.*?\);"
if len(re.findall(pat,chunk,re.S))!=1:raise SystemExit("Dashboard projection block missing")
newprojection="""    if(year>new Date().getFullYear()){
      set('opProjectionText','Anno futuro: simula incassi in più senza salvarli.');
    }else if(year===new Date().getFullYear()){
      const elapsed=currentProjectionDays({startDate:VF_MODEL.profile.startDate,activeDays:th.days});
      const projection=elapsed>0?Math.max(receipts,receipts/elapsed*th.days):receipts;
      set('opProjectionText','Proiezione a fine anno '+year+': '+eur(projection)+
        ' • margine '+eur(Math.max(0,th.threshold-projection))+'.');
    }else{
      set('opProjectionText','Dati '+year+' archiviati per annualità. Verifica lo storico degli incassi.');
    }"""
chunk=re.sub(pat,lambda _:newprojection,chunk,count=1,flags=re.S)
s=s[:i]+chunk+s[j:]
single("rulePack:result.meta.rulePack};",
       "rulePack:result.meta.rulePack,parametersProvisional:vfIsFutureFiscalEstimate(year)};",
       "forecast provenance")

replace_function("runReceiptScenario","""function runReceiptScenario(){
  const box=document.getElementById('scenarioResult');
  const add=Number(document.getElementById('scenarioReceipt')?.value||0);
  if(!box)return;
  if(!Number.isFinite(add)||add<=0||add>100000000){
    alert('Inserisci un importo positivo e realistico.');return
  }
  const year=Number(VF_MODEL.selectedYear||2026);
  try{
    const input=vfInputForYear(year),alt=JSON.parse(JSON.stringify(input));
    alt.activities[0].receipts=Math.round((Number(alt.activities[0].receipts)+add)*100)/100;
    const pack=vfRulesForYear(year),before=calculateVFiscal(input,pack),after=calculateVFiscal(alt,pack);
    const dt=Math.max(0,Math.round((after.tax.substituteTax-before.tax.substituteTax)*100)/100);
    const dc=Math.max(0,Math.round((after.socialSecurity.estimatedCurrentYearContributions-before.socialSecurity.estimatedCurrentYearContributions)*100)/100);
    const delta=Math.round((dt+dc)*100)/100;
    const net=Math.round((add-delta)*100)/100;
    const limit=vfThresholdForYear(year).threshold;
    const status=after.eligibility.currentYearStatus;
    box.style.display='block';box.replaceChildren();
    const heading=document.createElement('h4');heading.textContent='Se incassi '+eur(add)+' in più · anno '+year;box.appendChild(heading);
    function line(title,value){
      const div=document.createElement('div');div.style.cssText='display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid #e5edf7';
      const label=document.createElement('span');label.textContent=title;
      const amount=document.createElement('strong');amount.textContent=value;amount.style.whiteSpace='nowrap';
      div.append(label,amount);box.appendChild(div);
    }
    const customScheme=input.socialSecurity?.scheme==='custom';
    const socialMissing=customScheme&&!Number(input.socialSecurity?.customEstimatedCurrentYear||0);
    const ineligible=status==='immediate_exit';
    line('Incassi annui simulati',eur(after.income.totalReceipts));
    line('Imposta aggiuntiva stimata',ineligible?'Non determinabile nel forfettario':eur(dt));
    line('Contributi aggiuntivi stimati',ineligible?'Da verificare':socialMissing?'Da completare':eur(dc));
    line('Da accantonare su questo incasso',ineligible||socialMissing?'Da verificare':eur(delta));
    if(!ineligible&&!socialMissing)line('Resta dall’incasso, prima delle spese',eur(net));
    line('Margine sul limite',limit===null?'Da verificare':eur(Math.max(0,limit-after.income.totalReceipts)));
    const note=document.createElement('p');note.style.cssText='font-size:12px;line-height:1.5;color:#657a99;margin:12px 0 0';
    const warning=status==='immediate_exit'?'ATTENZIONE: oltre 100.000 € il regime può cessare immediatamente: il calcolo sostitutivo non rappresenta l’imposta finale.':
      status==='exit_next_year'?'ATTENZIONE: limite ordinario superato; verifica la permanenza nel regime l’anno successivo.':
      'Nessun incasso viene registrato.';
    note.textContent=warning+
      ' Il netto è prima dei costi dell’attività. I contributi deducibili sono quelli realmente versati, non quelli soltanto stimati.'+
      (vfIsFutureFiscalEstimate(year)?' Parametri '+year+' provvisori, su base 2026.':'')+\n      (customScheme?' Previdenza Cassa professionale: il calcolo dipende dalle regole della Cassa e dall’importo inserito nel profilo.':'');
    box.appendChild(note);
  }catch(e){box.style.display='block';box.textContent='Simulazione non disponibile: '+e.message}
}""")

single("<p>Simula un nuovo incasso senza salvarlo nello storico.</p>",
       "<p>Scopri l’imposta aggiuntiva, i contributi e quanto accantonare su un nuovo incasso. Non cambia lo storico.</p>",
       "scenario description")
p.write_text(s)
print("MULTI-YEAR + SMART SCENARIO UPGRADE APPLIED")
