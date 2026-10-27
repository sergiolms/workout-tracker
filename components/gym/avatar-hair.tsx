import type { GymAvatar } from '@/lib/gym/appearance';

const color = '#3e3028';
const highlight = '#73513b';

export function AvatarHair({
  style,
  layer,
  tie,
}: {
  style: GymAvatar['hair'];
  layer: 'back' | 'front';
  tie: string;
}) {
  if (style === 'bald') return null;
  if (layer === 'back') {
    if (style === 'long' || style === 'bob')
      return (
        <path
          d={
            style === 'long'
              ? 'M-7-59Q-10-54-9-44L-10-35Q-5-33 0-35Q5-33 10-35L9-44Q10-54 7-59Z'
              : 'M-7-60Q-10-55-9-48L-10-46Q-5-44 0-46Q5-44 10-46L9-48Q10-55 7-60Z'
          }
          fill={color}
        />
      );
    if (style === 'ponytail')
      return (
        <g className="gym-avatar-ponytail">
          <path
            d="M-6-59Q-15-62-14-53Q-14-46-11-42Q-8-47-10-52Q-6-51-5-55Z"
            fill={color}
          />
          <path
            d="M-10-57Q-12-52-11-48"
            fill="none"
            stroke={highlight}
            strokeWidth=".8"
          />
          <path d="M-7-57l-3 2" stroke={tie} strokeWidth="1.8" />
        </g>
      );
    if (style === 'bun')
      return (
        <g>
          <ellipse cx="1" cy="-66" rx="4.6" ry="4.4" fill={color} />
          <path
            d="M-1-69Q4-70 4-66"
            fill="none"
            stroke={highlight}
            strokeWidth=".8"
          />
          <path d="M-3-63H4" stroke={tie} strokeWidth="1.1" />
        </g>
      );
    if (style === 'braids')
      return (
        <g stroke={color} strokeWidth="3.2" strokeLinecap="round">
          <path d="M-6-57Q-9-51-8-47L-7-40M6-57Q9-51 8-47L7-40" fill="none" />
          {[-1, 1].map((side) => (
            <g key={side}>
              {[-50, -47, -44, -41].map((y) => (
                <path
                  key={y}
                  d={`M${side * 7 - 1} ${y}l2 1.2`}
                  stroke={highlight}
                  strokeWidth=".6"
                />
              ))}
              <path
                d={`M${side * 7 - 1.3}-40h2.6`}
                stroke={tie}
                strokeWidth="1.2"
              />
            </g>
          ))}
        </g>
      );
    return null;
  }
  if (style === 'afro')
    return (
      <g fill={color}>
        <path d="M-8-55Q-11-58-10-63Q-8-69 0-69Q8-69 10-63Q11-58 8-55L5-58 4-60Q0-58-4-60L-5-57Z" />
        {[
          [-8, -61],
          [-6, -65],
          [-2, -67],
          [2, -67],
          [6, -65],
          [8, -61],
        ].map(([cx, cy]) => (
          <circle key={`${cx}:${cy}`} cx={cx} cy={cy} r="3" />
        ))}
        <path
          d="M-6-65q2-2 4-1m3-1q3-1 5 2"
          fill="none"
          stroke={highlight}
          strokeWidth=".8"
        />
      </g>
    );
  if (style === 'curly')
    return (
      <g fill={color}>
        {[
          [-5, -60],
          [-3, -63],
          [0, -64],
          [3, -63],
          [5, -60],
        ].map(([cx, cy]) => (
          <circle key={`${cx}:${cy}`} cx={cx} cy={cy} r="2.5" />
        ))}
        <path
          d="M-4-62Q0-64 3-61"
          fill="none"
          stroke={highlight}
          strokeWidth=".8"
        />
      </g>
    );
  if (style === 'buzz')
    return (
      <g>
        <path
          d="M-6.5-55.5V-58Q-6.5-63.7 0-63.7Q6.5-63.7 6.5-58V-55.5L5.3-56V-58.5Q0-61-5.3-58.5V-56Z"
          fill={color}
        />
        <path
          d="M-3-62Q0-63 3-62"
          fill="none"
          stroke={highlight}
          strokeWidth=".5"
        />
      </g>
    );
  if (style === 'mohawk')
    return (
      <g>
        <path
          d="M-6.5-57V-59Q-5-63 0-64Q5-63 6.5-59V-57L5-59Q0-62-5-59Z"
          fill={color}
          opacity=".65"
        />
        <path d="M-2-59L-2.5-66-1-69 1-68 2.5-65 2-59Z" fill={color} />
        <path d="M0-67v5" stroke={highlight} strokeWidth=".65" />
      </g>
    );
  const front: Partial<Record<GymAvatar['hair'], string>> = {
    short: 'M-6.8-55.5Q-9-64.5 0-65Q7-65 7-57L5-57 3.5-60Q-1-57-5-59L-5-54Z',
    long: 'M-7-56Q-9-65 0-65Q9-65 7-56L6-50 4.8-53 4.5-60Q0-57.5-4.7-59L-5-52-6.5-50Z',
    ponytail: 'M-7-55Q-9-64.5 0-65Q8-64.5 7-56L5-56 4-60Q0-57-4.5-58.7L-5-53Z',
    bun: 'M-7-55.5Q-8-64.5 0-65Q8-64.5 7-55.5L5-56 4.5-60Q0-58-4.5-60L-5-56Z',
    braids:
      'M-7-55.5Q-8-64.5 0-65Q8-64.5 7-55.5L5-56 4.5-60Q2-59 0-61Q-2-59-4.5-60L-5-56Z',
    bob: 'M-7-53Q-9-65 0-65Q9-65 7-53L5-51 5-59Q0-61-5-59V-51Z',
    pixie:
      'M-6.5-55Q-9-62-3-64L0-66 2-64 5-65Q9-62 6.5-56L5-56 4-60 0-57 1-60-4-58-5-54Z',
  };
  return (
    <g>
      <path d={front[style] ?? front.short} fill={color} />
      <path
        d={style === 'braids' ? 'M0-64v2' : 'M-4-62Q0-64 4-61.5'}
        fill="none"
        stroke={highlight}
        strokeWidth=".8"
        strokeLinecap="round"
      />
    </g>
  );
}
