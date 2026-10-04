import { isMock } from '../api';

/** A thin grey ribbon so nobody mistakes the review build for the live shop. */
export function MockBar() {
  if (!isMock) return null;
  return (
    <div className="pp-mockbar" role="note">
      Sample data · Nothing is uploaded, printed or emailed in this preview
    </div>
  );
}
