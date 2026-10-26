'use client';

import {
  Cloud,
  CloudOff,
  Download,
  LogOut,
  Moon,
  Monitor,
  Sun,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { firebaseConfigured, type FirebaseUser } from '@/lib/firebase';
import { type AppState } from '@/lib/storage';
import { BackupImporter } from '@/components/backup-importer';
import { appRelease } from '@/lib/app-version';
import { ViewTabs } from '@/components/view-tabs';
import { PreferenceSwitch } from '@/components/preference-switch';
import { HapticCheck } from '@/components/haptic-check';
import { localDateKey } from '@/lib/local-date';
import { RecordTrash } from '@/components/record-trash';

export function ProfileView({
  editable,
  state,
  updateState,
  user,
  cloudReady,
  authBusy,
  authError,
  onGoogleLogin,
  onLogout,
}: {
  editable: boolean;
  state: AppState;
  updateState: (updater: (state: AppState) => AppState) => void;
  user: FirebaseUser | null;
  cloudReady: boolean;
  authBusy: boolean;
  authError: string;
  onGoogleLogin: () => void;
  onLogout: () => void;
}) {
  const [view, setView] = useState<'account' | 'appearance'>('account');
  const exportBackup = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `base-backup-${localDateKey()}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div className="profile-settings">
      <div className="section-heading">
        <div>
          <h1 className="page-title">Perfil</h1>
          <p className="page-subtitle">Tu cuenta y tus preferencias</p>
        </div>
      </div>
      <ViewTabs
        label="Secciones del perfil"
        value={view}
        onChange={setView}
        items={[
          { id: 'account', label: 'Cuenta y datos' },
          { id: 'appearance', label: 'Apariencia y tacto' },
        ]}
      />
      {view === 'appearance' ? (
        <>
          <section className="mb-4 rounded-2xl border border-border bg-card p-5">
            <h2 className="font-bold">Apariencia</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Elige cómo se muestra la aplicación.
            </p>
            <fieldset className="mt-4">
              <legend className="sr-only">Tema de la aplicación</legend>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'system', label: 'Sistema', icon: Monitor },
                    { id: 'light', label: 'Claro', icon: Sun },
                    { id: 'dark', label: 'Oscuro', icon: Moon },
                  ] as const
                ).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    disabled={!editable}
                    aria-pressed={state.theme === id}
                    className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-2 text-sm font-semibold transition-colors ${state.theme === id ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-foreground hover:bg-muted'}`}
                    onClick={() =>
                      updateState((current) => ({ ...current, theme: id }))
                    }
                    type="button"
                  >
                    <Icon className="size-4" />
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
          </section>
          <section className="mt-4 rounded-2xl border border-border bg-card p-5">
            <PreferenceSwitch
              label="Vibración al interactuar"
              description="Vibraciones suaves al marcar, navegar y guardar, si tu dispositivo y navegador lo permiten."
              checked={state.haptics !== false}
              disabled={!editable}
              onCheckedChange={(checked) =>
                updateState((current) => ({ ...current, haptics: checked }))
              }
            />
            <HapticCheck enabled={state.haptics !== false} />
          </section>
        </>
      ) : (
        <>
          <section className="mt-4 rounded-2xl border border-border bg-card p-5">
            {user ? (
              <div className="flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">
                  {(user.displayName || user.email || 'U')
                    .slice(0, 1)
                    .toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <strong className="block truncate">
                    {user.displayName || 'Cuenta de Google'}
                  </strong>
                  <small className="block truncate text-muted-foreground">
                    {user.email}
                  </small>
                </div>
                <Button
                  aria-label="Cerrar sesión"
                  className="size-11 rounded-xl"
                  disabled={authBusy}
                  onClick={onLogout}
                  size="icon"
                  variant="outline"
                >
                  <LogOut />
                </Button>
              </div>
            ) : (
              <div>
                <div className="mb-4 flex gap-3">
                  <span className="icon-tile">
                    <Cloud />
                  </span>
                  <div>
                    <strong className="block">Cuenta</strong>
                    <small className="text-muted-foreground">
                      Inicia sesión para sincronizar entre dispositivos.
                    </small>
                  </div>
                </div>
                <Button
                  className="h-12 w-full rounded-xl bg-white font-bold text-zinc-900 shadow-sm ring-1 ring-zinc-200 hover:bg-zinc-50"
                  disabled={authBusy || !firebaseConfigured}
                  onClick={onGoogleLogin}
                >
                  <span className="grid size-6 place-items-center rounded-full bg-white text-base font-black text-blue-600">
                    G
                  </span>
                  {authBusy ? 'Conectando…' : 'Continuar con Google'}
                </Button>
                {authError ? (
                  <p
                    role="alert"
                    className="mt-3 text-sm font-medium text-red-600 dark:text-red-300"
                  >
                    {authError}
                  </p>
                ) : null}
              </div>
            )}
          </section>
          <section className="mt-4 rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="icon-tile">
                  {user && cloudReady ? <Cloud /> : <CloudOff />}
                </span>
                <div>
                  <strong className="block">Sincronización</strong>
                  <small className="text-muted-foreground">
                    {user && cloudReady
                      ? 'Sincronizado con la cuenta activa'
                      : user
                        ? 'Firebase pendiente · copia local disponible'
                        : firebaseConfigured
                          ? 'Solo en este dispositivo hasta iniciar sesión'
                          : 'Sincronización no disponible'}
                  </small>
                </div>
              </div>
              <span
                className={`size-2.5 rounded-full ${user && cloudReady ? 'bg-emerald-500' : 'bg-amber-400'}`}
              />
            </div>
          </section>
          <section className="mt-4 rounded-2xl border border-border bg-card p-5">
            <h2 className="font-bold">Copias de seguridad</h2>
            <RecordTrash state={state} updateState={updateState} editable={editable} />
            <p className="mt-2 text-sm text-muted-foreground">
              Firebase guarda tu plan y tu historial. Este navegador conserva
              una copia para consultarlos sin conexión y los cambios pendientes
              hasta que se confirmen.
            </p>
            <p className="mt-2 text-sm">
              {state.plan.length} semanas · {state.sessions.length} rutinas ·{' '}
              {state.workoutLogs.length} entrenamientos
            </p>
            <Button
              className="mt-4 min-h-12 rounded-xl"
              onClick={exportBackup}
              variant="outline"
            >
              <Download /> Descargar copia de seguridad
            </Button>
            <BackupImporter
              state={state}
              editable={editable}
              onImport={updateState}
            />
            <BackupImporter
              format="hevy"
              state={state}
              editable={editable}
              onImport={updateState}
            />
          </section>
          <section
            aria-labelledby="app-version-title"
            className="mt-4 rounded-2xl border border-border bg-card p-5"
          >
            <h2 id="app-version-title" className="font-bold">
              Versión de la app
            </h2>
            <p className="mt-2 text-sm font-semibold">
              v{appRelease.version}
              <span className="font-normal text-muted-foreground">
                {' '}
                · {appRelease.build}
              </span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Fecha de versión:{' '}
              <time dateTime={appRelease.builtAt}>{appRelease.date}</time>{' '}
              (Madrid)
            </p>
          </section>
        </>
      )}
    </div>
  );
}
