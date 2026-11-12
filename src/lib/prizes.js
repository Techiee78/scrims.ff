// Prize rules: the total prize pool is split into 1st / 2nd / 3rd place
// prizes, and per-kill rewards are paid from that same pool.
// Matches created before the split existed pay the whole pool to 1st place.

export function podiumSplit(tournament) {
  const first = Number(tournament?.prize_1st || 0);
  const second = Number(tournament?.prize_2nd || 0);
  const third = Number(tournament?.prize_3rd || 0);
  if (first + second + third > 0) return { first, second, third };
  return { first: Number(tournament?.prize_pool || 0), second: 0, third: 0 };
}

export function podiumPrize(tournament, placement) {
  const rank = Number(placement) || 0;
  if (rank < 1 || rank > 3) return 0;
  const split = podiumSplit(tournament);
  return [split.first, split.second, split.third][rank - 1] || 0;
}

export function podiumTotal(tournament) {
  const split = podiumSplit(tournament);
  return split.first + split.second + split.third;
}

export function matchPayout(tournament, kills = 0, placement = 0) {
  const perKill = Number(tournament?.per_kill || 0);
  return Math.max(0, Number(kills) || 0) * perKill + podiumPrize(tournament, placement);
}

// Coins left for per-kill rewards once the podium prizes are taken out of the
// same pool.
export function perKillBudget(tournament) {
  const pool = Number(tournament?.prize_pool || 0);
  const podium = podiumTotal(tournament);
  if (pool <= 0) return Infinity;
  return Math.max(0, pool - podium);
}

// Full payout plan for a match. Per-kill rewards can never push the match past
// its prize pool: the per-kill budget is shared across all kills in the match,
// so the per-kill rate drops when the pool runs out.
export function payoutPlan(tournament, entries = []) {
  const perKill = Number(tournament?.per_kill || 0);
  const budget = perKillBudget(tournament);
  const killsOf = (entry) => Math.max(0, Number(entry?.kills) || 0);
  const totalKills = entries.reduce((sum, entry) => sum + killsOf(entry), 0);
  const rawKillCoins = totalKills * perKill;
  const killCoins = Number.isFinite(budget) ? Math.min(rawKillCoins, budget) : rawKillCoins;
  const rate = totalKills > 0 ? killCoins / totalKills : 0;

  const rows = entries.map((entry) => {
    const kills = killsOf(entry);
    const podium = podiumPrize(tournament, entry?.placement);
    const killShare = Math.floor(kills * rate);
    return { kills, podium, killShare, total: killShare + podium };
  });

  return {
    budget,
    totalKills,
    rawKillCoins,
    killCoins,
    rate,
    rows,
    payable: rows.reduce((sum, row) => sum + row.total, 0),
  };
}