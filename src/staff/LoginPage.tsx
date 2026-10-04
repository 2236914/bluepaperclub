import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { errorMessage, isMock } from '../api';
import { MOCK_PASSWORD } from '../api/mockApi';
import { SEED_STAFF } from '../api/seed';
import { Alert, Button, Card, Field } from '../design/components';
import { BrandMark } from '../shared/BrandMark';
import { MockBar } from '../shared/MockBar';
import { useShop } from '../shared/ShopContext';
import { useStaffSession } from '../shared/StaffSession';

export function LoginPage() {
  const { shop } = useShop();
  const { staff, signIn } = useStaffSession();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const next = params.get('next');
  const target = next && next.startsWith('/staff') ? next : '/staff';

  if (staff) return <Navigate to={target} replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
      navigate(target, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  const owner = SEED_STAFF.find((s) => s.role === 'owner')!;
  const helper = SEED_STAFF.find((s) => s.role === 'staff' && s.active)!;

  return (
    <>
      <MockBar />
      <div className="pp-login">
        <div className="pp-login-inner pp-stack-6">
          <Link to="/" className="pp-brand">
            <BrandMark />
            {shop.name}
          </Link>
          <Card className="pp-stack" as="div">
            <div className="pp-stack-2">
              <h1 className="t-title">Staff sign in</h1>
              <p className="t-ink-2">For shop staff only. Customers don't need an account.</p>
            </div>
            <form className="pp-stack" onSubmit={onSubmit} noValidate>
              <Field label="Email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Field label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              {error && <Alert tone="error">{error}</Alert>}
              <Button type="submit" variant="primary" size="lg" fullWidth icon={LogIn} loading={busy}>Sign in</Button>
            </form>
            <p className="t-small">Forgot your password? Ask the owner to reset it.</p>
          </Card>
          {isMock && (
            <Card tone="sunk" as="div" className="pp-stack-2">
              <span className="t-label">Sample accounts</span>
              <p className="t-small" style={{ color: 'var(--ink-2)' }}>
                Owner: <button type="button" className="pp-linkbtn" onClick={() => { setEmail(owner.email); setPassword(MOCK_PASSWORD); }}>{owner.email}</button>
                <br />
                Staff: <button type="button" className="pp-linkbtn" onClick={() => { setEmail(helper.email); setPassword(MOCK_PASSWORD); }}>{helper.email}</button>
                <br />
                Password for both: <span className="t-mono-id">{MOCK_PASSWORD}</span>
              </p>
            </Card>
          )}
          <Link to="/" className="t-small" style={{ color: 'var(--ink-2)' }}>Back to the customer site</Link>
        </div>
      </div>
    </>
  );
}
