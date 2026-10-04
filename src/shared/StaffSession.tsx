import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api, type StaffMember } from '../api';
import { Skeleton } from '../design/components';

interface SessionCtx {
  staff: StaffMember | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<SessionCtx | null>(null);

export function StaffSessionProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<StaffMember | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setStaff(await api.currentStaff());
    } catch {
      setStaff(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    // Signing out in another tab, or an owner turning an account off, ends this session too.
    return api.subscribeOrders(refresh);
  }, [refresh]);

  const signIn = async (email: string, password: string) => {
    await api.signIn(email, password);
    await refresh();
  };
  const signOut = async () => {
    await api.signOut();
    await refresh();
  };

  return <Ctx.Provider value={{ staff, loading, signIn, signOut }}>{children}</Ctx.Provider>;
}

export function useStaffSession(): SessionCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStaffSession outside StaffSessionProvider');
  return ctx;
}

/** Staff-only routes: signed-out visitors go to the login page and come back after. */
export function RequireStaff({ children, ownerOnly }: { children: ReactNode; ownerOnly?: boolean }) {
  const { staff, loading } = useStaffSession();
  const location = useLocation();
  if (loading) {
    return (
      <div className="pp-container pp-section" aria-busy="true">
        <Skeleton lines={3} />
      </div>
    );
  }
  if (!staff) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/staff/login?next=${next}`} replace />;
  }
  if (ownerOnly && staff.role !== 'owner') return <Navigate to="/staff" replace />;
  return <>{children}</>;
}
