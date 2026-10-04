import { useI18n } from '../i18n';
import { useShop } from './ShopContext';

/** Plain-language notice for the consent checkbox (Data Privacy Act of 2012). Review before going live. */
export function PrivacyNotice() {
  const { shop } = useShop();
  const { m } = useI18n();
  const p = m.customer.privacy;
  return (
    <div className="pp-prose">
      <p>{p.intro(shop.name)}</p>
      <h3>{p.whatTitle}</h3>
      <p>{p.what}</p>
      <h3>{p.whyTitle}</h3>
      <p>{p.why}</p>
      <h3>{p.whoTitle}</h3>
      <p>{p.who}</p>
      <h3>{p.keepTitle}</h3>
      <p>{p.keep(shop.unclaimedDays)}</p>
      <h3>{p.rightsTitle}</h3>
      <p>{p.rights(shop.email, shop.phone)}</p>
    </div>
  );
}
