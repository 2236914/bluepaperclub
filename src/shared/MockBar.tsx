import { Link, useLocation } from 'react-router-dom';
import { isMock } from '../api';

/** A thin grey ribbon so nobody mistakes the review build for the live shop, with a jump between the two sides. */
export function MockBar() {
  const { pathname } = useLocation();
  if (!isMock) return null;
  const staffSide = pathname.startsWith('/staff');
  return (
    <div className="pp-mockbar" role="note">
      Sample data · Nothing is uploaded, printed or emailed in this preview ·{' '}
      <Link to={staffSide ? '/' : '/staff'}>{staffSide ? 'Open the customer site' : 'Open the staff dashboard'}</Link>
    </div>
  );
}
