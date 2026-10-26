'use client';

import { useState } from 'react';
import { Footprints, Plus, Wind } from 'lucide-react';
import { CardioForm } from '@/components/activity-form';
import { AnimatedDisclosure } from '@/components/motion-surface';
import { MobilityRoutine } from '@/components/mobility-routine';
import type { AppState } from '@/lib/storage';

export function TodayActivities({
  state,
  updateState,
}: {
  state: AppState;
  updateState: (updater: (state: AppState) => AppState) => void;
}) {
  const [activityOpen, setActivityOpen] = useState(false);
  const [mobilityOpen, setMobilityOpen] = useState(false);
  return (
    <div className="divide-y divide-border border-y border-border">
      <section aria-label="Registrar actividad">
        <button
          aria-expanded={activityOpen}
          aria-controls="cardio-form"
          className="quick-card"
          onClick={() => setActivityOpen((open) => !open)}
          type="button"
        >
          <span className="icon-tile">
            <Wind aria-hidden="true" />
          </span>
          <span className="flex-1 text-left">
            <strong className="block text-base leading-6">
              Registrar actividad
            </strong>
            <small className="mt-1 block text-xs leading-5 text-muted-foreground">
              Cardio, caminata o clase
            </small>
          </span>
          <Plus
            aria-hidden="true"
            className={`transition ${activityOpen ? 'rotate-45' : ''}`}
          />
        </button>
        <AnimatedDisclosure id="cardio-form" open={activityOpen}>
          <div className="pb-4">
            <CardioForm updateState={updateState} />
          </div>
        </AnimatedDisclosure>
      </section>
      <section aria-label="Movilidad">
        <button
          aria-expanded={mobilityOpen}
          aria-controls="today-mobility"
          className="quick-card w-full"
          onClick={() => setMobilityOpen((open) => !open)}
          type="button"
        >
          <span className="icon-tile">
            <Footprints aria-hidden="true" />
          </span>
          <span className="flex-1 text-left">
            <strong className="block text-base leading-6">Movilidad</strong>
            <small className="mt-1 block text-xs leading-5 text-muted-foreground">
              Rutina corta o larga
            </small>
          </span>
          <Plus
            aria-hidden="true"
            className={`transition ${mobilityOpen ? 'rotate-45' : ''}`}
          />
        </button>
        <AnimatedDisclosure id="today-mobility" open={mobilityOpen}>
          <div className="pb-4">
            <MobilityRoutine state={state} updateState={updateState} />
          </div>
        </AnimatedDisclosure>
      </section>
    </div>
  );
}
