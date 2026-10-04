import { Search, Upload } from 'lucide-react';
import { Bleed, ButtonLink } from '../design/components';

export function NotFoundPage() {
  return (
    <Bleed tone="sunk">
      <h1 className="t-display">This page doesn't exist</h1>
      <p className="t-ink-2">Check the link, or start from one of these.</p>
      <div className="pp-row">
        <ButtonLink to="/" variant="primary" icon={Upload}>Send files</ButtonLink>
        <ButtonLink to="/track" icon={Search}>Track an order</ButtonLink>
      </div>
    </Bleed>
  );
}
