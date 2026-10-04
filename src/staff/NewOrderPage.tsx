import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Inbox } from 'lucide-react';
import { api } from '../api';
import { ButtonLink, toast } from '../design/components';
import { OrderForm } from '../shared/OrderForm';

export function NewOrderPage() {
  const navigate = useNavigate();
  return (
    <main className="pp-staff-main" id="main">
      <div className="pp-stack-2">
        <div>
          <ButtonLink to="/staff" variant="quiet" size="sm" icon={ArrowLeft} style={{ paddingLeft: 0 }}>Orders</ButtonLink>
        </div>
        <h1 className="t-display">Add walk-in order</h1>
        <p className="t-ink-2">For customers at the counter. Email is optional; without one, they can't track the order online.</p>
      </div>
      <OrderForm
        mode="walk_in"
        onSubmitted={async ({ code, name }) => {
          toast(`Order ${code} added for ${name}`, { icon: Inbox });
          const order = await api.findOrderByCode(code).catch(() => null);
          navigate(order ? `/staff?order=${order.id}` : '/staff');
        }}
      />
    </main>
  );
}
