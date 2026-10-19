'use client';

import { useState, useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';
import { hapticFeedback } from '@/lib/haptics';

const subscribe = () => () => {};
const getSupport = () => typeof navigator.vibrate === 'function';
const getServerSupport = () => null;

export function HapticCheck({ enabled }: { enabled: boolean }) {
  const supported = useSyncExternalStore(subscribe, getSupport, getServerSupport);
  const [result, setResult] = useState('');
  return <div className="mt-3 space-y-2 text-sm text-muted-foreground">
    {supported === false ? <p>Este navegador no admite vibración. Seguirás viendo la respuesta animada de los botones.</p> : <>
      <Button type="button" variant="outline" data-haptic="off" disabled={!enabled || supported === null} onClick={() => setResult(hapticFeedback('success') ? 'Se ha enviado la vibración. Si no la notas, revisa la vibración, el modo silencio y No molestar del dispositivo.' : 'El navegador no ha permitido la vibración. La respuesta animada sigue disponible.')}>Probar vibración</Button>
      <output className="block">{result}</output>
    </>}
  </div>;
}
