import test from 'node:test';
import assert from 'node:assert/strict';
import { activityCalendar } from './activity-calendar.ts';

test('calendar shows a full month aligned to Monday and counts only actual records', () => {
  const today = new Date(2026, 9, 23, 12);
  const days = activityCalendar(['2026-10-23T12:00:00', '2026-10-23T18:00:00', 'bad-date'], ['2026-10-23T10:00:00'], today);
  assert.equal(days.length, 35);
  assert.equal(days[0].key, '2026-09-28');
  assert.equal(days.filter(day => day.inMonth).length, 31);
  assert.equal(days[0].date.getDay(), 1);
  assert.equal(days.find(day => day.today)?.count, 3);
  assert.equal(days.find(day => day.key === '2026-10-24')?.future, true);
  assert.equal(days.reduce((sum, day) => sum + (day.future ? 0 : day.count), 0), 3);
});

test('calendar pages cross years, support leap months and never navigate to a future month', () => {
  const today = new Date(2026, 9, 23, 12);
  const current = activityCalendar([], [], today);
  const previous = activityCalendar(['2025-12-31T12:00:00'], [], today, -10);
  assert.equal(previous.find(day => day.key === '2025-12-31').count, 1);
  assert.equal(previous.filter(day => day.inMonth).length, 31);
  assert.equal(previous.some(day => day.today || day.future), false);
  assert.deepEqual(activityCalendar([], [], today, 1), current);
  assert.equal(activityCalendar([], [], new Date(2024, 2, 1), -1).filter(day => day.inMonth).length, 29);
  assert.equal(activityCalendar([], [], new Date(2021, 2, 1), -1).length, 28);
  assert.equal(activityCalendar([], [], new Date(2026, 7, 1)).length, 42);
});
