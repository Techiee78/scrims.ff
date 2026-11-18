export default function StatTile({ icon: Icon, label, value }) {
  return (
    <div className="glass-soft flex flex-col items-center gap-0.5 rounded-2xl px-1.5 py-2">
      <Icon className="h-3.5 w-3.5 text-primary" />
      <span className="font-display text-sm font-semibold leading-none">{value}</span>
      <span className="text-center text-xs leading-tight tracking-tight text-muted-foreground">
        {label}
      </span>
    </div>
  );
}