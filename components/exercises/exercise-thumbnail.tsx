import { ExerciseImage } from '@/components/exercises/exercise-media';
import { getExerciseDetails } from '@/lib/exercise-catalog';
import { sameExercise } from '@/lib/exercise-identity';
import type { AppState } from '@/lib/storage';

export function exerciseVisual(
  state: AppState | undefined,
  name: string,
  exerciseId?: string,
) {
  const template = state?.sessions
    .flatMap((session) => session.exercises)
    .find((exercise) => sameExercise({ exercise: name, exerciseId }, exercise));
  const catalogId = exerciseId?.startsWith('catalog:')
    ? exerciseId.slice(8)
    : template?.catalogId;
  return (
    template?.image ??
    (catalogId
      ? getExerciseDetails(name, catalogId)?.image
      : exerciseId
        ? undefined
        : getExerciseDetails(name)?.image)
  );
}

export function ExerciseThumbnail({
  name,
  image,
}: {
  name: string;
  image?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className="size-14 shrink-0 overflow-hidden rounded-lg bg-muted"
    >
      <ExerciseImage image={image} name={name} />
    </span>
  );
}
