from pathlib import Path
import re
s=Path("dist/vfiscal-app.html").read_text()
names=[
"evaluateEligibility","vfPopulateYearSelector","switchTaxYear","vfPaymentCalendar","vfPaymentPlan","taxAdvanceFromHistory","renderPaymentCalendar","calculateVFiscal","vfCalculateSelected","vfInputForYear","updateDashboardUI","vfSimulate","runSimulation","simulateScenario","vfScenario","simulateIncome","vfSaveCalculation","vfPaymentSourceYear","vfMonthsActiveForYear"]
for name in names:
    m=re.search(r'(?m)^(?:(?:async )?function\s+|const\s+)'+re.escape(name)+r'\b',s)
    if not m:
        m=re.search(r'(?m)^(?:(?:async )?function\s+|const\s+)'+re.escape(name)+r'\b',s)
    if not m: continue
    tail=s[m.start():]
    end=re.search(r'(?m)^\}\s*(?:;)?\s*$',tail)
    part=tail[:end.end()] if end else tail[:13000]
    print("\n===FUNCTION",name,"chars",len(part),"===")
    print(part[:16000])

for phrase in ["simulat","Simul","scenario","Scenario","simReceipt","simAmount","taxYearSelector","vfYearInputs","futureYearNotice"]:
    hits=list(re.finditer(re.escape(phrase),s,re.I))
    print("LOOKUP",phrase,"COUNT",len(hits))
    for hit in hits[:22]:print("FOUND",hit.start(),repr(s[max(0,hit.start()-120):hit.start()+260]))
