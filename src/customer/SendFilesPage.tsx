import { useEffect, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Bleed, Button, Field } from '../design/components';
import { OrderForm } from '../shared/OrderForm';
import { normalizeOrderCode } from '../lib/orderCode';

const STEPS = [
  { title: 'Upload your files', body: 'Add PDFs, Word files or photos, then choose paper, color and copies.' },
  { title: 'Get your order ID', body: 'We email it to you right away. Keep it for tracking and pickup.' },
  { title: 'Track your order', body: 'Check the status anytime with your order ID and email.' },
  { title: 'Claim at the counter', body: 'When it says Ready for pickup, show your order ID and pay at the shop.' },
];

export function SendFilesPage() {
  const navigate = useNavigate();
  const { hash } = useLocation();
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  const track = (e: FormEvent) => {
    e.preventDefault();
    navigate('/track', { state: { code: normalizeOrderCode(code), email } });
  };

  return (
    <>
      <Bleed tone="inverse" className="pp-hero">
        <h1 className="t-display-xl" style={{ maxWidth: 760 }}>Send your files. Pick them up printed.</h1>
        <p className="pp-hero-copy">
          Upload your documents, choose how they should be printed, and we'll email you an order ID. Use it to track your
          order and to claim it at the counter.
        </p>
        <p className="pp-hero-services">Printing · Xerox · Scanning · Lamination · Binding</p>
      </Bleed>

      <section className="pp-section" aria-label="Send files">
        <div className="pp-container">
          <OrderForm
            mode="customer"
            onSubmitted={({ code, email, name }) => navigate(`/order/${code}`, { state: { email, name } })}
          />
        </div>
      </section>

      <Bleed tone="block" id="how" title="How it works">
        <ol className="pp-how">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <span className="t-meta" style={{ color: 'var(--on-block)' }}>Step {i + 1}</span>
              <h3 className="t-title">{s.title}</h3>
              <p>{s.body}</p>
            </li>
          ))}
        </ol>
      </Bleed>

      <Bleed tone="sunk">
        <div className="pp-quick-track">
          <div className="pp-stack-2" style={{ flex: '1 1 300px' }}>
            <h2 className="t-title">Already sent your files?</h2>
            <p className="t-ink-2">Enter your order ID and email to see where your order is.</p>
          </div>
          <form className="pp-quick-track-form" onSubmit={track}>
            <Field label="Order ID" placeholder="PRT-7K3QM" value={code} onChange={(e) => setCode(e.target.value)} inputClassName="t-mono-id" autoCapitalize="characters" />
            <Field label="Email" type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button type="submit" icon={Search}>Track order</Button>
          </form>
        </div>
      </Bleed>
    </>
  );
}
