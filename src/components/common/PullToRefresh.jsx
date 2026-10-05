import { useRef, useState } from 'react';
import { Loader2, RotateCw } from 'lucide-react';

const THRESHOLD = 70;
const MAX_PULL = 110;

export default function PullToRefresh({ onRefresh, children }) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);

  const dragging = startY.current !== null;

  const onTouchStart = (event) => {
    if (refreshing) return;
    if (window.scrollY > 0) return;
    startY.current = event.touches[0].clientY;
  };

  const onTouchMove = (event) => {
    if (startY.current === null || refreshing) return;
    const delta = event.touches[0].clientY - startY.current;
    if (delta > 0 && window.scrollY <= 0) {
      setPull(Math.min(delta * 0.5, MAX_PULL));
    }
  };

  const onTouchEnd = async () => {
    if (startY.current === null) return;
    startY.current = null;
    if (pull >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPull(THRESHOLD);
      try {
        await onRefresh?.();
      } finally {
        setRefreshing(false);
        setPull(0);
      }
    } else {
      setPull(0);
    }
  };

  const progress = Math.min(pull / THRESHOLD, 1);

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
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