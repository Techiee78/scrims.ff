// Password recovery gate.
//
// Only a session the auth provider itself created from a recovery link may
// change the password. A sessionStorage flag is written by our own page and can
// be set by any script or by hand, so it proves nothing — the verified signal
// lives in memory and comes from one of two provider-validated sources:
//
//   1. Supabase's PASSWORD_RECOVERY event, which fires only after the provider
//      validated the recovery token in the URL (AuthContext marks it).
//   2. A recovery token/code that was present in the URL when this module
//      loaded on /reset-password — the code is only exchangeable for a session
//      if the provider genuinely issued it.
let recoveryVerified = false;
let recoveryTokenInUrl = false;

if (typeof window !== 'undefined') {
  const { pathname, search, hash } = window.location;
  const query = `${search}${hash}`;
  const hasRecoveryType = /(^|[?&#])type=recovery(&|=|$)/.test(query);
  const hasPkceCode = /[?&]code=/.test(search) && pathname === '/reset-password';

  recoveryTokenInUrl = hasRecoveryType || hasPkceCode;

  // Supabase falls back to the Site URL ("/") when the reset page isn't in its
  // allowed redirect list. Route those links to the reset page.
  if (hasRecoveryType && pathname !== '/reset-password') {
    window.history.replaceState(null, '', '/reset-password' + search + hash);
  }
}

// Called by AuthContext when the provider emits PASSWORD_RECOVERY.
export const markRecoveryVerified = () => {
  recoveryVerified = true;
};

export const isRecoveryVerified = () => recoveryVerified;

export const hadRecoveryTokenInUrl = () => recoveryTokenInUrl;

export const clearRecoveryPending = () => {
  recoveryVerified = false;
  recoveryTokenInUrl = false;
};

export const isOnResetPage = () => window.location.pathname === '/reset-password';