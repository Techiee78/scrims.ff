export default function AppBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-background" />
      <div className="absolute -right-24 -top-40 h-[26rem] w-[26rem] rounded-full bg-primary/25 blur-[120px]" />
      <div className="absolute -left-24 bottom-[-7rem] h-[24rem] w-[24rem] rounded-full bg-accent/20 blur-[130px]" />
      <div className="absolute left-1/2 top-1/3 h-[20rem] w-[20rem] -translate-x-1/2 rounded-full bg-fuchsia-500/10 blur-[140px]" />
      <div className="absolute inset-0 opacity-[0.05] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:56px_56px]" />
    </div>
  );
}