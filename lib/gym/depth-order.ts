export type WorldPoint = [number, number, number];
export type ScreenPoint = [number, number];
export type FurnitureSurface<T> = {
  world: WorldPoint[];
  screen: ScreenPoint[];
  value: T;
};
const cross = (a: ScreenPoint, b: ScreenPoint, p: ScreenPoint) =>
  (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
const area = (polygon: ScreenPoint[]) =>
  polygon.reduce((sum, p, i) => {
    const q = polygon[(i + 1) % polygon.length];
    return sum + p[0] * q[1] - q[0] * p[1];
  }, 0) / 2;

// Convex face intersection tells us where two rendered surfaces actually overlap.
function overlap(subject: ScreenPoint[], clip: ScreenPoint[]) {
  const sign = Math.sign(area(clip));
  let result = subject;
  for (let i = 0; i < clip.length && result.length; i++) {
    const a = clip[i],
      b = clip[(i + 1) % clip.length],
      input = result;
    result = [];
    for (let j = 0; j < input.length; j++) {
      const p = input[j],
        q = input[(j + 1) % input.length];
      const dp = cross(a, b, p) * sign,
        dq = cross(a, b, q) * sign;
      if (dp >= -1e-7) result.push(p);
      if (dp >= 0 !== dq >= 0) {
        const t = dp / (dp - dq);
        result.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
      }
    }
  }
  return result;
}

function depthAt<T>(surface: FurnitureSurface<T>, point: ScreenPoint) {
  const [a, b, c] = surface.world;
  if (!b) return a[0] + a[1];
  if (!c) {
    const p = [(a[0] - a[1]) * 36, (a[0] + a[1]) * 18 - a[2] * 30],
      q = [(b[0] - b[1]) * 36, (b[0] + b[1]) * 18 - b[2] * 30];
    const distance = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2;
    const t = distance
      ? Math.max(
          0,
          Math.min(
            1,
            ((point[0] - p[0]) * (q[0] - p[0]) +
              (point[1] - p[1]) * (q[1] - p[1])) /
              distance,
          ),
        )
      : 0.5;
    return a[0] + a[1] + t * (b[0] + b[1] - a[0] - a[1]);
  }
  const u = b.map((v, i) => v - a[i]),
    v = c.map((n, i) => n - a[i]);
  const n = [
    u[1] * v[2] - u[2] * v[1],
    u[2] * v[0] - u[0] * v[2],
    u[0] * v[1] - u[1] * v[0],
  ];
  const denominator = (n[0] + n[1]) / 2 + 0.6 * n[2];
  if (Math.abs(denominator) < 1e-8) return a[0] + a[1];
  const constant = n[0] * a[0] + n[1] * a[1] + n[2] * a[2];
  return (
    (constant - ((n[0] - n[1]) * point[0]) / 72 + (n[2] * point[1]) / 30) /
    denominator
  );
}

/** Painter order from actual 3D depth at overlapping projected faces, not JSX order. */
export function orderFurnitureSurfaces<T>(
  surfaces: FurnitureSurface<T>[],
): T[] {
  const edges = surfaces.map(() => new Set<number>()),
    incoming = surfaces.map(() => 0);
  const bounds = surfaces.map(({ screen }) => ({
    left: Math.min(...screen.map((p) => p[0])),
    right: Math.max(...screen.map((p) => p[0])),
    top: Math.min(...screen.map((p) => p[1])),
    bottom: Math.max(...screen.map((p) => p[1])),
  }));
  for (let i = 0; i < surfaces.length; i++)
    for (let j = i + 1; j < surfaces.length; j++) {
      const a = bounds[i],
        b = bounds[j];
      if (
        a.right <= b.left ||
        b.right <= a.left ||
        a.bottom <= b.top ||
        b.bottom <= a.top
      )
        continue;
      const intersection = overlap(surfaces[i].screen, surfaces[j].screen);
      if (intersection.length < 3 || Math.abs(area(intersection)) < 0.01)
        continue;
      const center: ScreenPoint = [
        intersection.reduce((s, p) => s + p[0], 0) / intersection.length,
        intersection.reduce((s, p) => s + p[1], 0) / intersection.length,
      ];
      const difference =
        depthAt(surfaces[i], center) - depthAt(surfaces[j], center);
      if (Math.abs(difference) < 1e-6) continue;
      const from = difference < 0 ? i : j,
        to = difference < 0 ? j : i;
      if (!edges[from].has(to)) {
        edges[from].add(to);
        incoming[to]++;
      }
    }
  const remaining = new Set(surfaces.map((_, i) => i)),
    result: T[] = [];
  while (remaining.size) {
    // Intersecting physical members can form cycles at joints; retain source
    // order there rather than dropping a surface or losing determinism.
    const next =
      [...remaining].find((i) => incoming[i] === 0) ??
      remaining.values().next().value!;
    remaining.delete(next);
    result.push(surfaces[next].value);
    for (const target of edges[next]) incoming[target]--;
  }
  return result;
}
