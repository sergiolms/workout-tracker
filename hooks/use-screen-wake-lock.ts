'use client';

import { useEffect, useState } from 'react';

export function useScreenWakeLock(active: boolean) {
  const [status, setStatus] = useState<'idle' | 'held' | 'unavailable'>('idle');
  useEffect(() => {
    if (!active) return;
    let disposed = false;
    let requesting = false;
    let sentinel: WakeLockSentinel | undefined;
    const request = async () => {
      if (
        disposed ||
        requesting ||
        sentinel ||
        document.visibilityState !== 'visible'
      )
        return;
      if (!('wakeLock' in navigator)) {
        setStatus('unavailable');
        return;
      }
      requesting = true;
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (disposed || document.visibilityState !== 'visible') {
          await lock.release();
          return;
        }
        sentinel = lock;
        setStatus('held');
        lock.addEventListener('release', () => {
          if (sentinel === lock) sentinel = undefined;
          if (!disposed) setStatus('unavailable');
        });
      } catch {
        if (!disposed) setStatus('unavailable');
      } finally {
        requesting = false;
      }
    };
    const visibility = () => {
      if (document.visibilityState === 'visible') void request();
    };
    void request();
    document.addEventListener('visibilitychange', visibility);
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', visibility);
      void sentinel?.release().catch(() => undefined);
    };
  }, [active]);
  return active ? status : 'idle';
}
