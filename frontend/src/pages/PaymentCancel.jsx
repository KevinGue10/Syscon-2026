import { Link, useLocation } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

function PaymentCancel() {
  const location = useLocation();
  const provider = location.pathname.includes('paypal')
    ? 'PayPal'
    : location.pathname.includes('payphone')
      ? 'PayPhone'
      : "the payment provider";

  return (
    <section className="container-shell py-16">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">Payments</p>
        <h1 className="mt-3 text-4xl font-semibold text-slate-950">Payment cancelled</h1>

        <Card className="mt-8 p-8">
          <p className="text-base leading-8 text-slate-700">
            The checkout with {provider} was cancelled before completion. Your registration was not changed and you can try again at any time.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/payments">
              <Button variant="primary">Try again</Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="ghost" className="border border-slate-200">Go to dashboard</Button>
            </Link>
          </div>
        </Card>
      </div>
    </section>
  );
}

export default PaymentCancel;
