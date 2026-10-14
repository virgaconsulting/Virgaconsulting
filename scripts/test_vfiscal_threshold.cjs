const fs=require('node:fs');
const assert=require('node:assert/strict');
const html=fs.readFileSync('dist/vfiscal-app.html','utf8');
const match=html.match(/^function vfThresholdForYear\(year\)\{[\s\S]*?^\}/m);
assert(match,'Fiscal threshold function missing from production build');
const validISODate=(value)=>{
  const m=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m)return false;
  const y=+m[1],mo=+m[2],d=+m[3];
  const dt=new Date(Date.UTC(y,mo-1,d));
  return dt.getUTCFullYear()===y&&dt.getUTCMonth()===mo-1&&dt.getUTCDate()===d;
};
function calculate(date,year){
  return new Function('VF_MODEL','vfIsValidISODate',match[0]+';return vfThresholdForYear;')({profile:{startDate:date}},validISODate)(year);
}
for(const [name,date,year,days,amount,yearDays] of [
  ['full year 2026','2026-01-01',2026,365,85000,365],
  ['June 1 2026','2026-06-01',2026,214,49835.62,365],
  ['June 15 2026','2026-06-15',2026,200,46575.34,365],
  ['July 1 2026','2026-07-01',2026,184,42849.32,365],
  ['next year after opening','2026-06-15',2027,365,85000,365],
  ['leap year February 29','2028-02-29',2028,307,71297.81,366],
  ['prior year before opening','2027-07-01',2026,0,0,365],
]){
  const d=calculate(date,year);
  assert.equal(d.days,days,name+' days');
  assert.equal(d.threshold,amount,name+' limit');
  assert.equal(d.yearDays,yearDays,name+' yearDays');
  console.log('PASS',name,days+'/'+yearDays,amount+' EUR');
}
for(const date of ['', '2026-06-31', 'garbage']){
  const d=calculate(date,2026);
  assert.equal(d.threshold,null,'must not display 85k for bad opening date');
  assert.equal(d.missingDate,true);
}
const graph=fs.readFileSync('dist/site-assets/vfiscal-dashboard-v3.js','utf8');
for(const required of ['ragguagliato','100000','thresholdDays','yearDays','Profilo fiscale']){
  assert(graph.includes(required), 'Missing graph threshold wording: '+required);
}
console.log('First-year dashboard threshold regression tests passed.');
