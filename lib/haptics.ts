export type HapticKind = 'tap' | 'success' | 'warning';
const patterns: Record<HapticKind, number | number[]> = { tap: 20, success: [15, 25, 20], warning: 25 };
let lastFeedback = 0;

export function hapticFeedback(kind: HapticKind = 'tap'): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return false;
  const now = Date.now();
  if (now - lastFeedback < 60) return false;
  try {
    const accepted = navigator.vibrate(patterns[kind]);
    if (accepted) lastFeedback = now;
    return accepted;
  } catch { return false; }
}
