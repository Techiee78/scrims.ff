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