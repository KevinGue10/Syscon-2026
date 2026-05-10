import { Button } from './Button';

export function PayPhoneButton({ isLoading, onClick, disabled = false }) {
  return (
    <Button variant="ghost" className="w-full border border-slate-200" onClick={onClick} disabled={disabled || isLoading}>
      {isLoading ? 'Redirigiendo...' : 'Pagar con PayPhone'}
    </Button>
  );
}
