import { matchTime } from '@/lib/format';

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="truncate text-right font-semibold">{value}</span>
    </div>
  );
}

export default function MatchInfoGrid({ tournament }) {
  const paid = Number(tournament.entry_fee || 0) > 0;

  return (
    <div className="glass-soft space-y-2 rounded-2xl px-3.5 py-3">
      <Row label="Type" value={tournament.team_type || 'Solo'} />
      <Row label="Mode" value={tournament.mode || 'Full Map'} />
      <Row label="Map" value={tournament.map || tournament.map_name || 'TBA'} />
      <Row label="Match type" value={paid ? 'PAID' : 'FREE'} />
      <Row
        label="Entry fee"
        value={paid ? `${Number(tournament.entry_fee).toLocaleString('en-IN')} coins` : 'Free'}
      />
      <Row label="Matches schedule" value={matchTime(tournament.match_time || tournament.start_time)} />
    </div>
  );
}