interface PaymentBadgeProps {
  order: {
    payment_method?: string | null;
    payment_status?: string | null;
  };
}

const pill = 'inline-flex items-center text-[11px] font-medium px-2.5 py-0.5 rounded-full border';

export function PaymentBadge({ order }: PaymentBadgeProps) {
  const method = (order.payment_method ?? '').toLowerCase();
  const status = (order.payment_status ?? '').toLowerCase();

  if (status === 'paid' || status === 'cod_collected' || status === 'cheque_received') {
    const label =
      status === 'cod_collected' ? '✅ Paid — COD' :
      status === 'cheque_received' ? '✅ Paid — Cheque' :
      method === 'upi' ? '✅ Paid — UPI' :
      method === 'bank transfer' ? '✅ Paid — Bank' :
      '✅ Paid';
    return <span className={`${pill} bg-green-50 text-green-700 border-green-200`}>{label}</span>;
  }

  if (method === 'cash on delivery' || method === 'cod' || status === 'cod_pending') {
    return <span className={`${pill} bg-amber-50 text-amber-700 border-amber-200`}>💵 COD Pending</span>;
  }

  if (method === 'cheque' || status === 'cheque_pending') {
    return <span className={`${pill} bg-blue-50 text-blue-700 border-blue-200`}>📃 Cheque Pending</span>;
  }

  if (method === 'upi') {
    return <span className={`${pill} bg-green-50 text-green-700 border-green-200`}>✅ Paid (UPI)</span>;
  }

  if (method === 'bank transfer') {
    return <span className={`${pill} bg-green-50 text-green-700 border-green-200`}>✅ Paid (Bank)</span>;
  }

  return <span className={`${pill} bg-gray-100 text-gray-600 border-gray-200`}>⏳ Pending</span>;
}
