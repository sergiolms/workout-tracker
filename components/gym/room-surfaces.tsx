'use client';
import { useId } from 'react';

export function RoomSurfaces({
  size,
  origin,
  floorId,
  wallId,
  onCell,
}: {
  size: number;
  origin: [number, number];
  floorId: string;
  wallId: string;
  onCell?: (x: number, y: number) => void;
}) {
  const id = useId().replace(/:/g, '');
  const floor = (x: number, y: number) => [
    origin[0] + (x - y) * 36,
    origin[1] + (x + y) * 18,
  ];
  const quad = (x: number, y: number, w: number, d: number) =>
    [floor(x, y), floor(x + w, y), floor(x + w, y + d), floor(x, y + d)]
      .map((p) => p.join(','))
      .join(' ');
  const wall = (side: number, u: number, z: number) => {
    const p = side ? floor(0, u) : floor(u, 0);
    return [p[0], p[1] - z * 94];
  };
  const line = (a: number[], b: number[]) => `M${a.join(',')}L${b.join(',')}`;
  const wood = floorId === 'wood-floor';
  const rubber = floorId === 'rubber-floor';
  const rows = wood ? size * 2 : size;
  return (
    <g aria-hidden="true" className="gym-surfaces">
      <defs>
        <linearGradient id={`${id}-wall`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#fff" stopOpacity=".13" />
          <stop offset="1" stopColor="#07130d" stopOpacity=".1" />
        </linearGradient>
        <linearGradient id={`${id}-floor`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#fff" stopOpacity=".12" />
          <stop offset="1" stopColor="#07130d" stopOpacity=".08" />
        </linearGradient>
      </defs>
      <polygon
        points={quad(0, 0, size, size)}
        transform="translate(0 12)"
        fill="var(--gym-floor-edge)"
      />
      {[0, 1].map((side) => {
        const shape = [
          wall(side, 0, 0),
          wall(side, size, 0),
          wall(side, size, 1),
          wall(side, 0, 1),
        ]
          .map((p) => p.join(','))
          .join(' ');
        return (
          <g key={side}>
            <polygon
              points={shape}
              fill={side ? 'var(--gym-wall-side)' : 'var(--gym-wall)'}
            />
            <polygon points={shape} fill={`url(#${id}-wall)`} />
            {wallId === 'brick-wall' ? (
              Array.from({ length: 6 }, (_, row) => (
                <g key={row}>
                  <path
                    d={line(wall(side, 0, row / 6), wall(side, size, row / 6))}
                    stroke="var(--gym-wall-joint)"
                    strokeWidth="1.2"
                  />
                  {Array.from({ length: size }, (_, col) => {
                    const u = col + (row % 2 ? 0.5 : 0);
                    return (
                      <path
                        key={col}
                        d={line(
                          wall(side, u, row / 6),
                          wall(side, u, (row + 1) / 6),
                        )}
                        stroke="var(--gym-wall-joint)"
                        strokeWidth="1"
                      />
                    );
                  })}
                </g>
              ))
            ) : wallId === 'wood-wall' ? (
              Array.from({ length: size * 4 }, (_, index) => (
                <path
                  key={index}
                  d={line(wall(side, index / 4, 0), wall(side, index / 4, 1))}
                  stroke="var(--gym-wall-joint)"
                  strokeWidth={index % 4 === 0 ? 2 : 1}
                  opacity=".55"
                />
              ))
            ) : (
              <>
                <path
                  d={line(wall(side, 0, 0.72), wall(side, size, 0.72))}
                  stroke="var(--gym-wall-line)"
                  strokeWidth="1"
                  opacity=".35"
                />
                {Array.from({ length: Math.ceil(size / 2) }, (_, index) => (
                  <path
                    key={index}
                    d={line(wall(side, index * 2, 0), wall(side, index * 2, 1))}
                    stroke="var(--gym-wall-line)"
                    strokeWidth=".8"
                    opacity=".2"
                  />
                ))}
              </>
            )}
            <path
              d={line(wall(side, 0, 0.045), wall(side, size, 0.045))}
              stroke="var(--gym-skirting)"
              strokeWidth="6"
            />
            <path
              d={line(wall(side, 0, 1), wall(side, size, 1))}
              stroke="var(--gym-wall-rim)"
              strokeWidth="3"
            />
          </g>
        );
      })}
      {Array.from({ length: rows }, (_, row) =>
        Array.from({ length: size }, (_, col) => {
          const y = row * (wood ? 0.5 : 1),
            depth = wood ? 0.5 : 1;
          const variation = (col * 7 + row * 3) % 5;
          return (
            <g
              key={`${row}:${col}`}
              onClick={() => onCell?.(col, Math.floor(y))}
              className={onCell ? 'cursor-crosshair' : ''}
            >
              <polygon
                points={quad(col, y, 1, depth)}
                fill="var(--gym-floor)"
                stroke="var(--gym-seam)"
                strokeWidth={rubber ? '.65' : '.35'}
              />
              <polygon
                points={quad(col, y, 1, depth)}
                fill={variation > 2 ? '#fff' : '#10261a'}
                opacity={wood ? '.035' : '.018'}
              />
              {wood ? (
                <>
                  <path
                    d={line(
                      floor(col + 0.07, y + 0.14),
                      floor(col + 0.9, y + 0.14),
                    )}
                    stroke="#644a30"
                    strokeWidth=".5"
                    opacity=".22"
                  />
                  <path
                    d={line(
                      floor(col + 0.2, y + 0.3),
                      floor(col + 0.85, y + 0.3),
                    )}
                    stroke="#fff1d1"
                    strokeWidth=".5"
                    opacity=".32"
                  />
                </>
              ) : rubber ? (
                <>
                  {[0.2, 0.55, 0.8].map((v, index) => {
                    const p = floor(col + v, y + ((index * 0.31 + 0.2) % 1));
                    return (
                      <circle
                        key={v}
                        cx={p[0]}
                        cy={p[1]}
                        r=".55"
                        fill="#c3d1c2"
                        opacity=".35"
                      />
                    );
                  })}
                </>
              ) : null}
            </g>
          );
        }),
      )}
      <polygon
        points={quad(0, 0, size, size)}
        fill={`url(#${id}-floor)`}
        pointerEvents="none"
      />
      <path
        d={`${line(floor(0, size), floor(size, size))}${line(floor(size, size), floor(size, 0))}`}
        stroke="var(--gym-floor-trim)"
        strokeWidth="2"
        fill="none"
      />
    </g>
  );
}
