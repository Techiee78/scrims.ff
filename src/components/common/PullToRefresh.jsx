import { useEffect, useRef, useState } from 'react';
import { Loader2, RotateCw } from 'lucide-react';

const THRESHOLD = 38;
const MAX_PULL = 76;

export default function PullToRefresh({ onRefresh, children }) {
  const containerRef = useRef(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const startY = useRef(null);
  const pullRef = useRef(0);
  const refreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const applyPull = (value) => {
    pullRef.current = value;
    setPull(value);
  };

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const handleStart = (event) => {
      if (refreshingRef.current) return;
      if (window.scrollY > 0 || pullRef.current > 0) return;
      startY.current = event.touches[0].clientY;
      setDragging(true);
    };

    const handleMove = (event) => {
      if (startY.current === null || refreshingRef.current) return;
      const delta = event.touches[0].clientY - startY.current;
      // Finger moved up or the page started scrolling: drop any pull so nothing stays stuck.
      if (delta <= 0 || window.scrollY > 0) {
        if (pullRef.current !== 0) applyPull(0);
        return;
      }
      // Stop Chrome's native pull-to-refresh so ours runs first.
      if (event.cancelable) event.preventDefault();
      applyPull(Math.min(delta * 0.75, MAX_PULL));
    };

    const handleEnd = () => {
      const shouldRefresh =
        startY.current !== null && pullRef.current >= THRESHOLD && !refreshingRef.current;
      startY.current = null;
      setDragging(false);

      if (!shouldRefresh) {
        applyPull(0);
        return;
      }

      refreshingRef.current = true;
      setRefreshing(true);
      applyPull(THRESHOLD);
      Promise.resolve()
        .then(() => onRefreshRef.current?.())
        .catch(() => {
          // keep the page usable even if the refresh fails
        })
        .finally(() => {
          refreshingRef.current = false;
          setRefreshing(false);
          applyPull(0);
        });
    };

    const handleCancel = () => {
      startY.current = null;
      setDragging(false);
      applyPull(0);
    };

    node.addEventListener('touchstart', handleStart, { passive: true });
    node.addEventListener('touchmove', handleMove, { passive: false });
    node.addEventListener('touchend', handleEnd);
    node.addEventListener('touchcancel', handleCancel);

    return () => {
      node.removeEventListener('touchstart', handleStart);
      node.removeEventListener('touchmove', handleMove);
      node.removeEventListener('touchend', handleEnd);
      node.removeEventListener('touchcancel', handleCancel);
    };
  }, []);

  const progress = Math.min(pull / THRESHOLD, 1);

  return (
    <div ref={containerRef} className="relative">
      <div
        className="pointer-events-none absolute left-0 right-0 top-0 flex items-center justify-center"
        style={{ height: pull, opacity: progress }}
      >
        {refreshing ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : (
          <RotateCw
            className="h-5 w-5 text-primary"
            style={{
              transform: `rotate(${progress * 360}deg)`,
              transition: dragging ? 'none' : 'transform 0.2s ease',
            }}
          />
        )}
      </div>
      <div
        style={{
          transform: `translateY(${pull}px)`,
          transition: dragging ? 'none' : 'transform 0.3s ease',
        }}
      >
        {children}
      </div>
    </div>
  );
}