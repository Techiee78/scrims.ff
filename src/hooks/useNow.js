import { useState, useEffect } from 'react';

// One shared 1-second clock for every card on screen, so a list of matches
// keeps a single timer instead of starting an interval per card.
let listeners = new Set();
let timer = null;
let tick = Date.now();

function subscribe(listener) {
  listeners.add(listener);
  tick = Date.now();
  listener(tick);
  if (!timer) {
    timer = setInterval(() => {
      tick = Date.now();
      listeners.forEach((fn) => fn(tick));
    }, 1000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

export default function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => subscribe(setNow), []);
  return now;
}