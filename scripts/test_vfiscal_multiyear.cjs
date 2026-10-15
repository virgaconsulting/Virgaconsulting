const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('dist/vfiscal-app.html','utf8');
const start=html.indexOf('const RULES_IT_2026 = Object.freeze(');
const end=html.indexOf('</script>',start);
assert(start>0&&end>start,'Tax core extraction failed');
const sandbox={
  console,Math,Date,Number,String,Array,Object,JSON,Set,Map,Intl,
  window:{},document:{getElementById:()=>null,querySelector:()=>null,addEventListener:()=>{}},
  localStorage:{getItem:()=>null,setItem:()=>{}},
  alert:()=>{},location:{},setTimeout:()=>0,clearTimeout:()=>{}
};
vm.createContext(sandbox);
const forecastFn=html.match(/^function vfRulesForYear\(year\)\{[\s\S]*?^\}/m);
assert(forecastFn,'Provisional year-rule function missing');
let core=html.slice(start,end);const listeners=core.indexOf("document.getElementById('receipts').addEventListener");if(listeners>0)core=core.slice(0,listeners);\nvm.runInContext(core+'\n'+forecastFn[0],sandbox,{timeout:1800,filename:'vfiscal-core-2026.js'});
const grab=name=>vm.runInContext(name,sandbox);
const annual=grab('vfRulesForYear'),calculate=grab('calculateVFiscal');
const p2026=annual(2026),p2027=annual(2027),p2028=annual(2028);
assert.equal(p2026.taxYear,2026);assert.equal(p2027.taxYear,2027);
assert.equal(p2028.taxYear,2028);
assert.match(p2027.id,/PREVISIONE/);
assert.equal(p2027.gestioneSeparata.professionalRate,p2026.gestioneSeparata.professionalRate);
const mk=(year,receipts,deductible=0,rate=0.05)=>({
  taxYear:year,
  activities:[{label:'Professionista',receipts,coefficient:0.78}],
  eligibility:{currentYearRevenueLimit:85000,previousYearReceipts:0,previousYearActiveDays:365,previousYearEmployeeCosts:0},
  startup:{requestedRate:rate,startYear:2026},
  socialSecurity:{scheme:'gestione_separata',otherMandatoryCoverage:false,monthsActive:12},
  cash:{deductibleMandatoryContributionsPaid:deductible,currentLiquidity:receipts,taxReserveHeld:0}
});
const close=(a,b,msg)=>assert(Math.abs(a-b)<0.011,msg+': '+a+' vs '+b);
for(const [year,pack] of [[2026,p2026],[2027,p2027],[2028,p2028]]){
  const r=calculate(mk(year,30000),pack);
  close(r.income.grossForfettarioIncome,23400,'forfettario income '+year);
  close(r.tax.substituteTax,1170,'substitute tax '+year);
  close(r.socialSecurity.estimatedCurrentYearContributions,6100.38,'GS contributions '+year);
  close(r.finance.maturedBurden,7270.38,'fiscal burden '+year);
  console.log('PASS',year,'income',r.income.grossForfettarioIncome,
    'tax',r.tax.substituteTax,'social',r.socialSecurity.estimatedCurrentYearContributions);
}
const paid=calculate(mk(2027,30000,2500),p2027);
close(paid.tax.substituteTax,1045,'only paid contributions deductible');
const simulated=calculate(mk(2027,31000,2500),p2027);
close(simulated.income.totalReceipts,31000,'simulation receipts');
assert(simulated.finance.maturedBurden>paid.finance.maturedBurden,'incremental burden');
assert(simulated.finance.maturedBurden-paid.finance.maturedBurden<1000,'incremental net remains positive');
assert(html.includes('PARAMETRI 2026'), 'provisional disclosure compiled');
assert(html.includes('runReceiptScenario()'),'simulator action retained');
assert(html.includes('Da accantonare su questo incasso'),'incremental reserve displayed');
console.log('PASS multi-year fiscal calculations and simulator');
