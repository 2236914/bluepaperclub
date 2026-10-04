import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Inbox, LogOut, Mail, Menu, Plus, Settings, Store } from 'lucide-react';
import { api } from '../api';
import { Drawer, Icon, IconButton, type IconType } from '../design/components';
import { formatDuration, initials } from '../lib/format';
import { BrandMark } from '../shared/BrandMark';
import { MockBar } from '../shared/MockBar';
import { useShop } from '../shared/ShopContext';
import { useStaffSession } from '../shared/StaffSession';
import { useLive, useNow } from '../shared/useLive';

function NavItem({ to, icon, label, count, end }: { to: string; icon: IconType; label: string; count?: number; end?: boolean }) {
  return (
    <NavLink to={to} end={end} className="pp-nav-link">
      <Icon icon={icon} />
      <span>{label}</span>
      {count != null && count > 0 && <span className="pp-nav-count" aria-label={`${count} active`}>{count}</span>}
    </NavLink>
  );
}

export function PrinterStatus() {
  const now = useNow(15_000);
  const { data } = useLive(() => api.agentStatus(), 'agent', { pollMs: 15_000 });
  if (!data) return <div className="pp-printer-pill"><span className="pp-dot is-off" />Checking printer…</div>;
  return (
    <div className="pp-printer-pill" role="status">
      <span className={data.online ? 'pp-dot' : 'pp-dot is-off'} aria-hidden="true" />
      <span>
        <strong>Counter printer {data.online ? 'online' : 'offline'}</strong>
        <br />
        <span className="t-meta">
          {data.online ? 'Shop laptop connected' : data.lastSeenAt ? `Last seen ${formatDuration(data.lastSeenAt, now)} ago` : 'Not seen yet'}
        </span>
      </span>
    </div>
  );
}

function Nav({ activeCount, isOwner }: { activeCount?: number; isOwner: boolean }) {
  return (
    <nav aria-label="Staff" className="pp-nav">
      <NavItem to="/staff" end icon={Inbox} label="Orders" count={activeCount} />
      <NavItem to="/staff/new" icon={Plus} label="Add walk-in order" />
      {isOwner && <NavItem to="/staff/settings" icon={Settings} label="Shop settings" />}
      <NavItem to="/staff/emails" icon={Mail} label="Email previews" />
      <Link to="/" className="pp-nav-link"><Icon icon={Store} /><span>Customer site</span></Link>
    </nav>
  );
}

export function StaffLayout() {
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
        <p className="t-meta">{isOwner ? 'Owner' : 'Staff'}</p>
      </div>
      <IconButton icon={LogOut} label="Sign out" onClick={() => signOut()} />
    </div>
  );

  return (
    <>
      <MockBar />
      <div className="pp-staff">
        <aside className="pp-sidebar" aria-label="Staff menu">
          <div className="pp-brand" style={{ padding: '4px 4px 0' }}>
            <BrandMark />
            <span className="t-truncate">{shop.name}</span>
          </div>
          <Nav activeCount={active} isOwner={isOwner} />
          <PrinterStatus />
          <div style={{ marginTop: 'auto' }}>{user}</div>
        </aside>

        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <header className="pp-topbar">
            <div className="pp-brand">
              <BrandMark />
              <span className="t-truncate">{shop.name}</span>
            </div>
            <IconButton icon={Menu} label="Open menu" onClick={() => setMenuOpen(true)} />
          </header>
          <Outlet />
        </div>
      </div>

      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} side="left" width={300} title="Menu">
        <div className="pp-stack-6" style={{ flex: '1 1 auto' }}>
          <Nav activeCount={active} isOwner={isOwner} />
          <PrinterStatus />
          <div style={{ marginTop: 'auto' }}>{user}</div>
        </div>
      </Drawer>
    </>
  );
}
