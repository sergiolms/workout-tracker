import * as React from 'react';

const query = '(max-width: 767px)';
const getSnapshot = () => window.matchMedia(query).matches;
const getServerSnapshot = () => false;
const subscribe = (notify: () => void) => {
  const media = window.matchMedia(query);
  media.addEventListener('change', notify);
  return () => media.removeEventListener('change', notify);
};

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
