'use client';
import { HeartPulse } from 'lucide-react';
import { navItems, type Tab } from '@/components/navigation-items';
import { HistoryProvider } from '@/components/history-source';
import { lazy, Suspense, useCallback, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DialogThemeProvider } from '@/components/ui/dialog';
import { firebaseConfigured } from '@/lib/firebase';
import { AccessScreen } from '@/components/access-screen';
import { LocalDataImport } from '@/components/local-data-import';
import { countsTowardPlan, nextPlanSession } from '@/lib/plan-progress';
import { type ExerciseLog, type WorkoutLog } from '@/lib/storage';
import { SyncConflicts } from '@/components/sync-conflicts';

import {
  RestDock,
  SaveStatus,
  UndoNotice,
} from '@/components/workout-feedback';
import { restDuration } from '@/lib/rest-preferences';
import { LiquidNavigation } from '@/components/liquid-navigation';
import { MotionSurface } from '@/components/motion-surface';
import { useSwipeNavigation } from '@/hooks/use-swipe-navigation';
import { useInteractionFeedback } from '@/hooks/use-interaction-feedback';
import { useWorkoutAccount } from '@/hooks/use-workout-account';
import { useGymRoute } from '@/hooks/use-gym-route';
import { useAppUpdates } from '@/hooks/use-app-updates';
import { useSystemTheme } from '@/hooks/use-system-theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { WorkoutTimer } from '@/components/views/timer-view';
import { ViewBoundary } from '@/components/view-boundary';
import { nextRotationRoutine } from '@/lib/rotation';

const TodayView = lazy(() =>
  import('@/components/views/today-view').then((module) => ({
    default: module.TodayView,
  })),
);
const PlanView = lazy(() =>
  import('@/components/views/plan-view').then((module) => ({
    default: module.PlanView,
  })),
);
const ProgressView = lazy(() =>
  import('@/components/views/progress-view').then((module) => ({
    default: module.ProgressView,
  })),
);
const ProfileView = lazy(() =>
  import('@/components/views/profile-view').then((module) => ({
    default: module.ProfileView,
  })),
);
const GymApp = lazy(() =>
  import('@/components/gym/gym-app').then((module) => ({
    default: module.GymApp,
  })),
);

export default function HomePage() {
  const gymRoute = useGymRoute();
  const {
    historySource,
    state,
    hydrated,
    cloudReady,
    firebaseUser,
    authBusy,
    authError,
    persistenceStatus,
    updateState,
    handleGoogleLogin,
    handleLogout,
    resolveConflicts,
    retrySync,
    syncing,
    mode,
    accountId,
    handleUseLocal,
    localImport,
    dismissLocalImport,
  } = useWorkoutAccount();
  const [tab, setTab] = useState<Tab>('today');
  const systemDark = useSystemTheme();
  const isDark =
    state.theme === 'dark' || (state.theme === 'system' && systemDark);
  useThemeColor(isDark);
  const [preferredRoutine, setPreferredRoutine] = useState('');
  const [trainingNotice, setTrainingNotice] = useState('');
  const updateAvailable = useAppUpdates();
  const [restDeadline, setRestDeadline] = useState<number | null>(null);
  const [undo, setUndo] = useState<{
    id: number;
    message: string;
    action: () => void;
  } | null>(null);
  const stopRest = useCallback(() => setRestDeadline(null), []);
  const startRest = useCallback(
    (seconds: number) =>
      setRestDeadline(Date.now() + restDuration(seconds) * 1000),
    [],
  );
  const dismissUndo = useCallback(() => setUndo(null), []);
  const offerUndo = useCallback(
    (message: string, action: () => void) =>
      setUndo({ id: Date.now(), message, action }),
    [],
  );
  const contentScroll = useRef<HTMLElement>(null);
  const scrollContentToTop = useCallback(() => {
    contentScroll.current?.scrollTo({
      top: 0,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
    });
  }, []);

  const [viewDirection, setViewDirection] = useState<-1 | 0 | 1>(0);
  const selectView = useCallback(
    (id: Tab, direction: -1 | 0 | 1 = 0) => {
      if (id !== tab) {
        setViewDirection(direction);
        setTab(id);
      }
      scrollContentToTop();
    },
    [tab, scrollContentToTop],
  );
  const swipeHandlers = useSwipeNavigation({
    views: navItems.map((item) => item.id),
    active: tab,
    onNavigate: selectView,
  });

  useInteractionFeedback(state.haptics !== false);

  const startSession = (week: number, routine: string) => {
    setPreferredRoutine(routine);
    setTrainingNotice('');
    updateState((current) =>
      current.week === week ? current : { ...current, week },
    );
    setTab('today');
    scrollContentToTop();
  };

  const finishSession = (workout: WorkoutLog, exerciseLog?: ExerciseLog) => {
    const updatedWorkouts = [
      ...state.workoutLogs.filter((item) => item.id !== workout.id),
      workout,
    ];
    const rotationNext = state.rotation
      ? nextRotationRoutine(state, updatedWorkouts)
      : null;
    const next = rotationNext
      ? { week: state.week, routine: rotationNext }
      : countsTowardPlan(workout)
        ? nextPlanSession(
            state.plan,
            { ...state, workoutLogs: updatedWorkouts },
            workout.week,
            workout.routine,
          )
        : null;
    updateState((current) => ({
      ...current,
      week: next?.week ?? current.week,
      workoutLogs: [
        ...current.workoutLogs.filter((item) => item.id !== workout.id),
        workout,
      ],
      activeWorkouts: (current.activeWorkouts ?? []).filter(
        (item) => item.id !== workout.id,
      ),
      exerciseLogs: exerciseLog
        ? [
            ...current.exerciseLogs.filter(
              (item) => item.id !== exerciseLog.id,
            ),
            exerciseLog,
          ]
        : current.exerciseLogs,
    }));
    if (next) {
      setPreferredRoutine(next.routine);
      const name =
        state.sessions.find((session) => session.id === next.routine)?.name ??
        next.routine;
      setTrainingNotice(
        `Sesión registrada. Siguiente: ${name}${state.rotation ? ' · rotación' : ` · semana ${next.week}`}.`,
      );
    } else {
      setTrainingNotice(
        countsTowardPlan(workout)
          ? 'Sesión registrada. No quedan sesiones pendientes en el plan.'
          : 'Entrenamiento guardado. Esta sesión sigue pendiente porque no hay ejercicios realizados.',
      );
    }
    scrollContentToTop();
  };

  const content =
    tab === 'today' ? (
      <TodayView
        accountId={accountId}
        editable={persistenceStatus.canEdit}
        key={`${state.week}:${preferredRoutine}`}
        state={state}
        updateState={updateState}
        onOpenSessions={() => setTab('plan')}
        preferredRoutine={preferredRoutine}
        onFinish={finishSession}
        notice={trainingNotice}
        onStartRest={startRest}
        onStopRest={stopRest}
        onOfferUndo={offerUndo}
        onClearUndo={dismissUndo}
      />
    ) : tab === 'plan' ? (
      <PlanView
        state={state}
        updateState={updateState}
        onStartSession={startSession}
      />
    ) : tab === 'progress' ? (
      <ProgressView
        editable={persistenceStatus.canEdit}
        state={state}
        updateState={updateState}
      />
    ) : (
      <ProfileView
        editable={persistenceStatus.canEdit}
        authBusy={authBusy}
        authError={authError}
        cloudReady={cloudReady}
        onGoogleLogin={handleGoogleLogin}
        onLogout={handleLogout}
        onOpenGym={gymRoute.enter}
        state={state}
        updateState={updateState}
        user={firebaseUser}
      />
    );

  if (!hydrated)
    return (
      <div className={isDark ? 'dark' : ''}>
        <main className="grid min-h-dvh place-items-center bg-background px-6 text-foreground">
          <div className="text-center">
            <span className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground">
              <HeartPulse className="size-7" />
            </span>
            <p className="text-sm text-muted-foreground">Abriendo tu diario…</p>
            {mode !== 'local' ? (
              <Button
                className="mt-5 min-h-11"
                variant="ghost"
                disabled={authBusy}
                onClick={handleUseLocal}
              >
                Usar sin cuenta (sólo local)
              </Button>
            ) : null}
          </div>
        </main>
      </div>
    );
  if (mode !== 'local' && (!firebaseUser || firebaseUser.isAnonymous))
    return (
      <AccessScreen
        dark={isDark}
        busy={authBusy}
        error={authError}
        cloudAvailable={firebaseConfigured}
        onLocal={handleUseLocal}
        onSync={handleGoogleLogin}
      />
    );

  return (
    <HistoryProvider value={historySource}>
      <DialogThemeProvider value={isDark}>
        {gymRoute.open ? (
          <div className={isDark ? 'dark' : ''}>
            <Suspense
              fallback={
                <main className="min-h-dvh bg-background p-6 text-foreground">
                  Abriendo tu gimnasio…
                </main>
              }
            >
              <ViewBoundary>
                <GymApp
                  state={state}
                  editable={persistenceStatus.canEdit}
                  localOnly={mode === 'local'}
                  onBack={() => {
                    gymRoute.leave();
                    setTab('profile');
                  }}
                />
              </ViewBoundary>
            </Suspense>
          </div>
        ) : (
          <>
            {localImport && mode === 'cloud' ? (
              <LocalDataImport
                state={state}
                incoming={localImport}
                editable={persistenceStatus.canEdit}
                onImport={updateState}
                onClose={dismissLocalImport}
              />
            ) : null}
            <div className={isDark ? 'dark' : ''}>
              <div
                className="app-shell bg-background text-foreground"
                data-rest-active={restDeadline !== null}
              >
                <a
                  href="#view-content"
                  className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-background focus:p-3"
                >
                  Saltar al contenido
                </a>
                <main
                  id="app-content"
                  tabIndex={-1}
                  ref={contentScroll}
                  className="app-content"
                  {...swipeHandlers}
                >
                  <div className="mx-auto max-w-[1180px] px-4 pb-6 pt-5 sm:px-7">
                    <header className="app-header">
                      <button
                        className="app-brand"
                        aria-label="Zero to Hero · ir a Hoy"
                        onClick={() => setTab('today')}
                        type="button"
                      >
                        <span className="app-brand-mark">
                          <HeartPulse className="size-7" strokeWidth={2.4} />
                        </span>
                        <span className="brand-name">
                          Zero <span className="brand-connector">to</span> Hero
                        </span>
                      </button>
                      <div className="flex items-center gap-2">
                        <SaveStatus status={persistenceStatus} />
                      </div>
                    </header>
                    <div id="view-content" tabIndex={-1}>
                      <MotionSurface
                        className="mx-auto max-w-[760px]"
                        motionKey={tab}
                        direction={viewDirection}
                      >
                        {updateAvailable ? (
                          <output className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/5 p-3">
                            <span className="text-sm font-medium">
                              Nueva versión disponible
                            </span>
                            <Button
                              className="min-h-10 shrink-0 rounded-lg"
                              onClick={() => window.location.reload()}
                              size="sm"
                              variant="outline"
                            >
                              Actualizar
                            </Button>
                          </output>
                        ) : null}
                        {tab === 'timers' ? (
                          <div className="section-heading">
                            <div>
                              <h1 className="page-title">Timer</h1>
                              <p className="page-subtitle">
                                Tu ritmo, sin distracciones
                              </p>
                            </div>
                          </div>
                        ) : null}
                        <div className={tab === 'timers' ? '' : 'hidden'}>
                          <WorkoutTimer />
                        </div>
                        {persistenceStatus.conflicts?.length ? (
                          <SyncConflicts
                            key={JSON.stringify(persistenceStatus.conflicts)}
                            state={state}
                            conflicts={persistenceStatus.conflicts}
                            onResolve={resolveConflicts}
                          />
                        ) : persistenceStatus.error ? (
                          <div
                            role="alert"
                            className="mb-4 rounded-xl border border-[color:var(--warning)]/40 bg-[color:var(--warning)]/10 p-3 text-sm"
                          >
                            {persistenceStatus.local === 'error'
                              ? 'No se ha podido guardar en este dispositivo.'
                              : mode === 'local'
                                ? 'No se ha confirmado el guardado local. Tus cambios siguen pendientes.'
                                : 'No se ha confirmado la sincronización. Conservamos tus cambios pendientes.'}{' '}
                            <span className="block text-xs">
                              {persistenceStatus.error}
                            </span>
                            <Button
                              className="mt-3 min-h-11"
                              variant="outline"
                              onClick={() => void retrySync()}
                              disabled={syncing}
                            >
                              {syncing ? 'Reintentando…' : 'Reintentar'}
                            </Button>
                          </div>
                        ) : null}
                        {!persistenceStatus.canEdit &&
                        !persistenceStatus.error ? (
                          <output className="mb-4 block text-sm text-muted-foreground">
                            {mode === 'local'
                              ? 'Abriendo el guardado local…'
                              : 'Conectando con tu cuenta. La copia local se muestra en modo lectura.'}
                          </output>
                        ) : null}
                        <ViewBoundary key={tab}>
                          <Suspense
                            fallback={
                              <output className="block py-6 text-sm text-muted-foreground">
                                Cargando vista…
                              </output>
                            }
                          >
                            <fieldset
                              disabled={
                                !persistenceStatus.canEdit && tab !== 'profile'
                              }
                              className="min-w-0"
                            >
                              {tab === 'timers' ? null : tab === 'profile' ? (
                                <ProfileView
                                  editable={persistenceStatus.canEdit}
                                  authBusy={authBusy}
                                  authError={authError}
                                  cloudReady={cloudReady}
                                  onGoogleLogin={handleGoogleLogin}
                                  onLogout={handleLogout}
                                  onOpenGym={gymRoute.enter}
                                  state={state}
                                  updateState={updateState}
                                  user={firebaseUser}
                                />
                              ) : (
                                content
                              )}
                            </fieldset>
                          </Suspense>
                        </ViewBoundary>
                      </MotionSurface>
                    </div>
                  </div>
                </main>
                {undo ? (
                  <UndoNotice
                    key={undo.id}
                    message={undo.message}
                    onDismiss={dismissUndo}
                    onUndo={() => {
                      if (persistenceStatus.canEdit) undo.action();
                    }}
                  />
                ) : null}

                {restDeadline !== null ? (
                  <RestDock
                    key={restDeadline}
                    deadline={restDeadline}
                    onDismiss={stopRest}
                  />
                ) : null}
                <div className="bottom-nav">
                  <div className="mx-auto max-w-[680px]">
                    <LiquidNavigation
                      items={navItems}
                      active={tab}
                      onSelect={selectView}
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogThemeProvider>
    </HistoryProvider>
  );
}
