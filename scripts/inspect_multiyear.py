from pathlib import Path
import re
s=Path("dist/vfiscal-app.html").read_text()
names=[
"calculateVFiscal","validateVFiscalInput","calculateForfettarioIncome","calculateGestioneSeparata","calculateArtCom","calculateSubstituteTax","calculateTax","calculateFinance",
"vfInputForYear","vfCalculateSelected","vfSaveCalculation","vfProjectedSocialAdvance","vfRenderPaymentPlan","vfCalculatePaymentPlan","vfRenderSummary","vfRenderScenario","updateDashboardUI","refreshFromModel","vfSyncYearInputs","vfSwitchYear","vfSetYear","vfYearByNumber","vfProjectedSocialAdvance","vfFinancialForecast","vfForecast","vfThresholdForYear",
]
for name in names:
    m=re.search(r'(?m)^(?:(?:async )?function\s+|const\s+)'+re.escape(name)+r'\b',s)
    if not m:
        m=re.search(r'(?m)^(?:(?:async )?function\s+|const\s+)'+re.escape(name)+r'\b',s)
    if not m: continue
    tail=s[m.start():]
    end=re.search(r'(?m)^\}\s*(?:;)?\s*$',tail)
    part=tail[:end.end()] if end else tail[:13000]
    print("\n===FUNCTION",name,"chars",len(part),"===")
    print(part[:14000])
for phrase in ["selectedYear","vfCalculateSelected()","vfProjectedSocialAdvance(","taxYear:2026","year===2026","year!==2026","taxYear !== rules.taxYear","Anno fiscale","name=\"taxYear\"","onchange=\"vf","function calculateVFiscal","function vfInputForYear","function vfSaveCalculation","function updateDashboardUI","function refreshFromModel"]:
    print("\n==SEARCH",phrase,"==")
    hits=list(re.finditer(re.escape(phrase),s))
    print("COUNT",len(hits))
    for hit in hits[:10]:
        print("AT",hit.start(),repr(s[max(0,hit.start()-260):min(len(s),hit.start()+330)]))
