import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Inbox } from 'lucide-react';
import { api } from '../api';
import { ButtonLink, toast } from '../design/components';
import { useI18n } from '../i18n';
import { OrderForm } from '../shared/OrderForm';

export function NewOrderPage() {
  const navigate = useNavigate();
  const { m } = useI18n();
  const t = m.staff.walkIn;
  return (
    <main className="pp-staff-main" id="main">
      <div className="pp-stack-2">
        <div>
          <ButtonLink to="/staff" variant="quiet" size="sm" icon={ArrowLeft} style={{ paddingLeft: 0 }}>{m.staff.layout.nav.orders}</ButtonLink>
        </div>
        <h1 className="t-display">{t.title}</h1>
        <p className="t-ink-2">{t.intro}</p>
      </div>
      <OrderForm
        mode="walk_in"
        onSubmitted={async ({ code, name }) => {
          toast(t.added(code, name), { icon: Inbox });
          const order = await api.findOrderByCode(code).catch(() => null);
          navigate(order ? `/staff?order=${order.id}` : '/staff');
        }}
      />
    </main>
  );
}
