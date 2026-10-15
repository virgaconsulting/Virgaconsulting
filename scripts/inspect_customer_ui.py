from pathlib import Path
import re
page=Path('dist/vfiscal-app.html').read_text()
terms=['id="dashboardPro"','id="mainDashboardContent"','id="dashPanelPayments"','id="futureYearNotice"','id="dashTaxes"','id="dashPayments"','id="vfQuickStrip"','id="paymentCalendar"','id="paymentsPanel"','Prossimi versamenti','SALDO E ACCONTI','id="dashLiveLine"','function updateDashboardUI','function vfBuildPaymentProjection','function vfRenderPaymentCalendar','function renderPaymentCalendar','function vfBuildDeadlines','function showDashPanel','function closeDashPanels','function vfAnalyticsSnapshot']
for term in terms:
    hits=list(re.finditer(re.escape(term),page))
    print('TERM',term,'COUNT',len(hits))
    for item in hits[:3]:
        a=item.start()
        print('CONTEXT',a,repr(page[max(0,a-260):a+2200]))
print('PAYMENT IDS')
for m in re.finditer(r'<[^>]+id="([^"]*(?:pay|Pay|Deadline|deadline|due|Due|Scad|scad)[^"]*)"[^>]*>',page):
    print(m.group(1),repr(m.group(0)[:270]))
print('PAYMENT PANEL MARKUP:')
a=page.index('<div id="dashPanelPayments"')
b=page.index('<div id="dashPanelScenario"',a)
print(page[a:min(b,a+19000)])
print('CALENDAR/DEADLINES RENDER CODE:')
for token in ['function togglePaymentCalendar','function vfPopulatePaymentPanel','function vfBuildPaymentProjection','function updateDashboardUI','function vfRenderPaymentRecords','function vfBuildPaymentCalendar','function vfPaymentCalendar']:
    loc=page.find(token)
    if loc<0:continue
    end=page.find('\\n}',loc)
    print('FUNCTION',token,'length',end-loc if end>loc else 'unknown')
    print(page[loc:min(loc+14000,end+2 if end>loc else loc+14000)])
