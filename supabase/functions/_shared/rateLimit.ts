// Atomic, database-backed user rate limits for abuse-prone authenticated endpoints.
export async function checkUserRateLimit(
  supa: any,
  userId: string,
  action: string,
  windowSeconds: number,
  maxHits: number,
): Promise<boolean | null> {
  try {
    const { data, error } = await supa.rpc('edge_rate_limit_hit', {
      p_user_id: userId,
      p_action: action,
      p_window_seconds: windowSeconds,
      p_max_hits: maxHits,
    });
    if (error || typeof data !== 'boolean') return null;
    return data;
  } catch (_e) {
    return null;
  }
}
