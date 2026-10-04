import { useShop } from './ShopContext';

/** Plain-language notice for the consent checkbox (Data Privacy Act of 2012). Review before going live. */
export function PrivacyNotice() {
  const { shop } = useShop();
  return (
    <div className="pp-prose">
      <p>
        {shop.name} collects only what it needs to print your order. Uploads often include IDs and school records, so we
        keep them private and delete them on a schedule.
      </p>
      <h3>What we collect</h3>
      <p>Your name, email, mobile number if you give it, your print settings and the files you upload.</p>
      <h3>Why</h3>
      <p>To print your order, to email you your order ID and status, and to contact you if a file has a problem.</p>
      <h3>Who sees it</h3>
      <p>Only our staff. Files are stored in a private bucket and opened only through links that expire in minutes.</p>
      <h3>How long we keep it</h3>
      <p>
        We delete your files 7 days after you claim your order, or {shop.unclaimedDays} days after it is ready if it is never
        claimed. We keep the order record (no files) for our books.
      </p>
      <h3>Your rights</h3>
      <p>
        Under the Data Privacy Act of 2012 you can ask to see, correct or delete your information. Email {shop.email} or
        call {shop.phone}.
      </p>
    </div>
  );
}
