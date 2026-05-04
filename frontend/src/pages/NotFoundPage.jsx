import { Link } from 'react-router-dom';
import { Button } from '../components/Button';

function NotFoundPage() {
  return (
    <section className="container-shell flex min-h-[60vh] items-center justify-center py-16">
      <div className="max-w-xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">404</p>
        <h1 className="mt-3 text-4xl font-semibold text-slate-950">Page not found</h1>
        <p className="mt-4 text-slate-600">
          The route you requested does not exist in the current conference frontend.
        </p>
        <div className="mt-8">
          <Link to="/">
            <Button variant="primary">Return Home</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

export default NotFoundPage;
