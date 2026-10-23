export type ActivityDay = { key: string; date: Date; count: number; future: boolean; today: boolean; inMonth: boolean };

function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function activityCalendar(workoutDates: string[], cardioDates: string[], today = new Date(), monthOffset = 0): ActivityDay[] {
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const month = new Date(current.getFullYear(), current.getMonth() + Math.min(0, Math.floor(monthOffset)), 1);
  const monday = new Date(month);
  const leading = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - leading);
  const length = Math.ceil((leading + new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()) / 7) * 7;
  const counts = new Map<string, number>();
  for (const value of [...workoutDates, ...cardioDates]) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) continue;
    const key = localDayKey(date);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from({ length }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const key = localDayKey(date);
    return { key, date, count: counts.get(key) ?? 0, future: date > current, today: key === localDayKey(current), inMonth: date.getMonth() === month.getMonth() };
  });
}
