import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Plus, Printer, RotateCcw, Save, UserPlus } from 'lucide-react';
import { api, errorMessage, mockControls, type ShopSettings, type StaffMember, type StaffRole } from '../api';
import {
  Alert,
  Button,
  Card,
  Dialog,
  Field,
  SelectField,
  Skeleton,
  Switch,
  TabPanel,
  Tabs,
  toast,
} from '../design/components';
import { PAPER_LABEL, formatDuration } from '../lib/format';
import { PRINTER_FOR_PAPER } from '../lib/printers';
import { useShop } from '../shared/ShopContext';
import { useStaffSession } from '../shared/StaffSession';
import { useLive, useNow } from '../shared/useLive';

type Tab = 'shop' | 'staff' | 'printers';

export function SettingsPage() {
  const [tab, setTab] = useState<Tab>('shop');
  return (
    <main className="pp-staff-main" id="main">
      <div className="pp-stack-2">
        <h1 className="t-display">Shop settings</h1>
        <p className="t-ink-2">Only the owner can see and change these.</p>
      </div>
      <div>
        <Tabs<Tab>
          idBase="settings"
          label="Settings"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'shop', label: 'Shop details' },
            { value: 'staff', label: 'Staff accounts' },
            { value: 'printers', label: 'Printers' },
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
      toast('Shop details saved', { icon: Save });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSave} className="pp-two-col" noValidate>
      <Card title="Shop details" meta="Shown on the customer site, pickup details and emails" className="pp-stack">
        <Field label="Shop name" value={form.name} onChange={set('name')} />
        <Field label="Address" value={form.address} onChange={set('address')} hint="Street, barangay and city." />
        <Field label="Opening hours" value={form.hours} onChange={set('hours')} hint="For example: Mon–Sat 8:00 AM–7:00 PM" />
        <div className="pp-split">
          <Field label="Phone" type="tel" value={form.phone} onChange={set('phone')} />
          <Field label="Email" type="email" value={form.email} onChange={set('email')} hint="Customers reply here." />
        </div>
        {error && <Alert tone="error">{error}</Alert>}
        <div><Button type="submit" variant="primary" icon={Save} loading={busy}>Save changes</Button></div>
      </Card>
      <Card tone="sunk" title="Keeping files" className="pp-stack">
        <p className="t-ink-2">Files are deleted 7 days after an order is claimed. Orders that are never claimed lose their files after:</p>
        <Field
          label="Unclaimed orders"
          inputMode="numeric"
          value={days}
          suffix="days"
          onChange={(e) => setDays(e.target.value.replace(/\D/g, '').slice(0, 3))}
          hint="Counted from when the order is marked Ready. Order records are kept without files."
        />
      </Card>
    </form>
  );
}

function StaffAccounts() {
  const { staff: me } = useStaffSession();
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
      toast(`${m.name} can now sign in`, { icon: UserPlus });
      setAdding(false);
      setName('');
      setEmail('');
      setRole('staff');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const toggle = async (m: StaffMember, active: boolean) => {
    setBusy(m.id);
    try {
      await api.updateStaff(m.id, { active });
      toast(`${m.name} ${active ? 'can sign in again' : 'can no longer sign in'}`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="pp-stack">
      <div className="pp-row-between">
        <p className="t-ink-2">No public sign-up. Add each person here; they sign in with their email and a password.</p>
        <Button icon={Plus} onClick={() => setAdding(true)}>Add staff</Button>
      </div>
      {!list.data ? (
        <Skeleton lines={3} />
      ) : (
        <ul className="pp-settings-list" aria-label="Staff accounts">
          {list.data.map((m) => (
            <li key={m.id} className="pp-settings-item">
              <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                <p className="t-body-strong">{m.name}{m.id === me?.id ? ' (you)' : ''}</p>
                <p className="t-meta t-truncate">{m.email} · {m.role === 'owner' ? 'Owner' : 'Staff'}</p>
              </div>
              <Switch
                label={m.active ? 'Can sign in' : 'Turned off'}
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
        title="Add staff"
        description="They'll get an email to set their password."
        footer={
          <>
            <Button variant="quiet" onClick={() => setAdding(false)}>Cancel</Button>
            <Button variant="primary" icon={UserPlus} loading={busy === 'add'} onClick={add}>Add staff</Button>
          </>
        }
      >
        <div className="pp-stack">
          <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} data-autofocus />
          <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <SelectField
            label="Role"
            value={role}
            onChange={(e) => setRole(e.target.value as StaffRole)}
            options={[
              { value: 'staff', label: 'Staff: orders and printing' },
              { value: 'owner', label: 'Owner: also settings and accounts' },
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
  const agent = useLive(() => api.agentStatus(), 'agent', { pollMs: 15_000 });
  const [offline, setOffline] = useState(mockControls?.isAgentOffline() ?? false);
  const [resetOpen, setResetOpen] = useState(false);
  const a = agent.data;

  return (
    <div className="pp-two-col">
      <Card title="Shop laptop" meta="The print agent reports in every 30 seconds" className="pp-stack">
        <p className="pp-row">
          <span className={a?.online ? 'pp-dot' : 'pp-dot is-off'} aria-hidden="true" />
          <strong>{!a ? 'Checking…' : a.online ? 'Online' : 'Offline'}</strong>
          <span className="t-meta">
            {a?.online ? 'Seen just now' : a?.lastSeenAt ? `Last seen ${formatDuration(a.lastSeenAt, now)} ago` : ''}
          </span>
        </p>
        <span className="t-label">Printers reported</span>
        <ul className="pp-settings-list">
          {(Object.keys(PRINTER_FOR_PAPER) as Array<keyof typeof PRINTER_FOR_PAPER>).map((paper) => {
            const name = PRINTER_FOR_PAPER[paper];
            const seen = a?.printers.includes(name);
            return (
              <li key={paper} className="pp-settings-item">
                <Printer size={16} strokeWidth={1.5} aria-hidden="true" />
                <span style={{ flex: '1 1 auto' }}>{name}</span>
                <span className="t-meta">{PAPER_LABEL[paper]} paper{seen ? '' : ' · not found'}</span>
              </li>
            );
          })}
        </ul>
        <p className="t-small">
          One Windows printer entry per paper size, each with its paper set as default. Two-sided is manual: odd pages, flip, even pages.
        </p>
      </Card>

      {mockControls && (
        <Card tone="sunk" title="Sample data" meta="Preview only" className="pp-stack">
          <Switch
            label="Shop laptop is offline"
            hint="See how the dashboard looks when the print agent stops reporting. Jobs wait in the queue."
            checked={offline}
            onChange={(v) => {
              mockControls?.setAgentOffline(v);
              setOffline(v);
            }}
          />
          <div>
            <Button icon={RotateCcw} onClick={() => setResetOpen(true)}>Reset sample data</Button>
          </div>
          <Dialog
            open={resetOpen}
            alert
            onClose={() => setResetOpen(false)}
            title="Reset sample data"
            description="Puts back the original sample orders and settings. Orders you added in this preview are removed."
            footer={
              <>
                <Button variant="quiet" onClick={() => setResetOpen(false)}>Cancel</Button>
                <Button
                  variant="primary"
                  icon={RotateCcw}
                  onClick={() => {
                    mockControls?.resetSampleData();
                    setOffline(false);
                    setResetOpen(false);
                    toast('Sample data reset');
                  }}
                >
                  Reset sample data
                </Button>
              </>
            }
          />
        </Card>
      )}
    </div>
  );
}
