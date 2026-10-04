import { useEffect, useRef } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Search, Upload } from 'lucide-react';
import { ButtonLink } from '../design/components';
import { useI18n } from '../i18n';
import { useShop } from '../shared/ShopContext';
import { BrandMark } from '../shared/BrandMark';
import { MockBar } from '../shared/MockBar';
import { HelpProvider } from '../shared/help/HelpProvider';
import { EasyBar } from '../shared/help/EasyBar';
import { Welcome } from '../shared/help/Welcome';

/** True while a dialog, drawer or tour popover holds the focus; page changes then leave focus alone. */
function modalOpen(): boolean {
  return document.querySelector('[aria-modal="true"]') !== null;
}

export function CustomerLayout() {
  const { shop } = useShop();
  const { m } = useI18n();
  const t = m.customer.layout;
  const { pathname, hash } = useLocation();
  const onTrack = pathname.startsWith('/track');
  const mainRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);

  // A new page starts at the top, and screen readers hear the new page instead of staying on the link.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (!hash) window.scrollTo(0, 0);
    if (!modalOpen()) mainRef.current?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <HelpProvider>
      <a className="mn-btn mn-btn-primary pp-skip" href="#main">{m.common.skipToContent}</a>
      <MockBar />
      <header className="pp-site-header pp-cu-header">
        <div className="pp-container pp-site-header-inner">
          <Link to="/" className="pp-brand" aria-label={t.homeLink(shop.name)}>
            <BrandMark />
            <span className="t-truncate">{shop.name}</span>
          </Link>
          <nav aria-label={t.navLabel} className="pp-site-nav">
            <ButtonLink to="/#how" variant="quiet" className="pp-hide-phone">{t.howItWorks}</ButtonLink>
            {onTrack ? (
              <ButtonLink to="/" icon={Upload}>{t.sendFiles}</ButtonLink>
            ) : (
              <ButtonLink to="/track" icon={Search} data-tour="track">{t.trackOrder}</ButtonLink>
            )}
          </nav>
        </div>
      </header>
      <EasyBar />
      <main id="main" ref={mainRef} tabIndex={-1} className="pp-cu-main">
        <Outlet />
      </main>
      <footer className="pp-site-footer">
        <div className="pp-container pp-footer-grid">
          <div className="pp-stack-2">
            <p className="t-body-strong">{shop.name}</p>
            <p className="t-small">{shop.address}</p>
          </div>
          <div className="pp-stack-2">
            <span className="t-label">{t.hours}</span>
            <p>{shop.hours}</p>
          </div>
          <div className="pp-stack-2">
            <span className="t-label">{t.contact}</span>
            <p>{shop.phone}</p>
            <p className="t-small pp-cu-break">{shop.email}</p>
          </div>
          <div className="pp-stack-2">
            <span className="t-label">{t.staff}</span>
            <Link to="/staff" className="t-small pp-cu-footer-link">{t.staffSignIn}</Link>
          </div>
        </div>
      </footer>
      <Welcome />
    </HelpProvider>
  );
}
