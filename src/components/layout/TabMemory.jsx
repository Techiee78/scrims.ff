import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// The four bottom tabs, in bar order. Everything under a tab root belongs to
// that tab, so a deeper screen can be restored later without touching routes.
export const TAB_ROOTS = ['/', '/tournaments', '/my-matches', '/wallet'];

export function tabRootOf(pathname) {
  return (
    TAB_ROOTS.find(
      (root) => root === pathname || (root !== '/' && pathname.startsWith(`${root}/`))
    ) || null
  );
}

const TabMemoryContext = createContext(null);

// In-memory only (never persisted): remembers the last path and scroll offset
// per tab for this session, so switching tabs feels like a native tab bar.
export function TabMemoryProvider({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const lastPath = useRef({});
  const scrollByPath = useRef({});

  useEffect(() => {
    const { pathname } = location;
    const root = tabRootOf(pathname);
    if (root) lastPath.current[root] = pathname;

    const remember = () => {
      scrollByPath.current[pathname] = window.scrollY;
    };
    remember();
    window.addEventListener('scroll', remember, { passive: true });
    return () => {
      remember();
      window.removeEventListener('scroll', remember);
    };
  }, [location.pathname]);

  // Put the player back where they left off. Runs after ScrollToTop, which
  // resets the window on every navigation.
  useEffect(() => {
    const y = scrollByPath.current[location.pathname] ?? 0;
    if (y <= 0) return undefined;
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: y, left: 0, behavior: 'instant' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname]);

  const onTabClick = useCallback(
    (root, isActive) => {
      // Re-tapping the tab you are already on returns to its first screen.
      if (isActive) {
        navigate(root);
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        return;
      }
      navigate(lastPath.current[root] || root);
    },
    [navigate]
  );

  const value = useMemo(() => ({ onTabClick }), [onTabClick]);
  return <TabMemoryContext.Provider value={value}>{children}</TabMemoryContext.Provider>;
}

export function useTabMemory() {
  return useContext(TabMemoryContext);
}