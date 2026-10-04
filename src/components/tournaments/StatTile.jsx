export default function StatTile({ icon: Icon, label, value }) {
  return (
    <div className="glass-soft flex flex-col items-center gap-1 rounded-2xl px-2 py-2.5">
      <Icon className="h-3.5 w-3.5 text-primary" />
      <span className="font-display text-sm font-semibold leading-none">{value}</span>
      <span className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
    </div>
  );
}