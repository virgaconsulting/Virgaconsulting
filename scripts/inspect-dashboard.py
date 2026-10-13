from pathlib import Path
import re
s=Path('dist/vfiscal-app.html').read_text()
print('APP_LEN',len(s))
for pattern in [
    r'(?:const|let|var)\s+VF_MODEL\b',
    r'function\s+(?:vf|VF|render|Render|save|load)[A-Za-z0-9_$]*\s*\(',
    r'id="(?:dashboard|overview|main|app|movementAmount|yearSelect|selectedYear)[^"]*"',
    r'function\s+vfDefaultYear\s*\(',
    r'(?:const|let|var)\s+state\s*=',
    r'\bVF_MODEL\.years\b',
    r'\bVF_MODEL\.profile\b',
    r'\.movements\b',
    r'\.openingBalance\b',
    r'\.heldReserve\b',
]:
    ms=list(re.finditer(pattern,s,re.I))
    print('PATTERN',pattern,'COUNT',len(ms))
    for m in ms[:24]:
        p=m.start()
        print('CONTEXT',p,repr(s[max(0,p-150):p+380]))
for key in ['function vfDefaultYear','function vfDefaultModel','function vfRenderDashboard','function renderDashboard','function vfRender','function vfLoad','function renderApp','function vfCalculate','function calculate','function vfSaveMovement','function saveMovement','const VF_MODEL','let VF_MODEL','const RULES_IT_2026','function compute','id="dashboard"','id="viewDashboard"']:
    p=s.find(key)
    print('DEFINITION',key,p,repr(s[p:p+1800] if p>=0 else ''))
