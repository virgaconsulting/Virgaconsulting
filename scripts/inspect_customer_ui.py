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
print('HANDLER DECLARATIONS')
for m in re.finditer(r'(?m)^(?:async\\s+)?function\\s+([\\w$]+)\\(',page):
    if any(x in m.group(1).lower() for x in ['payment','deadline','schedule','due','scad','dash','panel','calendar','year']):
        print(m.group(1),m.start())
