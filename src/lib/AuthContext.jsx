import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { getSupabase } from '@/lib/supabaseClient';
import { isOnResetPage } from '@/lib/passwordRecovery';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null);
  const [supabaseReady, setSupabaseReady] = useState(false);

  const loadProfile = useCallback(async (authUser) => {
    try {
      const supa = await getSupabase();
      const { data: profile } = await supa
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();
      const merged = {
        id: authUser.id,
        email: authUser.email,
        full_name: profile?.full_name || authUser.user_metadata?.full_name || '',
        role: profile?.role || 'user',
        ff_ign: profile?.ff_ign || '',
        ff_uid: profile?.ff_uid || '',
        whatsapp: profile?.whatsapp || '',
      };
      setUser(merged);
      setIsAuthenticated(true);
      setAuthChecked(true);
      setIsLoadingAuth(false);
    } catch (error) {
      console.error('Profile load failed:', error);
      setUser({
        id: authUser.id,
        email: authUser.email,
        role: 'user',
        full_name: '',
        ff_ign: '',
        ff_uid: '',
        whatsapp: '',
      });
      setIsAuthenticated(true);
      setAuthChecked(true);
      setIsLoadingAuth(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    let unsub = null;
    (async () => {
      try {
        const supa = await getSupabase();
        if (!active) return;
        setSupabaseReady(true);

        // App is open to Supabase-authenticated users; keep the same
        // context field names the rest of the app reads.
        setAppPublicSettings({ id: appParams?.appId || null, public_settings: {} });
        setIsLoadingPublicSettings(false);

        const { data: { session } } = await supa.auth.getSession();
        if (!active) return;
        // A recovery link creates a temporary session — don't log in from it
        // while the user is on the reset page.
        if (isOnResetPage()) {
          setIsAuthenticated(false);
          setUser(null);
          setAuthChecked(true);
          setIsLoadingAuth(false);
        } else if (session?.user) {
          await loadProfile(session.user);
        } else {
          setIsAuthenticated(false);
          setUser(null);
          setAuthChecked(true);
          setIsLoadingAuth(false);
        }

        const { data: sub } = supa.auth.onAuthStateChange(async (event, newSession) => {
          if (!active) return;
          // Password recovery: Supabase sends a recovery link that creates a
          // temporary session. Do NOT log the user in from that session —
          // the ResetPassword page uses it to set a new password, then signs
          // out. Auto-logging in here would bypass the reset entirely.
          if (event === 'PASSWORD_RECOVERY' || isOnResetPage()) {
            setIsAuthenticated(false);
            setUser(null);
            setAuthChecked(true);
            setIsLoadingAuth(false);
            return;
          }
          if (newSession?.user) {
            await loadProfile(newSession.user);
          } else {
            setUser(null);
            setIsAuthenticated(false);
            setAuthChecked(true);
            setIsLoadingAuth(false);
          }
        });
        unsub = () => sub.subscription.unsubscribe();
      } catch (error) {
        if (!active) return;
        console.error('Auth init failed:', error);
        setAuthError({ type: 'unknown', message: error?.message || 'Failed to initialize auth' });
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
        setAuthChecked(true);
      }
    })();
    return () => {
      active = false;
      if (unsub) unsub();
    };
  }, [loadProfile]);

  const refreshUser = useCallback(async () => {
    try {
      const supa = await getSupabase();
      const { data: { session } } = await supa.auth.getSession();
      if (session?.user) await loadProfile(session.user);
    } catch (_e) {
      // ignore
    }
  }, [loadProfile]);

  const checkUserAuth = useCallback(async () => {
    try {
      const supa = await getSupabase();
      const { data: { session } } = await supa.auth.getSession();
      if (session?.user) {
        await loadProfile(session.user);
      } else {
        setIsAuthenticated(false);
        setUser(null);
        setAuthChecked(true);
        setIsLoadingAuth(false);
      }
    } catch (_e) {
      setIsAuthenticated(false);
      setAuthChecked(true);
      setIsLoadingAuth(false);
    }
  }, [loadProfile]);

  const checkAppState = useCallback(async () => {
    await checkUserAuth();
  }, [checkUserAuth]);

  const logout = useCallback(async (shouldRedirect = true) => {
    try {
      const supa = await getSupabase();
      await supa.auth.signOut();
    } catch (_e) {
      // ignore
    }
    setUser(null);
    setIsAuthenticated(false);
    if (shouldRedirect) {
      window.location.href = '/login';
    }
  }, []);

  const navigateToLogin = useCallback(() => {
    window.location.href = '/login';
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      supabaseReady,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};