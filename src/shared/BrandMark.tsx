import { Printer } from 'lucide-react';
import { Icon } from '../design/components';

export function BrandMark() {
  return (
    <span className="pp-mark" aria-hidden="true">
      <Icon icon={Printer} />
    </span>
  );
}
