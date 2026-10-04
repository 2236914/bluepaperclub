import { Link, Outlet, useLocation } from 'react-router-dom';
import { Search, Upload } from 'lucide-react';
import { ButtonLink } from '../design/components';
import { useShop } from '../shared/ShopContext';
import { BrandMark } from '../shared/BrandMark';
import { MockBar } from '../shared/MockBar';
import { HelpProvider } from '../shared/help/HelpProvider';
import { EasyBar } from '../shared/help/EasyBar';
import { Welcome } from '../shared/help/Welcome';

export function CustomerLayout() {
  const { shop } = useShop();
  const { pathname } = useLocation();
  const onTrack = pathname.startsWith('/track');
  return (
    <HelpProvider>
      <a className="mn-btn mn-btn-primary pp-skip" href="#main">Skip to content</a>
      <MockBar />
      <header className="pp-site-header">
        <div className="pp-container pp-site-header-inner">
          <Link to="/" className="pp-brand">
            <BrandMark />
            <span className="t-truncate">{shop.name}</span>
          </Link>
          <nav aria-label="Main" className="pp-site-nav">
            <ButtonLink to="/#how" variant="quiet" size="sm" className="pp-hide-phone">How it works</ButtonLink>
            {onTrack ? (
              <ButtonLink to="/" size="sm" icon={Upload}>Send files</ButtonLink>
            ) : (
              <ButtonLink to="/track" size="sm" icon={Search} data-tour="track">Track an order</ButtonLink>
            )}
          </nav>
        </div>
      </header>
      <EasyBar />
      <main id="main" tabIndex={-1} style={{ outline: 'none' }}>
        <Outlet />
      </main>
      <footer className="pp-site-footer">
        <div className="pp-container pp-footer-grid">
          <div className="pp-stack-2">
            <p className="t-body-strong">{shop.name}</p>
            <p className="t-small">{shop.address}</p>
          </div>
          <div className="pp-stack-2">
            <span className="t-label">Hours</span>
            <p>{shop.hours}</p>
          </div>
          <div className="pp-stack-2">
            <span className="t-label">Contact</span>
            <p>{shop.phone}</p>
            <p className="t-small">{shop.email}</p>
          </div>
          <div className="pp-stack-2">
            <span className="t-label">Staff</span>
            <Link to="/staff" className="t-small" style={{ color: 'var(--ink-2)' }}>Staff sign in</Link>
          </div>
        </div>
      </footer>
      <Welcome />
    </HelpProvider>
  );
}
