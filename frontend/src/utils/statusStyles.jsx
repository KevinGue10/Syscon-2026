export function getStatusBadgeStyle(status) {
  const normalizedStatus = String(status || '').toLowerCase();

  if (['pending_link', 'pendinglink'].includes(normalizedStatus)) {
    return {
      backgroundColor: '#dbeafe',
      color: '#1d4ed8',
      border: '1px solid #bfdbfe',
    };
  }

  if (['pending_validation', 'pendingvalidation'].includes(normalizedStatus)) {
    return {
      backgroundColor: '#ffedd5',
      color: '#c2410c',
      border: '1px solid #fdba74',
    };
  }

  if (['pending_payment', 'pendingpayment', 'pending', 'partial', 'pendiente'].includes(normalizedStatus)) {
    return {
      backgroundColor: '#fef3c7',
      color: '#92400e',
      border: '1px solid #fde68a',
    };
  }

  if (['approved', 'accepted', 'paid', 'aprobado'].includes(normalizedStatus)) {
    return {
      backgroundColor: '#d1fae5',
      color: '#065f46',
      border: '1px solid #a7f3d0',
    };
  }

  if (['rejected', 'cancelled', 'canceled', 'rechazado'].includes(normalizedStatus)) {
    return {
      backgroundColor: '#ffe4e6',
      color: '#9f1239',
      border: '1px solid #fecdd3',
    };
  }

  return {
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: '1px solid #e2e8f0',
  };
}

export function StatusBadge({ status, label }) {
  return (
    <span
      className="inline-flex rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em]"
      style={getStatusBadgeStyle(status)}
    >
      {label || status || 'Sin estado'}
    </span>
  );
}
