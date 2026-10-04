import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { errorMessage, isMock } from '../api';
import { MOCK_PASSWORD } from '../api/mockApi';
import { SEED_STAFF } from '../api/seed';
import { Alert, Button, Card, Field, Segmented } from '../design/components';
import { useI18n, type Lang } from '../i18n';
import { BrandMark } from '../shared/BrandMark';
import { MockBar } from '../shared/MockBar';
import { useShop } from '../shared/ShopContext';
import { useStaffSession } from '../shared/StaffSession';

export function LoginPage() {
  const { shop } = useShop();
  const { m, fmt, lang, setLang } = useI18n();
  const t = m.staff.login;
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
      setError(fmt.error(t.missing));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
      navigate(target, { replace: true });
    } catch (err) {
      setError(fmt.error(errorMessage(err)));
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
              <h1 className="t-title">{t.title}</h1>
              <p className="t-ink-2">{t.intro}</p>
            </div>
            <form className="pp-stack" onSubmit={onSubmit} noValidate>
              <Field label={t.email} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Field label={t.password} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              {error && <Alert tone="error">{error}</Alert>}
              <Button type="submit" variant="primary" size="lg" fullWidth icon={LogIn} loading={busy}>{t.signIn}</Button>
            </form>
            <p className="t-small">{t.forgot}</p>
          </Card>
          {isMock && (
            <Card tone="sunk" as="div" className="pp-stack-2">
              <span className="t-label">{t.sampleTitle}</span>
              <p className="t-small">{t.sampleHint}</p>
              <p className="t-small" style={{ color: 'var(--ink-2)' }}>
                {t.owner} <button type="button" className="pp-linkbtn" onClick={() => { setEmail(owner.email); setPassword(MOCK_PASSWORD); }}>{owner.email}</button>
                <br />
                {t.staff} <button type="button" className="pp-linkbtn" onClick={() => { setEmail(helper.email); setPassword(MOCK_PASSWORD); }}>{helper.email}</button>
                <br />
                {t.passwordBoth} <span className="t-mono-id">{MOCK_PASSWORD}</span>
              </p>
            </Card>
          )}
          <div className="pp-staff-display-row">
            <span className="t-label" id="login-lang">{m.common.language}</span>
            <Segmented<Lang>
              labelledBy="login-lang"
              value={lang}
              onChange={setLang}
              options={[
                { value: 'fil', label: <span lang="fil">{m.common.filipino}</span> },
                { value: 'en', label: <span lang="en">{m.common.english}</span> },
              ]}
            />
          </div>
          <Link to="/" className="t-small" style={{ color: 'var(--ink-2)' }}>{t.backToSite}</Link>
        </div>
      </div>
    </>
  );
}
