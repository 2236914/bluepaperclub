import { typeLabel } from '../lib/files';
import { cx } from '../design/components';

/** The little paper-shaped type badge: PDF, DOCX, JPG. */
export function FileBadge({ name, small }: { name: string; small?: boolean }) {
  return (
    <span className={cx('pp-ftype', small && 'pp-ftype-sm')} aria-hidden="true">
      {typeLabel(name)}
    </span>
  );
}
