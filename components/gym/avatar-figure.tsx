'use client';
import { useId } from 'react';
import {
  defaultAvatar,
  avatarOutfits,
  type GymAvatar,
} from '@/lib/gym/appearance';
import { AvatarHair } from './avatar-hair';

const shade = (hex: string, factor: number) =>
  `rgb(${[1, 3, 5].map((start) => Math.min(255, Math.round(parseInt(hex.slice(start, start + 2), 16) * factor))).join(',')})`;
type Point = [number, number];
const between = (a: Point, b: Point, t: number): Point => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
];

export function AvatarFigure({
  appearance = defaultAvatar,
  action = 'idle',
  groundOffset = 0,
}: {
  appearance?: GymAvatar;
  action?: string;
  groundOffset?: number;
}) {
  const id = useId().replace(/:/g, '');
  const outfit =
    avatarOutfits[appearance.outfit] ?? avatarOutfits['outfit-base'];
  const { skin, hair } = appearance;
  const { shirt, pants, top, bottom } = outfit;
  const woman = appearance.body === 'woman';
  const seated = action === 'cycle' || action === 'press';
  const squat = action === 'squat';
  const armsInFront = [
    'train',
    'stretch',
    'press',
    'pull',
    'cycle',
    'run',
    'drink',
  ].includes(action);
  const shorts = bottom === 'shorts';
  const longSleeves = ['jacket', 'hoodie', 'compression'].includes(top);
  const sleeveless = top === 'tank' || top === 'crop';
  const hem = top === 'crop' ? -30 : top === 'oversized' ? -22.5 : -24;
  // One closed silhouette per top; the sleeves belong to the arm, never to the
  // torso. This keeps the shoulder covered as each arm changes pose or animates.
  const torso = sleeveless
    ? `M-3.5-44L-6.6-43Q-5.8-38-8-36L${woman ? -6.3 : -7.4}-30L-7.5 ${hem}Q0 ${hem + 1.4} 7.5 ${hem}L${woman ? 6.3 : 7.4}-30 8-36Q5.8-38 6.6-43L3.5-44Z`
    : top === 'oversized'
      ? `M-3.5-44Q-7-44-9-41L-8.8 ${hem}Q0 ${hem + 1.4} 8.8 ${hem}L9-41Q7-44 3.5-44Z`
      : woman && top !== 'hoodie'
        ? `M-3.5-44Q-7-44-8.5-41L-7.5-35-6.2-30-7.5 ${hem}Q0 ${hem + 1.4} 7.5 ${hem}L6.2-30 7.5-35 8.5-41Q7-44 3.5-44Z`
        : `M-3.5-44Q-7-44-8.5-41L-7.8 ${hem}Q0 ${hem + 1.4} 7.8 ${hem}L8.5-41Q7-44 3.5-44Z`;
  const arm = (side: -1 | 1) => {
    const shoulder: Point = [side * 8, -41];
    let elbow: Point = [side * 12, -29],
      hand: Point = [side * 10, -20];
    if (action === 'stretch') {
      elbow = [side * 14, -51];
      hand = [side * 5, -65];
    }
    if (action === 'pull') {
      elbow = [side * 14, -46];
      hand = [side * 10, -55];
    }
    if (action === 'press') {
      elbow = [side * 14, -35];
      hand = [side * 13, -46];
    }
    if (action === 'cycle') {
      elbow = [side * 14, -34];
      hand = [side * 15, -28];
    }
    if (action === 'run') {
      elbow = [side * 13, -34];
      hand = [side * 7, -29];
    }
    if (action === 'drink' && side === 1) {
      elbow = [13, -32];
      hand = [7, -50];
    }
    const cuff = between(elbow, hand, 0.8);
    const sleeveEnd = between(
      shoulder,
      elbow,
      top === 'oversized' ? 0.65 : 0.42,
    );
    return (
      <g
        key={side}
        className={`gym-avatar-arm ${side === -1 ? 'left' : 'right'}`}
      >
        <path
          d={`M${shoulder.join(' ')}L${elbow.join(' ')}`}
          fill="none"
          stroke={side === -1 ? shade(skin, 0.95) : skin}
          strokeWidth="4.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {!sleeveless && (
          <path
            data-avatar-sleeve={longSleeves ? 'long' : 'short'}
            d={
              longSleeves
                ? `M${shoulder.join(' ')}L${elbow.join(' ')}L${cuff.join(' ')}`
                : `M${shoulder.join(' ')}L${sleeveEnd.join(' ')}`
            }
            fill="none"
            stroke={side === -1 ? shade(shirt, 0.96) : shade(shirt, 0.88)}
            strokeWidth={longSleeves ? 5.1 : top === 'oversized' ? 6.5 : 6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        <g
          className={
            side === 1 && action === 'train' ? 'gym-avatar-forearm' : undefined
          }
        >
          <path
            d={`M${elbow.join(' ')}L${hand.join(' ')}`}
            fill="none"
            stroke={skin}
            strokeWidth="4"
            strokeLinecap="round"
          />
          {longSleeves && (
            <path
              d={`M${elbow.join(' ')}L${cuff.join(' ')}`}
              fill="none"
              stroke={side === -1 ? shade(shirt, 0.96) : shade(shirt, 0.88)}
              strokeWidth="5.1"
              strokeLinecap="round"
            />
          )}
          <ellipse
            cx={hand[0]}
            cy={hand[1] + 0.2}
            rx="2"
            ry="2.3"
            fill={skin}
          />
          {(action === 'press' || (action === 'train' && side === 1)) && (
            <g transform={`translate(${hand[0]} ${hand[1]})`}>
              <path d="M-6 0H6" stroke="#98a99e" strokeWidth="1.6" />
              <rect
                x="-6.5"
                y="-3.5"
                width="2.8"
                height="7"
                rx=".7"
                fill="#364a3e"
              />
              <rect
                x="3.7"
                y="-3.5"
                width="2.8"
                height="7"
                rx=".7"
                fill="#364a3e"
              />
            </g>
          )}
        </g>
      </g>
    );
  };
  return (
    <g
      className="gym-avatar"
      data-action={action}
      data-outfit={appearance.outfit}
    >
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
        <clipPath id={`${id}-top`}>
          <path d={torso} />
        </clipPath>
      </defs>
      <ellipse
        cx="0"
        cy={groundOffset + 2}
        rx="13"
        ry="3.8"
        fill="#10251a"
        opacity=".14"
      />
      {([-1, 1] as const).map((side) => (
        <g
          key={side}
          className={`gym-avatar-leg ${side === -1 ? 'left' : 'right'}`}
        >
          {seated || squat ? (
            <>
              <path
                d={
                  seated
                    ? `M${side * 4}-24L${side * 13}-16 ${side * 9}-6`
                    : `M${side * 4}-19L${side * 11}-12 ${side * 7}-2`
                }
                fill="none"
                stroke={shorts ? skin : side === -1 ? shade(pants, 0.9) : pants}
                strokeWidth={bottom === 'leggings' ? 4.6 : 5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {shorts && (
                <path
                  d={
                    seated
                      ? `M${side * 4}-24L${side * 13}-16`
                      : `M${side * 4}-19L${side * 11}-12`
                  }
                  fill="none"
                  stroke={pants}
                  strokeWidth="5.8"
                  strokeLinecap="round"
                />
              )}
              <path
                d={
                  seated
                    ? `M${side * 10}-5h${side * 5}`
                    : `M${side * 8}-1h${side * 5}`
                }
                stroke="#eef0e8"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
            </>
          ) : (
            <g transform={side === 1 ? undefined : 'scale(-1 1)'}>
              <path
                d={
                  bottom === 'leggings'
                    ? 'M.8-24L7.5-25 6.6-13 7.3-2.2H3.5L1.5-13Z'
                    : 'M.8-24L7.5-25 7.1-13 8-2.2H3.1L1.5-13Z'
                }
                fill={shorts ? skin : side === -1 ? shade(pants, 0.9) : pants}
              />
              {shorts ? (
                <path
                  data-avatar-shorts="true"
                  d="M.8-24L7.5-25 8.3-14Q5.5-13.2 2-14Z"
                  fill={side === -1 ? shade(pants, 0.9) : pants}
                />
              ) : (
                <path
                  d="M5.8-21L5-13 5.8-6"
                  fill="none"
                  stroke={shade(pants, 1.28)}
                  strokeWidth=".7"
                />
              )}
              <path d="M3-3.2H8L11-.8Q12 .7 11 1.3H4Q1 1 2-1Z" fill="#eef0e8" />
              <path d="M2 1.1h9" stroke="#9caa9e" strokeWidth=".9" />
              <path d="M4-1.9h3" stroke={shirt} strokeWidth="1" />
            </g>
          )}
        </g>
      ))}
      <g
        className="gym-avatar-upper"
        transform={squat ? 'translate(0 5)' : undefined}
      >
        <g data-avatar-hair="back">
          <AvatarHair style={hair} layer="back" tie={shirt} />
        </g>
        {top === 'hoodie' && (
          <path
            d="M-4-46Q-9-46-9-40L-6-36H6L9-40Q9-46 4-46Z"
            fill={shade(shirt, 0.78)}
          />
        )}
        {/* Resting arms sit behind the shirt; active arms and their sleeves
            cross in front of it, so a curl cannot disappear into the torso. */}
        {!armsInFront && arm(-1)}
        {!armsInFront && arm(1)}
        <path d="M-2.6-48.5v7Q0-38.8 2.6-41.5v-7Z" fill={skin} />
        <path
          d="M-2.6-48.5h5.2v2.5Q0-44.9-2.6-46Z"
          fill={shade(skin, 0.82)}
          opacity=".6"
        />
        {top === 'crop' && (
          <path d="M-7.5-31Q0-29.5 7.5-31L7.5-24Q0-22.5-7.5-24Z" fill={skin} />
        )}
        <g className="gym-avatar-torso">
          <path data-avatar-top={top} d={torso} fill={`url(#${id}-shirt)`} />
          <g clipPath={`url(#${id}-top)`}>
            {top === 'hoodie' ? (
              <>
                <path
                  d="M-4-44l4 4 4-4"
                  fill="none"
                  stroke={shade(shirt, 0.72)}
                  strokeWidth="1.7"
                />
                <path d="M-2-41v5m4-5v5" stroke="#e4dfeb" strokeWidth=".55" />
                <path
                  d="M-4-30l-1 3h10l-1-3Z"
                  fill={shade(shirt, 0.88)}
                  stroke={shade(shirt, 0.72)}
                  strokeWidth=".5"
                />
              </>
            ) : (
              <>
                <path d="M-3.5-44Q0-38.5 3.5-44Z" fill={skin} />
                <path
                  d="M-3.5-43.6Q0-38.6 3.5-43.6"
                  fill="none"
                  stroke={shade(shirt, 1.35)}
                  strokeWidth=".85"
                />
              </>
            )}
            <path
              d={`M-9 ${hem - 1}Q0 ${hem + 0.5} 9 ${hem - 1}`}
              fill="none"
              stroke={shade(shirt, 0.77)}
              strokeWidth=".65"
            />
            {top === 'jacket' && (
              <>
                <path d="M0-40v16" stroke="#c9e2e3" strokeWidth=".65" />
                <path
                  d="M-5-30l1-3m9 3-1-3"
                  stroke={shade(shirt, 0.7)}
                  strokeWidth=".65"
                />
                <path d="M3-37h2.5" stroke="#e2eeec" strokeWidth=".8" />
              </>
            )}
            {top === 'compression' && (
              <path
                d="M-5-41L-3-34-5-25M5-41L3-34 5-25"
                fill="none"
                stroke="#8db6bd"
                strokeWidth=".65"
              />
            )}
            {appearance.outfit === 'outfit-clay' && (
              <path d="M-9-36H9v2.5H-9Z" fill="#e3bd95" opacity=".85" />
            )}
            {appearance.outfit === 'outfit-sprint' && (
              <path d="M-8-32L8-39v2L-8-30Z" fill="#f6cfaf" />
            )}
            {!['hoodie', 'jacket', 'compression'].includes(top) && (
              <path
                d="M3-37h2.5m-2.5 1.3h1.7"
                stroke="#f1efe3"
                strokeWidth=".75"
              />
            )}
            {['tee', 'oversized'].includes(top) && (
              <path
                d="M-5-31l1 2m9-4-1 4"
                fill="none"
                stroke={shade(shirt, 0.8)}
                strokeWidth=".6"
                strokeLinecap="round"
              />
            )}
          </g>
        </g>
        {armsInFront && arm(-1)}
        {armsInFront && arm(1)}
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
          <g data-avatar-hair="front">
            <AvatarHair style={hair} layer="front" tie={shirt} />
          </g>
        </g>
        {action === 'drink' && (
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
        )}
      </g>
    </g>
  );
}
