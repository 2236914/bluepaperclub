import { RouterProvider, createBrowserRouter, createHashRouter, createMemoryRouter, Navigate, type RouteObject } from 'react-router-dom';
import { Toaster } from './design/components';
import { CustomerLayout } from './customer/CustomerLayout';
import { SendFilesPage } from './customer/SendFilesPage';
import { OrderReceivedPage } from './customer/OrderReceivedPage';
import { TrackPage } from './customer/TrackPage';
import { LoginPage } from './staff/LoginPage';
import { StaffLayout } from './staff/StaffLayout';
import { DashboardPage } from './staff/DashboardPage';
import { NewOrderPage } from './staff/NewOrderPage';
import { SettingsPage } from './staff/SettingsPage';
import { EmailsPage } from './staff/EmailsPage';
import { ShopProvider } from './shared/ShopContext';
import { RequireStaff, StaffSessionProvider } from './shared/StaffSession';
import { NotFoundPage } from './customer/NotFoundPage';

const routes: RouteObject[] = [
  {
    element: <CustomerLayout />,
    children: [
      { path: '/', element: <SendFilesPage /> },
      { path: '/order/:code', element: <OrderReceivedPage /> },
      { path: '/track', element: <TrackPage /> },
    ],
  },
  { path: '/staff/login', element: <LoginPage /> },
  {
    path: '/staff',
    element: (
      <RequireStaff>
        <StaffLayout />
      </RequireStaff>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'new', element: <NewOrderPage /> },
      {
        path: 'settings',
        element: (
          <RequireStaff ownerOnly>
            <SettingsPage />
          </RequireStaff>
        ),
      },
      { path: 'emails', element: <EmailsPage /> },
      { path: '*', element: <Navigate to="/staff" replace /> },
    ],
  },
  { element: <CustomerLayout />, children: [{ path: '*', element: <NotFoundPage /> }] },
];

// Cloudflare Pages serves index.html for every path (public/_redirects). Hosts without rewrites use #/ URLs;
// `memory` keeps the URL untouched for embedded previews.
const mode = import.meta.env.VITE_ROUTER;
const router = mode === 'hash' ? createHashRouter(routes) : mode === 'memory' ? createMemoryRouter(routes) : createBrowserRouter(routes);

export function App() {
  return (
    <ShopProvider>
      <StaffSessionProvider>
        <RouterProvider router={router} />
        <Toaster />
      </StaffSessionProvider>
    </ShopProvider>
  );
}
