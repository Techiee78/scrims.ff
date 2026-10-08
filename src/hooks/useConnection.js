import { useEffect, useState } from 'react';

// Tracks online/offline state and a coarse "slow connection" flag.
// slow = true when the effective connection type is 2g/slow-2g, or when
// navigator.connection.saveData is set.
export default function useConnection() {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const updateSlow = () => {
      if (!conn) return;
      const type = conn.effectiveType;
      setSlow(type === 'slow-2g' || type === '2g' || conn.saveData === true);
    };
    updateSlow();
    conn?.addEventListener?.('change', updateSlow);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      conn?.removeEventListener?.('change', updateSlow);
    };
  }, []);

  return { online, slow };
}