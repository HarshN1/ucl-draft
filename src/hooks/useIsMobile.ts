'use client';

import { useState, useEffect } from 'react';

function detectMobile(breakpoint: number): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia(`(max-width: ${breakpoint - 1}px)`).matches;
}

/** True for phones / narrow portrait — drives mobile-first layout. */
export function useIsMobile(breakpoint = 768) {
  const [mobile, setMobile] = useState(() => detectMobile(breakpoint));

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [breakpoint]);

  return mobile;
}
