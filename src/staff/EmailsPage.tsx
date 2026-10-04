import { useMemo, useState } from 'react';
import { api } from '../api';
import { Alert, Card, Skeleton, TabPanel, Tabs } from '../design/components';
import { TEMPLATES, renderEmail, type EmailTemplate } from '../emails/render';
import { useI18n } from '../i18n';
import { useShop } from '../shared/ShopContext';
import { useLive } from '../shared/useLive';

/** Owner review of the three customer emails, filled with a sample order and the current shop details. */
export function EmailsPage() {
  const { shop } = useShop();
  const { m } = useI18n();
  const t = m.staff.emails;
  const [tab, setTab] = useState<EmailTemplate>('order_received');
  const sample = useLive(() => api.findOrderByCode('PRT-7K3QM'), 'email-sample', { live: false });
  const fallback = useLive(() => api.listOrders({ view: 'all' }), 'email-fallback', { live: false, enabled: sample.data === null });
  const order = sample.data ?? fallback.data?.find((o) => o.email) ?? null;

  const email = useMemo(() => {
    if (!order) return null;
    const trackingUrl = `${window.location.origin}/track`;
    return renderEmail(tab, order, shop, {
      trackingUrl,
      issueMessage: t.sampleIssue,
    });
  }, [order, shop, tab, t.sampleIssue]);

  return (
    <main className="pp-staff-main" id="main">
      <div className="pp-stack-2">
        <h1 className="t-display">{t.title}</h1>
        <p className="t-ink-2">{t.intro}</p>
      </div>
      <Alert tone="info">{t.englishNote}</Alert>
      <div>
        <Tabs<EmailTemplate>
          idBase="emails"
          label={t.tabsLabel}
          value={tab}
          onChange={setTab}
          tabs={(Object.keys(TEMPLATES) as EmailTemplate[]).map((k) => ({ value: k, label: t.tabs[k] }))}
        />
        <TabPanel idBase="emails" value={tab}>
          {!email ? (
            <Skeleton height={600} />
          ) : (
            <Card className="pp-stack" as="div">
              <dl className="pp-stack-2">
                <div className="pp-row"><dt className="t-label">{t.from}</dt><dd className="t-meta">{shop.name} &lt;{shop.email}&gt;</dd></div>
                <div className="pp-row"><dt className="t-label">{t.subject}</dt><dd className="t-body-strong" lang="en">{email.subject}</dd></div>
                <div className="pp-row"><dt className="t-label">{t.sent}</dt><dd className="t-meta">{t.sentWhen[tab]}</dd></div>
              </dl>
              <iframe title={t.frameTitle(t.tabs[tab])} className="pp-email-frame" srcDoc={email.html} sandbox="" />
            </Card>
          )}
        </TabPanel>
      </div>
    </main>
  );
}
