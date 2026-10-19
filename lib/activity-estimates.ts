export function activityEstimates(minutes: number, distanceKm: number, stepLengthCm = 70) {
  const valid = Number.isFinite(minutes) && minutes > 0 && Number.isFinite(distanceKm) && distanceKm > 0;
  const paceSeconds = valid ? Math.round(minutes * 60 / distanceKm) : null;
  const speed = valid ? distanceKm * 60 / minutes : null;
  const steps = Number.isFinite(distanceKm) && distanceKm > 0 && Number.isFinite(stepLengthCm) && stepLengthCm >= 20 && stepLengthCm <= 150 ? Math.round(distanceKm * 100000 / stepLengthCm) : null;
  return { paceSeconds, speed, steps };
}

export function formatPace(seconds: number | null) {
  return seconds === null ? '—' : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
