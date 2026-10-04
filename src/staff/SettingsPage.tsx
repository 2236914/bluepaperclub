import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { MessageCircle, Plus, Printer, RotateCcw, Save, UserPlus } from 'lucide-react';
import { api, errorMessage, mockControls, type ShopSettings, type StaffMember, type StaffRole } from '../api';
import {
  Alert,
  Button,
  Card,
  Dialog,
  Field,
  Icon,
  SelectField,
  Skeleton,
  Switch,
  TabPanel,
  Tabs,
  toast,
} from '../design/components';
import { useI18n } from '../i18n';
import { PAPER_LABEL } from '../lib/format';
import { PRINTER_FOR_PAPER } from '../lib/printers';
import { useShop } from '../shared/ShopContext';
import { useStaffSession } from '../shared/StaffSession';
import { useLive, useNow } from '../shared/useLive';

type Tab = 'shop' | 'staff' | 'printers';

export function SettingsPage() {
  const [tab, setTab] = useState<Tab>('shop');
  const { m } = useI18n();
  const t = m.staff.settings;
  return (
    <main className="pp-staff-main" id="main">
      <div className="pp-stack-2">
        <h1 className="t-display">{t.title}</h1>
        <p className="t-ink-2">{t.intro}</p>
      </div>
      <div>
        <Tabs<Tab>
          idBase="settings"
          label={t.tabsLabel}
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'shop', label: t.tabs.shop },
            { value: 'staff', label: t.tabs.staff },
            { value: 'printers', label: t.tabs.printers },
          ]}
        />
        <TabPanel idBase="settings" value={tab}>
          {tab === 'shop' && <ShopDetails />}
          {tab === 'staff' && <StaffAccounts />}
          {tab === 'printers' && <Printers />}
        </TabPanel>
      </div>
    </main>
  );
}

function ShopDetails() {
  const { shop, refresh } = useShop();
  const { m, fmt } = useI18n();
  const t = m.staff.settings;
  const [form, setForm] = useState<ShopSettings>(shop);
  const [days, setDays] = useState(String(shop.unclaimedDays));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setForm(shop);
    setDays(String(shop.unclaimedDays));
  }, [shop]);
  const set = (k: keyof ShopSettings) => (e: ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.updateShop({ ...form, unclaimedDays: Number.parseInt(days, 10) });
      refresh();
      toast(t.shop.saved, { icon: Save });
    } catch (err) {
      setError(fmt.error(errorMessage(err)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSave} className="pp-two-col" noValidate>
      <Card title={t.shop.title} meta={t.shop.meta} className="pp-stack">
        <Field label={t.shop.name} value={form.name} onChange={set('name')} />
        <Field label={t.shop.address} value={form.address} onChange={set('address')} hint={t.shop.addressHint} />
        <Field label={t.shop.hours} value={form.hours} onChange={set('hours')} hint={t.shop.hoursHint} />
        <div className="pp-split">
          <Field label={t.shop.phone} type="tel" value={form.phone} onChange={set('phone')} />
          <Field label={t.shop.email} type="email" value={form.email} onChange={set('email')} hint={t.shop.emailHint} />
        </div>
        <Field
          label={t.shop.messengerPage}
          value={form.messengerPage ?? ''}
          onChange={set('messengerPage')}
          hint={t.shop.messengerHint}
          icon={MessageCircle}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        {error && <Alert tone="error">{error}</Alert>}
        <div><Button type="submit" variant="primary" icon={Save} loading={busy}>{t.shop.save}</Button></div>
      </Card>
      <div className="pp-stack">
        <Card tone="sunk" title={t.messenger.title} className="pp-stack">
          <p className="pp-row" role="status">
            <Icon icon={MessageCircle} />
            <strong>{shop.messengerPage ? t.messenger.on(shop.messengerPage) : t.messenger.off}</strong>
          </p>
          <p className="t-ink-2">{t.messenger.explain}</p>
        </Card>
        <Card tone="sunk" title={t.keeping.title} className="pp-stack">
          <p className="t-ink-2">{t.keeping.body}</p>
          <Field
            label={t.keeping.label}
            inputMode="numeric"
            value={days}
            suffix={t.keeping.days}
            onChange={(e) => setDays(e.target.value.replace(/\D/g, '').slice(0, 3))}
            hint={t.keeping.hint}
          />
        </Card>
      </div>
    </form>
  );
}

function StaffAccounts() {
  const { staff: me } = useStaffSession();
  const { m: msg, fmt } = useI18n();
  const t = msg.staff.settings.staff;
  const list = useLive(() => api.listStaff(), 'staff-list');
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StaffRole>('staff');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const add = async () => {
    setBusy('add');
    setError(null);
    try {
      const m = await api.addStaff({ name, email, role });
      toast(t.added(m.name), { icon: UserPlus });
      setAdding(false);
      setName('');
      setEmail('');
      setRole('staff');
    } catch (err) {
      setError(fmt.error(errorMessage(err)));
    } finally {
      setBusy(null);
    }
  };

  const toggle = async (m: StaffMember, active: boolean) => {
    setBusy(m.id);
    try {
      await api.updateStaff(m.id, { active });
      toast(t.toggled(m.name, active));
    } catch (err) {
      toast.error(fmt.error(errorMessage(err)));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="pp-stack">
      <div className="pp-row-between">
        <p className="t-ink-2">{t.intro}</p>
        <Button icon={Plus} onClick={() => setAdding(true)}>{t.add}</Button>
      </div>
      {!list.data ? (
        <Skeleton lines={3} />
      ) : (
        <ul className="pp-settings-list" aria-label={t.listLabel}>
          {list.data.map((m) => (
            <li key={m.id} className="pp-settings-item">
              <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                <p className="t-body-strong">{m.name}{m.id === me?.id ? ` ${t.you}` : ''}</p>
                <p className="t-meta t-truncate">{m.email} · {m.role === 'owner' ? t.owner : t.staff}</p>
              </div>
              <Switch
                label={m.active ? t.canSignIn : t.turnedOff}
                checked={m.active}
                disabled={m.id === me?.id || busy === m.id}
                onChange={(v) => toggle(m, v)}
              />
            </li>
          ))}
        </ul>
      )}
      <Dialog
        open={adding}
        onClose={() => setAdding(false)}
        title={t.add}
        description={t.dialogDescription}
        footer={
          <>
            <Button variant="quiet" onClick={() => setAdding(false)}>{msg.common.cancel}</Button>
            <Button variant="primary" icon={UserPlus} loading={busy === 'add'} onClick={add}>{t.add}</Button>
          </>
        }
      >
        <div className="pp-stack">
          <Field label={t.name} value={name} onChange={(e) => setName(e.target.value)} data-autofocus />
          <Field label={t.email} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <SelectField
            label={t.role}
            value={role}
            onChange={(e) => setRole(e.target.value as StaffRole)}
            options={[
              { value: 'staff', label: t.roleStaff },
              { value: 'owner', label: t.roleOwner },
            ]}
          />
          {error && <Alert tone="error">{error}</Alert>}
        </div>
      </Dialog>
    </div>
  );
}

function Printers() {
  const now = useNow(15_000);
  const { m, fmt } = useI18n();
  const t = m.staff.settings.printers;
  const ts = m.staff.settings.sample;
  const agent = useLive(() => api.agentStatus(), 'agent', { pollMs: 15_000 });
  const [offline, setOffline] = useState(mockControls?.isAgentOffline() ?? false);
  const [resetOpen, setResetOpen] = useState(false);
  const a = agent.data;

  return (
    <div className="pp-two-col">
      <Card title={t.laptop} meta={t.laptopMeta} className="pp-stack">
        <p className="pp-row">
          <span className={a?.online ? 'pp-dot' : 'pp-dot is-off'} aria-hidden="true" />
          <strong>{!a ? t.checking : a.online ? t.online : t.offline}</strong>
          <span className="t-meta">
            {a?.online ? t.seenJustNow : a?.lastSeenAt ? m.staff.printer.lastSeen(fmt.duration(a.lastSeenAt, now)) : ''}
          </span>
        </p>
        <span className="t-label">{t.reported}</span>
        <ul className="pp-settings-list">
          {(Object.keys(PRINTER_FOR_PAPER) as Array<keyof typeof PRINTER_FOR_PAPER>).map((paper) => {
            const name = PRINTER_FOR_PAPER[paper];
            const seen = a?.printers.includes(name);
            return (
              <li key={paper} className="pp-settings-item">
                <Printer size={16} strokeWidth={1.5} aria-hidden="true" />
                <span style={{ flex: '1 1 auto' }}>{name}</span>
                <span className="t-meta">{t.paperLine(PAPER_LABEL[paper], Boolean(seen))}</span>
              </li>
            );
          })}
        </ul>
        <p className="t-small">
          {t.note}
        </p>
      </Card>

      {mockControls && (
        <Card tone="sunk" title={ts.title} meta={ts.meta} className="pp-stack">
          <Switch
            label={ts.offline}
            hint={ts.offlineHint}
            checked={offline}
            onChange={(v) => {
              mockControls?.setAgentOffline(v);
              setOffline(v);
            }}
          />
          <div>
            <Button icon={RotateCcw} onClick={() => setResetOpen(true)}>{ts.reset}</Button>
          </div>
          <Dialog
            open={resetOpen}
            alert
            onClose={() => setResetOpen(false)}
            title={ts.reset}
            description={ts.resetDescription}
            footer={
              <>
                <Button variant="quiet" onClick={() => setResetOpen(false)}>{m.common.cancel}</Button>
                <Button
                  variant="primary"
                  icon={RotateCcw}
                  onClick={() => {
                    mockControls?.resetSampleData();
                    setOffline(false);
                    setResetOpen(false);
                    toast(ts.resetDone);
                  }}
                >
                  {ts.reset}
                </Button>
              </>
            }
          />
        </Card>
      )}
    </div>
  );
}
