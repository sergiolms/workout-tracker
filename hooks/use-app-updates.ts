'use client';
import { useEffect, useState } from 'react';

export function useAppUpdates() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
    const scope = `${basePath}/`;
    if (process.env.NODE_ENV !== 'production') {
      void navigator.serviceWorker
        .getRegistration(scope)
        .then((registration) => registration?.unregister());
      return;
    }

    let disposed = false;
    let registration: ServiceWorkerRegistration | undefined;
    let hadController = Boolean(navigator.serviceWorker.controller);
    const onControllerChange = () => {
      if (disposed) return;
      if (hadController) setUpdateAvailable(true);
      hadController = true;
    };
    const checkForUpdate = () => {
      if (document.visibilityState === 'visible')
        void registration?.update().catch(() => undefined);
    };
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      onControllerChange,
    );
    document.addEventListener('visibilitychange', checkForUpdate);
    const timer = window.setInterval(checkForUpdate, 60 * 60 * 1000);
    void navigator.serviceWorker
      .register(`${basePath}/sw.js`, { scope })
      .then((registered) => {
        if (disposed) return;
        registration = registered;
        checkForUpdate();
      })
      .catch(() => undefined);
    return () => {
      disposed = true;
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        onControllerChange,
      );
      document.removeEventListener('visibilitychange', checkForUpdate);
      window.clearInterval(timer);
    };
  }, []);
  return updateAvailable;
}
