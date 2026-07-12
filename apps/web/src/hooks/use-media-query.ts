'use client';

import { useEffect, useState } from 'react';

const MOBILE_BP = '(max-width: 767px)';
const TABLET_BP = '(min-width: 768px) and (max-width: 1023px)';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_BP);
}

export function useIsTablet(): boolean {
  return useMediaQuery(TABLET_BP);
}
