import { useMemo, useState } from 'react';
import { api } from '../api';
import { Card, Skeleton, TabPanel, Tabs } from '../design/components';
import { TEMPLATES, renderEmail, type EmailTemplate } from '../emails/render';
import { useShop } from '../shared/ShopContext';
import { useLive } from '../shared/useLive';

/** Owner review of the three customer emails, filled with a sample order and the current shop details. */
export function EmailsPage() {
  const { shop } = useShop();
  const [tab, setTab] = useState<EmailTemplate>('order_received');
  const sample = useLive(() => api.findOrderByCode('PRT-7K3QM'), 'email-sample', { live: false });
  const fallback = useLive(() => api.listOrders({ view: 'all' }), 'email-fallback', { live: false, enabled: sample.data === null });
  const order = sample.data ?? fallback.data?.find((o) => o.email) ?? null;

  const email = useMemo(() => {
    if (!order) return null;
    const trackingUrl = `${window.location.origin}/track`;
    return renderEmail(tab, order, shop, {
      trackingUrl,
      issueMessage: 'Page 2 of Enrollment_Form.docx is cut off at the bottom. Please send the full page.',
    });
  }, [order, shop, tab]);

  return (
    <main className="pp-staff-main" id="main">
      <div className="pp-stack-2">
        <h1 className="t-display">Email previews</h1>
        <p className="t-ink-2">What customers receive. Shop details come from Shop settings; the order is a sample.</p>
      </div>
      <div>
        <Tabs<EmailTemplate>
          idBase="emails"
          label="Email templates"
          value={tab}
          onChange={setTab}
          tabs={(Object.keys(TEMPLATES) as EmailTemplate[]).map((k) => ({ value: k, label: TEMPLATES[k].label }))}
        />
        <TabPanel idBase="emails" value={tab}>
          {!email ? (
            <Skeleton height={600} />
          ) : (
            <Card className="pp-stack" as="div">
              <dl className="pp-stack-2">
                <div className="pp-row"><dt className="t-label">From</dt><dd className="t-meta">{shop.name} &lt;{shop.email}&gt;</dd></div>
                <div className="pp-row"><dt className="t-label">Subject</dt><dd className="t-body-strong">{email.subject}</dd></div>
                <div className="pp-row"><dt className="t-label">Sent</dt><dd className="t-meta">{TEMPLATES[tab].label === 'Order received' ? 'Right after the customer submits' : `When staff set the status to ${TEMPLATES[tab].label} with the email box on`}</dd></div>
              </dl>
              <iframe title={`${TEMPLATES[tab].label} email`} className="pp-email-frame" srcDoc={email.html} sandbox="" />
            </Card>
          )}
        </TabPanel>
      </div>
    </main>
  );
}
