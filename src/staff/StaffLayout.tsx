import { useEffect, useId, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Inbox, LogOut, Mail, Menu, Plus, Settings, Store } from 'lucide-react';
import { api } from '../api';
import { Drawer, Icon, IconButton, Segmented, type IconType } from '../design/components';
import { useI18n, type Lang } from '../i18n';
import { initials } from '../lib/format';
import { BrandMark } from '../shared/BrandMark';
import { MockBar } from '../shared/MockBar';
import { usePreferences, type TextSize } from '../shared/Preferences';
import { useShop } from '../shared/ShopContext';
import { useStaffSession } from '../shared/StaffSession';
import { useLive, useNow } from '../shared/useLive';

function NavItem({ to, icon, label, count, end }: { to: string; icon: IconType; label: string; count?: number; end?: boolean }) {
  const { m } = useI18n();
  return (
    <NavLink to={to} end={end} className="pp-nav-link">
      <Icon icon={icon} />
      <span>{label}</span>
      {count != null && count > 0 && <span className="pp-nav-count" aria-label={m.staff.layout.activeCount(count)}>{count}</span>}
    </NavLink>
  );
}

export function PrinterStatus() {
  const { m, fmt } = useI18n();
  const t = m.staff.printer;
  const now = useNow(15_000);
  const { data } = useLive(() => api.agentStatus(), 'agent', { pollMs: 15_000 });
  if (!data) return <div className="pp-printer-pill"><span className="pp-dot is-off" />{t.checking}</div>;
  return (
    <div className="pp-printer-pill" role="status">
      <span className={data.online ? 'pp-dot' : 'pp-dot is-off'} aria-hidden="true" />
      <span>
        <strong>{data.online ? t.online : t.offline}</strong>
        <br />
        <span className="t-meta">
          {data.online ? t.connected : data.lastSeenAt ? t.lastSeen(fmt.duration(data.lastSeenAt, now)) : t.notSeen}
        </span>
      </span>
    </div>
  );
}

/** Language and text size, under the printer status in the sidebar and the phone menu. */
export function DisplayControls() {
  const { m, lang, setLang } = useI18n();
  const { prefs, setPref } = usePreferences();
  const t = m.staff.display;
  const langId = useId();
  const sizeId = useId();
  const sizes: TextSize[] = ['normal', 'large', 'xlarge'];
  return (
    <div className="pp-staff-display">
      <div className="pp-staff-display-row">
        <span className="t-label" id={langId}>{m.common.language}</span>
        <Segmented<Lang>
          labelledBy={langId}
          value={lang}
          onChange={setLang}
          options={[
            { value: 'fil', label: <span lang="fil">{m.common.filipino}</span> },
            { value: 'en', label: <span lang="en">{m.common.english}</span> },
          ]}
        />
      </div>
      <div className="pp-staff-display-row">
        <span className="t-label" id={sizeId}>{t.textSize}</span>
        <Segmented<TextSize>
          labelledBy={sizeId}
          value={prefs.textSize}
          onChange={(v) => setPref('textSize', v)}
          className="pp-staff-sizes"
          options={sizes.map((s) => ({
            value: s,
            label: (
              <>
                <span aria-hidden="true" className={`pp-staff-size-${s}`}>{t.sizes[s]}</span>
                <span className="mn-sr">{t.sizeNames[s]}</span>
              </>
            ),
          }))}
        />
      </div>
    </div>
  );
}

function Nav({ activeCount, isOwner }: { activeCount?: number; isOwner: boolean }) {
  const { m } = useI18n();
  const t = m.staff.layout.nav;
  return (
    <nav aria-label={m.staff.layout.navLabel} className="pp-nav">
      <NavItem to="/staff" end icon={Inbox} label={t.orders} count={activeCount} />
      <NavItem to="/staff/new" icon={Plus} label={t.walkIn} />
      {isOwner && <NavItem to="/staff/settings" icon={Settings} label={t.settings} />}
      <NavItem to="/staff/emails" icon={Mail} label={t.emails} />
      <Link to="/" className="pp-nav-link"><Icon icon={Store} /><span>{t.customerSite}</span></Link>
    </nav>
  );
}

export function StaffLayout() {
  const { m } = useI18n();
  const t = m.staff.layout;
  const { staff, signOut } = useStaffSession();
  const { shop } = useShop();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const counts = useLive(() => api.orderCounts(), 'counts');
  const active = counts.data ? counts.data.toPrint + counts.data.printing + counts.data.ready + counts.data.fileIssue : undefined;

  useEffect(() => setMenuOpen(false), [location.pathname, location.search]);
  if (!staff) return null;
  const isOwner = staff.role === 'owner';

  const user = (
    <div className="pp-user">
      <span className="pp-avatar" aria-hidden="true">{initials(staff.name)}</span>
      <div style={{ flex: '1 1 auto', minWidth: 0 }}>
        <p className="t-body-strong t-truncate">{staff.name}</p>
        <p className="t-meta">{isOwner ? t.owner : t.staff}</p>
      </div>
      <IconButton icon={LogOut} label={t.signOut} onClick={() => signOut()} />
    </div>
  );

  return (
    <>
      <MockBar />
      <div className="pp-staff">
        <aside className="pp-sidebar" aria-label={t.staffMenu}>
          <div className="pp-brand" style={{ padding: '4px 4px 0' }}>
            <BrandMark />
            <span className="t-truncate">{shop.name}</span>
          </div>
          <Nav activeCount={active} isOwner={isOwner} />
          <PrinterStatus />
          <DisplayControls />
          <div style={{ marginTop: 'auto' }}>{user}</div>
        </aside>

        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <header className="pp-topbar">
            <div className="pp-brand">
              <BrandMark />
              <span className="t-truncate">{shop.name}</span>
            </div>
            <IconButton icon={Menu} label={t.openMenu} onClick={() => setMenuOpen(true)} />
          </header>
          <Outlet />
        </div>
      </div>

      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} side="left" width={320} title={t.menu}>
        <div className="pp-stack-6" style={{ flex: '1 1 auto' }}>
          <Nav activeCount={active} isOwner={isOwner} />
          <PrinterStatus />
          <DisplayControls />
          <div style={{ marginTop: 'auto' }}>{user}</div>
        </div>
      </Drawer>
    </>
  );
}
