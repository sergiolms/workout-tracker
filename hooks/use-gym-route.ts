'use client';
import { useSyncExternalStore } from 'react';
const event = 'zero-to-hero:navigate';
const snapshot = () =>
  new URL(window.location.href).searchParams.get('view') === 'gym';
const serverSnapshot = () => false;
const subscribe = (change: () => void) => {
  window.addEventListener('popstate', change);
  window.addEventListener(event, change);
  return () => {
    window.removeEventListener('popstate', change);
    window.removeEventListener(event, change);
  };
};
export function useGymRoute() {
  const open = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  return {
    open,
    enter: () => {
      const url = new URL(window.location.href);
      url.searchParams.set('view', 'gym');
      window.history.pushState(
        { ...window.history.state, zeroToHeroGym: true },
        '',
        url,
      );
      window.dispatchEvent(new Event(event));
    },
    leave: () => {
      if (window.history.state?.zeroToHeroGym) window.history.back();
      else {
        const url = new URL(window.location.href);
        url.searchParams.delete('view');
        window.history.replaceState(window.history.state, '', url);
        window.dispatchEvent(new Event(event));
      }
    },
  };
}
