import { useRef, useState } from 'react';
import { Loader2, RotateCw } from 'lucide-react';

const THRESHOLD = 70;
const MAX_PULL = 110;

export default function PullToRefresh({ onRefresh, children }) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const startY = useRef(null);
  const pullRef = useRef(0);

  const applyPull = (value) => {
    pullRef.current = value;
    setPull(value);
  };

  const resetPull = () => {
    startY.current = null;
    setDragging(false);
    applyPull(0);
  };

  const onTouchStart = (event) => {
    if (refreshing) return;
    if (window.scrollY > 0 || pullRef.current > 0) return;
    startY.current = event.touches[0].clientY;
    setDragging(true);
  };

  const onTouchMove = (event) => {
    if (startY.current === null || refreshing) return;
    const delta = event.touches[0].clientY - startY.current;
    // Finger moved up or the page started scrolling: drop any pull so nothing stays stuck.
    if (delta <= 0 || window.scrollY > 0) {
      if (pullRef.current !== 0) applyPull(0);
      return;
    }
    applyPull(Math.min(delta * 0.5, MAX_PULL));
  };

  const onTouchEnd = async () => {
    const shouldRefresh = startY.current !== null && pullRef.current >= THRESHOLD && !refreshing;
    startY.current = null;
    setDragging(false);

    if (!shouldRefresh) {
      applyPull(0);
      return;
    }

    setRefreshing(true);
    applyPull(THRESHOLD);
    try {
      await onRefresh?.();
    } catch (_e) {
      // keep the page usable even if the refresh fails
    } finally {
      setRefreshing(false);
      applyPull(0);
    }
  };

  const progress = Math.min(pull / THRESHOLD, 1);

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={resetPull}
      className="relative"
    >
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