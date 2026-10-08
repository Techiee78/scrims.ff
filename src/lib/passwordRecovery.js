// Runs at import time — before the Supabase client reads (and clears) the
// recovery token from the URL. Supabase falls back to the Site URL ("/")
// when the reset page isn't in its allowed redirect list, which dropped
// users on the home page already logged in. Route them to the reset page
// and remember that a recovery is in progress for this tab.
const KEY = 'pw_recovery_pending';

if (typeof window !== 'undefined') {
  const { pathname, search, hash } = window.location;
  if (hash.includes('type=recovery')) {
    sessionStorage.setItem(KEY, '1');
    if (pathname !== '/reset-password') {
      window.history.replaceState(null, '', '/reset-password' + search + hash);
    }
  }
}

export const isRecoveryPending = () => sessionStorage.getItem(KEY) === '1';
export const clearRecoveryPending = () => sessionStorage.removeItem(KEY);
export const isOnResetPage = () => window.location.pathname === '/reset-password';