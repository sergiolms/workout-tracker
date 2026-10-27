'use client';
import { useId } from 'react';
import {
  defaultAvatar,
  avatarOutfits,
  type GymAvatar,
} from '@/lib/gym/appearance';
const shade = (hex: string, factor: number) =>
  `rgb(${[1, 3, 5].map((start) => Math.min(255, Math.round(parseInt(hex.slice(start, start + 2), 16) * factor))).join(',')})`;

export function AvatarFigure({
  appearance = defaultAvatar,
  action = 'idle',
  groundOffset = 0,
}: {
  appearance?: GymAvatar;
  action?: string;
  groundOffset?: number;
}) {
  const id = useId().replace(/:/g, ''),
    outfit = avatarOutfits[appearance.outfit] ?? avatarOutfits['outfit-base'];
  const skin = appearance.skin,
    shirt = outfit.shirt,
    pants = outfit.pants,
    hair = appearance.hair,
    woman = appearance.body === 'woman';
  const seated = action === 'cycle' || action === 'press';
  const squat = action === 'squat';
  return (
    <g className="gym-avatar" data-action={action}>
      <defs>
        <linearGradient id={`${id}-skin`} x1="0" y1="0" x2="1" y2="0">
          <stop stopColor={shade(skin, 1.06)} />
          <stop offset=".6" stopColor={skin} />
          <stop offset="1" stopColor={shade(skin, 0.87)} />
        </linearGradient>
        <linearGradient id={`${id}-shirt`} x1="0" y1="0" x2="1" y2=".2">
          <stop stopColor={shade(shirt, 1.1)} />
          <stop offset=".6" stopColor={shirt} />
          <stop offset="1" stopColor={shade(shirt, 0.82)} />
        </linearGradient>
      </defs>
      <ellipse
        cx="0"
        cy={groundOffset + 2}
        rx="13"
        ry="3.8"
        fill="#10251a"
        opacity=".14"
      />
      {seated || squat ? (
        <>
          <g className="gym-avatar-leg left">
            <path
              d={seated ? 'M-4-24L-13-16-9-6' : 'M-4-19L-11-12-7-2'}
              fill="none"
              stroke={shade(pants, 0.9)}
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={seated ? 'M-10-5h-5' : 'M-8-1h-5'}
              stroke="#e8ece3"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          </g>
          <g className="gym-avatar-leg right">
            <path
              d={seated ? 'M4-24L13-16 9-6' : 'M4-19L11-12 7-2'}
              fill="none"
              stroke={pants}
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={seated ? 'M10-5h5' : 'M8-1h5'}
              stroke="#eef0e8"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          </g>
        </>
      ) : (
        <>
          {' '}
          <g className="gym-avatar-leg left">
            <path
              d="M-7.5-25L-.8-24-1.5-13-3.1-2.2-8-2.2-7.1-13Z"
              fill={shade(pants, 0.9)}
            />
            <path
              d="M-5.8-21L-5-13-5.8-6"
              fill="none"
              stroke={shade(pants, 1.25)}
              strokeWidth=".7"
            />
            <path
              d="M-8-3.2L-3-3.2-2-1Q-1 1-4 1.3L-11 1.3Q-12 .7-11-.8Z"
              fill="#e8ece3"
            />
            <path d="M-11 1.1h9" stroke="#9caa9e" strokeWidth=".9" />
            <path d="M-7-1.9h3" stroke={shirt} strokeWidth="1" />
          </g>
          <g className="gym-avatar-leg right">
            <path d="M.8-24L7.5-25 7.1-13 8-2.2H3.1L1.5-13Z" fill={pants} />
            <path
              d="M5.8-21L5-13 5.8-6"
              fill="none"
              stroke={shade(pants, 1.35)}
              strokeWidth=".7"
            />
            <path d="M3-3.2H8L11-.8Q12 .7 11 1.3H4Q1 1 2-1Z" fill="#eef0e8" />
            <path d="M2 1.1h9" stroke="#9caa9e" strokeWidth=".9" />
            <path d="M4-1.9h3" stroke={shirt} strokeWidth="1" />
          </g>
        </>
      )}
      <g
        className="gym-avatar-upper"
        transform={squat ? 'translate(0 5)' : undefined}
      >
        {hair === 'long' ? (
          <path
            d="M-7-58Q-11-51-9-41L-10-35Q-5-32 0-35Q5-32 10-35L9-42Q11-52 7-58Z"
            fill="#3c2e28"
          />
        ) : null}
        {hair === 'ponytail' ? (
          <g className="gym-avatar-ponytail">
            <path
              d="M-6-58Q-14-61-14-53Q-14-45-11-42Q-8-47-10-52Q-6-51-5-54Z"
              fill="#40302a"
            />
            <path
              d="M-10-57Q-12-52-11-48"
              fill="none"
              stroke="#6b4d39"
              strokeWidth=".8"
            />
            <path d="M-7-57l-3 2" stroke={shirt} strokeWidth="1.8" />
          </g>
        ) : null}
        {['stretch', 'pull', 'press', 'cycle', 'run'].includes(action) ? (
          <g className="gym-avatar-arm left">
            <path
              d={
                action === 'stretch'
                  ? 'M-8-40L-14-51-5-65'
                  : action === 'pull'
                    ? 'M-8-40L-14-46-10-55'
                    : action === 'press'
                      ? 'M-8-40L-14-35-13-46'
                      : action === 'cycle'
                        ? 'M-8-40L-14-34-15-28'
                        : 'M-8-40L-13-34-7-29'
              }
              fill="none"
              stroke={skin}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {action === 'press' ? (
              <g>
                <path d="M-18-46h10" stroke="#98a99e" strokeWidth="1.5" />
                <path d="M-18-49v6m10-6v6" stroke="#364a3e" strokeWidth="3" />
              </g>
            ) : null}
          </g>
        ) : (
          <g className="gym-avatar-arm left">
            <path
              d="M-8-41Q-11-41-11.7-35L-13-29Q-13.3-27-12.5-25L-11-20Q-10.3-18.4-8.7-19.2Q-7.5-19.8-8.1-21.7L-9.2-27.5-7.2-35.5Z"
              fill={`url(#${id}-skin)`}
            />
            <path
              d="M-11.5-28.5l1.3 1.2"
              stroke={shade(skin, 0.75)}
              strokeWidth=".55"
              strokeLinecap="round"
            />
          </g>
        )}
        <g className="gym-avatar-torso">
          <path
            d={
              woman
                ? 'M-3.5-44Q-6.8-43.8-9-41.5L-7.5-34-6-30-7.5-24Q0-22.5 7.5-24L6-30 7.5-34 9-41.5Q6.8-43.8 3.5-44Z'
                : 'M-3.5-44Q-7.5-43.8-10-41L-8-34-7.8-24Q0-22.5 7.8-24L8-34 10-41Q7.5-43.8 3.5-44Z'
            }
            fill={`url(#${id}-shirt)`}
          />
          <path d="M3.5-44L2.5-41Q0-39-2.5-41L-3.5-44Z" fill={skin} />
          <path
            d="M-3.5-43.6Q0-38.6 3.5-43.6"
            fill="none"
            stroke={shade(shirt, 1.4)}
            strokeWidth="1"
          />
          <path
            d="M-7.5-25Q0-23.5 7.5-25"
            fill="none"
            stroke={shade(shirt, 0.75)}
            strokeWidth=".65"
          />
          <path
            d="M-5-31l1.1 2.5m8-4L3-29"
            fill="none"
            stroke={shade(shirt, 0.8)}
            strokeWidth=".6"
            strokeLinecap="round"
          />
          {appearance.outfit === 'outfit-ocean' ? (
            <>
              <path d="M0-40v15" stroke="#b4d4d5" strokeWidth=".65" />
              <path d="M2.5-37h2.8" stroke="#d2e5df" strokeWidth=".9" />
            </>
          ) : appearance.outfit === 'outfit-clay' ? (
            <path d="M-8-36H8v2.5H-8Z" fill="#e3bd95" opacity=".8" />
          ) : appearance.outfit === 'outfit-night' ? (
            <>
              <path d="M-4-44l-3 3 7 4 7-4-3-3" fill={shade(shirt, 0.78)} />
              <path d="M0-37v12m-4-7h8" stroke="#bbbcd0" strokeWidth=".6" />
            </>
          ) : (
            <path
              d="M3-37h2.5m-2.5 1.3h1.7"
              stroke="#dce8d6"
              strokeWidth=".75"
            />
          )}
        </g>
        {['stretch', 'pull', 'press', 'cycle', 'run'].includes(action) ? (
          <g className="gym-avatar-arm right">
            <path
              d={
                action === 'stretch'
                  ? 'M8-40L14-51 5-65'
                  : action === 'pull'
                    ? 'M8-40L14-46 10-55'
                    : action === 'press'
                      ? 'M8-40L14-35 13-46'
                      : action === 'cycle'
                        ? 'M8-40L14-34 15-28'
                        : 'M8-40L13-34 7-29'
              }
              fill="none"
              stroke={skin}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {action === 'press' ? (
              <g>
                <path d="M8-46h10" stroke="#98a99e" strokeWidth="1.5" />
                <path d="M8-49v6m10-6v6" stroke="#364a3e" strokeWidth="3" />
              </g>
            ) : null}
          </g>
        ) : (
          <g className="gym-avatar-arm right">
            {action === 'drink' ? (
              <path
                d="M8.5-40Q12.5-37 13-32Q16-39 7-51"
                fill="none"
                stroke={skin}
                strokeWidth="4"
                strokeLinecap="round"
              />
            ) : (
              <>
                <path
                  d="M8-41Q11-41 11.7-35L12.5-28"
                  fill="none"
                  stroke={skin}
                  strokeWidth="4.5"
                  strokeLinecap="round"
                />
                <g className="gym-avatar-forearm">
                  <path
                    d="M12.5-28L10-20.5"
                    fill="none"
                    stroke={`url(#${id}-skin)`}
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                  <ellipse cx="10" cy="-20" rx="2" ry="2.4" fill={skin} />
                  {action === 'train' ? (
                    <g>
                      <path d="M4-20h12" stroke="#98a99e" strokeWidth="1.6" />
                      <rect
                        x="3"
                        y="-23.5"
                        width="3"
                        height="7"
                        rx=".7"
                        fill="#364a3e"
                      />
                      <rect
                        x="14"
                        y="-23.5"
                        width="3"
                        height="7"
                        rx=".7"
                        fill="#364a3e"
                      />
                    </g>
                  ) : null}
                </g>
              </>
            )}
            <path d="M7.5-42Q11-41.5 11-37L8-36 6-40Z" fill={shirt} />
          </g>
        )}
        <path d="M-2.6-48.5v5.7Q0-41 2.6-42.8v-5.7Z" fill={skin} />
        <path
          d="M-2.6-48.5h5.2v2.5Q0-44.9-2.6-46Z"
          fill={shade(skin, 0.82)}
          opacity=".6"
        />
        <g className="gym-avatar-head">
          <ellipse cx="-6.4" cy="-54" rx="1.6" ry="2.1" fill={skin} />
          <ellipse
            cx="6.4"
            cy="-54"
            rx="1.6"
            ry="2.1"
            fill={shade(skin, 0.93)}
          />
          <path
            d="M-6.5-57.5Q-6.5-63.2 0-63.2Q6.5-63.2 6.5-57.5V-53Q6.3-48.4 2-47H-2Q-6.3-48.4-6.5-53Z"
            fill={`url(#${id}-skin)`}
          />
          <path
            d="M-4.2-56.5q1.2-.6 2.4-.1m3.6 0q1.2-.5 2.4.1"
            fill="none"
            stroke="#594134"
            strokeWidth=".65"
            strokeLinecap="round"
          />
          <ellipse cx="-2.8" cy="-54.6" rx=".65" ry=".9" fill="#342d27" />
          <ellipse cx="2.8" cy="-54.6" rx=".65" ry=".9" fill="#342d27" />
          <path
            d="M.2-54l.6 2.5-.9.3"
            fill="none"
            stroke={shade(skin, 0.74)}
            strokeWidth=".55"
            strokeLinecap="round"
          />
          <path
            d="M-1.7-49.8q1.7 1.1 3.4 0"
            fill="none"
            stroke={shade(skin, 0.57)}
            strokeWidth=".65"
            strokeLinecap="round"
          />
          {hair === 'curly' ? (
            <g fill="#3b2d26">
              {[
                [-5, -60],
                [-3, -63],
                [0, -64],
                [3, -63],
                [5, -60],
              ].map(([cx, cy], index) => (
                <circle key={index} cx={cx} cy={cy} r="2.5" />
              ))}
              <path
                d="M-4-62Q0-64 3-61"
                fill="none"
                stroke="#72513a"
                strokeWidth=".8"
              />
            </g>
          ) : (
            <>
              <path
                d={
                  hair === 'long'
                    ? 'M-7-56Q-9-65 0-65Q9-65 7-56L6-50 4.8-53 4.5-60Q0-57.5-4.7-59L-5-52-6.5-50Z'
                    : hair === 'ponytail'
                      ? 'M-7-55Q-9-64.5 0-65Q8-64.5 7-56L5-56 4-60Q0-57-4.5-58.7L-5-53Z'
                      : 'M-6.8-55.5Q-9-64.5 0-65Q7-65 7-57L5-57 3.5-60Q-1-57-5-59L-5-54Z'
                }
                fill="#3e3028"
              />
              <path
                d="M-4-62Q0-64 4-61.5"
                fill="none"
                stroke="#73513b"
                strokeWidth=".9"
                strokeLinecap="round"
              />
            </>
          )}
        </g>
        {action === 'drink' ? (
          <g transform="rotate(-20 7 -51)">
            <g className="gym-avatar-bottle">
              <rect
                x="6"
                y="-52"
                width="4"
                height="8"
                rx="1"
                fill="#91c3c0"
                stroke="#5d9693"
                strokeWidth=".5"
              />
              <path d="M7-50v4" stroke="#dbeee1" strokeWidth=".8" />
              <ellipse cx="9" cy="-47" rx="1.7" ry="2" fill={skin} />
            </g>
          </g>
        ) : null}
      </g>
    </g>
  );
}
