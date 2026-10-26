'use client';
import { useSyncExternalStore } from 'react';

const query = '(prefers-color-scheme: dark)';
const snapshot = () => window.matchMedia(query).matches;
const serverSnapshot = () => false;
const subscribe = (notify: () => void) => {
  const media = window.matchMedia(query);
  media.addEventListener('change', notify);
  return () => media.removeEventListener('change', notify);
};

export function useSystemTheme() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
