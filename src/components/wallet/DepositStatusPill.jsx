import { CheckCircle2, Clock, XCircle } from 'lucide-react';

const META = {
  pending: {
    label: 'Pending review',
    icon: Clock,
    tone: 'border-amber-300/40 bg-amber-300/10 text-amber-200',
  },
  approved: {
    label: 'Approved',
    icon: CheckCircle2,
    tone: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200',
  },
  rejected: {
    label: 'Rejected',
    icon: XCircle,
    tone: 'border-destructive/40 bg-destructive/10 text-destructive',
  },
};

export default function DepositStatusPill({ status }) {
  const meta = META[status] || META.pending;
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${meta.tone}`}
    >
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}