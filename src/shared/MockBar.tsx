import { Link, useLocation } from 'react-router-dom';
import { isMock } from '../api';
import { useI18n } from '../i18n';

/** A thin grey ribbon so nobody mistakes the review build for the live shop, with a jump between the two sides. */
export function MockBar() {
  const { pathname } = useLocation();
  const { m } = useI18n();
  if (!isMock) return null;
  const staffSide = pathname.startsWith('/staff');
  return (
    <div className="pp-mockbar" role="note">
      {m.common.sampleData} ·{' '}
      <Link to={staffSide ? '/' : '/staff'}>{staffSide ? m.common.openCustomer : m.common.openStaff}</Link>
    </div>
  );
}
