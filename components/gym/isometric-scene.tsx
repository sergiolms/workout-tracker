'use client';
import { AvatarFigure, useGymCharacter } from './gym-character';
import { avatarOutfits, defaultAvatar } from '@/lib/gym/appearance';
import { useId } from 'react';
import { RoomSurfaces } from './room-surfaces';
import { useGymDrag } from '@/hooks/use-gym-drag';
import { isWalkableItem } from '@/lib/gym/avatar';
import { placementError } from '@/lib/gym/engine';
import type { GymState, GymPlacement } from '@/lib/gym/types';
import { ownedItems, roomSize } from '@/lib/gym/engine';
import type { GymItem } from '@/lib/gym/catalog';

type Point = [number, number, number];
const colors = {
  metal: '#38463f',
  edge: '#202c27',
  green: 'var(--gym-upholstery)',
  wood: 'var(--gym-wood)',
  pale: 'var(--gym-wall)',
  white: '#e5e9df',
};
function Furniture({
  item,
  location,
  origin,
  trophies = [],
}: {
  item: GymItem;
  location: GymPlacement;
  origin: [number, number];
  trophies?: { item: GymItem; slot: number }[];
}) {
  const project = ([x, y, z]: Point) => {
    const wx = location.x + (location.rotated ? item.depth - y : x);
    const wy = location.y + (location.rotated ? x : y);
    return [origin[0] + (wx - wy) * 36, origin[1] + (wx + wy) * 18 - z * 30];
  };
  const points = (list: Point[]) =>
    list.map((point) => project(point).join(',')).join(' ');
  const box = (
    x: number,
    y: number,
    z: number,
    w: number,
    d: number,
    h: number,
    color: string,
  ) => (
    <g>
      <polygon
        points={points([
          [x, location.rotated ? y : y + d, z],
          [x + w, location.rotated ? y : y + d, z],
          [x + w, location.rotated ? y : y + d, z + h],
          [x, location.rotated ? y : y + d, z + h],
        ])}
        fill={color}
        style={{
          filter: location.rotated ? 'brightness(.62)' : 'brightness(.77)',
        }}
      />
      <polygon
        points={points([
          [x + w, y, z],
          [x + w, y + d, z],
          [x + w, y + d, z + h],
          [x + w, y, z + h],
        ])}
        fill={color}
        style={{
          filter: location.rotated ? 'brightness(.77)' : 'brightness(.62)',
        }}
      />
      <polygon
        points={points([
          [x, y, z + h],
          [x + w, y, z + h],
          [x + w, y + d, z + h],
          [x, y + d, z + h],
        ])}
        fill={color}
      />
    </g>
  );
  const line = (a: Point, b: Point, stroke = colors.metal, width = 3) => {
    const p = project(a),
      q = project(b);
    return (
      <line
        x1={p[0]}
        y1={p[1]}
        x2={q[0]}
        y2={q[1]}
        stroke={stroke}
        strokeWidth={width}
        strokeLinecap="round"
      />
    );
  };
  const weight = (x: number, y: number, z: number) => (
    <g>
      {line([x - 0.16, y, z], [x + 0.16, y, z], '#8e9990', 2)}
      {box(x - 0.2, y - 0.08, z - 0.07, 0.1, 0.16, 0.14, colors.edge)}
      {box(x + 0.1, y - 0.08, z - 0.07, 0.1, 0.16, 0.14, colors.edge)}
    </g>
  );
  const id = item.id.replace('starter-', '');
  let shape;
  if (id.startsWith('award-')) {
    const [x, y] = project([0.5, 0.5, 1]);
    const gold = '#c5a253';
    let emblem;
    if (id === 'award-strength')
      emblem = (
        <>
          {line([0.15, 0.5, 1], [0.85, 0.5, 1], gold, 4)}
          {box(0.08, 0.25, 0.75, 0.18, 0.5, 0.5, gold)}
          {box(0.74, 0.25, 0.75, 0.18, 0.5, 0.5, gold)}
        </>
      );
    else if (id === 'award-activity')
      emblem = (
        <path
          d={`M${x + 3} ${y - 20}l-17 23h11l-3 17 20-25H${x + 3}Z`}
          fill={gold}
          stroke="#8b713d"
          strokeWidth="1.2"
        />
      );
    else if (id === 'award-mobility')
      emblem = (
        <g fill="none" stroke={gold} strokeWidth="3">
          <path
            d={`M${x} ${y + 12}C${x - 18} ${y + 6} ${x - 20} ${y - 6} ${x - 14} ${y - 10}Q${x - 3} ${y - 5} ${x} ${y + 12}Q${x + 3} ${y - 5} ${x + 14} ${y - 10}C${x + 20} ${y - 6} ${x + 18} ${y + 6} ${x} ${y + 12}Z`}
          />
          <path
            d={`M${x} ${y + 10}Q${x - 10} ${y - 8} ${x} ${y - 22}Q${x + 10} ${y - 8} ${x} ${y + 10}`}
          />
        </g>
      );
    else if (id === 'award-weeks')
      emblem = (
        <g>
          <rect
            x={x - 17}
            y={y - 18}
            width="34"
            height="33"
            rx="3"
            fill={gold}
            stroke="#8b713d"
          />
          <path
            d={`M${x - 17} ${y - 7}h34M${x - 9} ${y - 21}v9M${x + 9} ${y - 21}v9`}
            stroke="#766039"
            strokeWidth="2.5"
          />
          {[-8, 0, 8].flatMap((dx) =>
            [-1, 7].map((dy) => (
              <rect
                key={`${dx}:${dy}`}
                x={x + dx - 2}
                y={y + dy}
                width="4"
                height="4"
                rx=".5"
                fill="#766039"
              />
            )),
          )}
        </g>
      );
    else
      emblem = (
        <path
          d={`M${x} ${y - 20}l5 11 12 2-9 8 2 12-10-6-10 6 2-12-9-8 12-2Z`}
          fill={gold}
          stroke="#8b713d"
          strokeWidth="1"
        />
      );
    shape = (
      <g>
        {box(0.15, 0.15, 0, 0.7, 0.7, 0.16, colors.wood)}
        {box(0.4, 0.4, 0.16, 0.2, 0.2, 0.5, colors.metal)}
        {emblem}
      </g>
    );
  } else if (id === 'trophy-cabinet') {
    const shelfTrophies = (upper: boolean) =>
      trophies
        .filter(({ slot }) => slot < 2 === upper)
        .map(({ item: trophy, slot }) => {
          const p = project([
            slot % 2 === 0 ? 0.65 : 2.1,
            location.rotated ? 0.22 : 0.78,
            upper ? 2.5 : 1.03,
          ]);
          return (
            <g
              key={slot}
              transform={`translate(${p.join(',')}) scale(.52) translate(0 -18)`}
            >
              <Furniture
                item={trophy}
                origin={[0, 0]}
                location={{
                  room: location.room,
                  x: 0,
                  y: 0,
                  rotated: location.rotated,
                }}
              />
            </g>
          );
        });
    shape = (
      <g>
        {box(0, 0, 0, 3, 1, 0.12, colors.wood)}
        {box(0, 0.85, 0.1, 3, 0.12, 2.3, colors.metal)}
        {box(0, 0, 0.1, 0.1, 1, 2.3, colors.wood)}
        {box(2.9, 0, 0.1, 0.1, 1, 2.3, colors.wood)}
        {box(0.05, 0, 0.95, 2.9, 1, 0.08, colors.wood)}
        {shelfTrophies(false)}
        {box(0, 0, 2.4, 3, 1, 0.1, colors.wood)}
        {shelfTrophies(true)}
      </g>
    );
  } else if (item.kind === 'expansion') {
    shape = (
      <g>
        {box(0, 0, 0, 1.8, 1.4, 0.08, colors.wood)}
        {box(0, 0, 0.08, 1.8, 0.08, 1, colors.pale)}
        {box(0, 0, 0.08, 0.08, 1.4, 1, colors.pale)}
      </g>
    );
  } else if (id === 'mat')
    shape = (
      <g>
        {box(0.05, 0.12, 0.02, 1.85, 0.72, 0.07, colors.green)}
        {line([0.2, 0.25, 0.1], [0.2, 0.7, 0.1], '#a6bba6', 2)}
        {line([1.65, 0.25, 0.1], [1.65, 0.7, 0.1], '#a6bba6', 1)}
      </g>
    );
  else if (id === 'bench')
    shape = (
      <g>
        {box(0.2, 0.3, 0, 0.17, 0.45, 0.5, colors.metal)}
        {box(1.5, 0.3, 0, 0.17, 0.45, 0.65, colors.metal)}
        {line([0.3, 0.5, 0.2], [1.65, 0.5, 0.3], colors.metal, 5)}
        {box(0.1, 0.12, 0.48, 0.65, 0.75, 0.14, colors.green)}
        {box(0.85, 0.12, 0.65, 1, 0.75, 0.16, colors.green)}
      </g>
    );
  else if (id === 'rack' || id === 'cable')
    shape = (
      <g>
        {box(0.12, 0.15, 0, 2.7, 1.65, 0.1, colors.metal)}
        {[0.2, 2.6].map((x) => (
          <g key={x}>
            {box(x, 0.25, 0.1, 0.12, 0.12, 2.65, colors.metal)}
            {box(x, 1.6, 0.1, 0.12, 0.12, 2.65, colors.metal)}
            {line([x, 0.3, 2.7], [x, 1.65, 2.7])}
            {[0.5, 1, 1.5, 2].map((z) => (
              <g key={z}>
                {line([x + 0.02, 0.22, z], [x + 0.1, 0.22, z], '#b8c4b7', 1)}
              </g>
            ))}
          </g>
        ))}
        {line([0.25, 0.3, 2.7], [2.65, 0.3, 2.7])}
        {id === 'rack' ? (
          <g>
            {line([-0.1, 1.2, 1.45], [3.05, 1.2, 1.45], '#bac1b8', 3)}
            {box(0.1, 1.07, 1.15, 0.18, 0.28, 0.6, colors.edge)}
            {box(2.6, 1.07, 1.15, 0.18, 0.28, 0.6, colors.edge)}
          </g>
        ) : (
          <g>
            {box(1.05, 0.3, 0.12, 0.75, 0.8, 2.2, colors.edge)}
            {line([0.35, 0.3, 2.5], [0.35, 1.35, 1.15], '#bcc4ba', 1)}
            {line([2.55, 0.3, 2.5], [2.55, 1.35, 1.15], '#bcc4ba', 1)}
          </g>
        )}
      </g>
    );
  else if (id === 'dumbbell-rack')
    shape = (
      <g>
        {box(0.15, 0.2, 0, 0.13, 0.65, 1.05, colors.metal)}
        {box(1.7, 0.2, 0, 0.13, 0.65, 1.05, colors.metal)}
        {[0.35, 0.75, 1.1].map((z) => (
          <g key={z}>
            {box(0.08, 0.15, z, 1.8, 0.75, 0.07, colors.metal)}
            {[0.35, 0.85, 1.4].map((x) => (
              <g key={x}>{weight(x, 0.5, z + 0.16)}</g>
            ))}
          </g>
        ))}
      </g>
    );
  else if (id === 'weights' || id === 'kettlebells')
    shape = (
      <g>
        {weight(0.35, 0.3, 0.16)}
        {weight(0.65, 0.7, 0.16)}
        {id === 'kettlebells'
          ? box(0.2, 0.55, 0, 0.25, 0.25, 0.3, colors.green)
          : null}
      </g>
    );
  else if (id === 'bike')
    shape = (
      <g>
        {line([0.15, 0.4, 0.1], [1.7, 0.4, 0.1], colors.metal, 4)}
        {line([0.4, 0.4, 0.15], [0.9, 0.4, 1.15], colors.metal, 4)}
        {line([0.9, 0.4, 1.15], [1.5, 0.4, 0.4], colors.metal, 4)}
        {box(1.1, 0.15, 0.2, 0.55, 0.55, 0.55, colors.metal)}
        {line([0.8, 0.4, 0.8], [0.65, 0.4, 1.5])}
        {box(0.35, 0.2, 1.5, 0.6, 0.4, 0.12, colors.green)}
        {line([1.5, 0.4, 0.5], [1.65, 0.4, 1.7])}
        {line([1.65, 0.1, 1.7], [1.65, 0.8, 1.7])}
      </g>
    );
  else if (id === 'treadmill')
    shape = (
      <g>
        {box(0.1, 0.15, 0.05, 2.8, 1.65, 0.18, colors.metal)}
        {box(0.3, 0.3, 0.24, 2.3, 1.3, 0.025, colors.edge)}
        {line([2.65, 0.3, 0.2], [2.65, 0.3, 1.65])}
        {line([2.65, 1.7, 0.2], [2.65, 1.7, 1.65])}
        {box(2.35, 0.25, 1.65, 0.5, 1.5, 0.18, colors.metal)}
        {box(2.42, 0.6, 1.85, 0.3, 0.7, 0.025, '#96b6a3')}
      </g>
    );
  else if (id === 'platform')
    shape = (
      <g>
        {box(0.05, 0.05, 0, 2.9, 1.9, 0.13, colors.edge)}
        {box(0.65, 0.1, 0.13, 1.6, 1.8, 0.04, colors.wood)}
      </g>
    );
  else if (id === 'plant') {
    const [x, y] = project([0.5, 0.5, 1]);
    shape = (
      <g>
        {box(0.22, 0.22, 0, 0.55, 0.55, 0.5, colors.pale)}
        {line([0.5, 0.5, 0.45], [0.5, 0.5, 1.4], '#557a56', 2)}
        {[-1, 1].flatMap((direction) =>
          [0, 0.25, 0.5].map((offset) => (
            <ellipse
              key={`${direction}:${offset}`}
              cx={x + direction * (10 - offset * 6)}
              cy={y - offset * 23}
              rx={12}
              ry={5}
              transform={`rotate(${direction * 35} ${x + direction * (10 - offset * 6)} ${y - offset * 23})`}
              fill={offset === 0.25 ? '#77966d' : '#416f59'}
            />
          )),
        )}
      </g>
    );
  } else if (id === 'clock' || id === 'poster' || id === 'mirror') {
    const [x, y] = project([0.5, 0.45, 1.5]);
    shape = (
      <g>
        {box(0.12, 0.12, 0.02, 0.75, 0.7, 0.12, colors.wood)}
        {box(0.38, 0.36, 0.12, 0.12, 0.12, 1.9, colors.metal)}
        {id === 'clock' ? (
          <g>
            <circle
              cx={x}
              cy={y}
              r="14"
              fill={colors.pale}
              stroke={colors.wood}
              strokeWidth="3"
            />
            <path
              d={`M${x} ${y - 8}v8l6 3`}
              fill="none"
              stroke={colors.metal}
              strokeWidth="2"
            />
          </g>
        ) : (
          <g>
            <rect
              x={x - 14}
              y={y - 25}
              width="28"
              height="43"
              rx="2"
              fill={colors.wood}
            />
            <rect
              x={x - 11}
              y={y - 22}
              width="22"
              height="37"
              fill={id === 'mirror' ? '#b4d2cb' : colors.green}
            />
            {id === 'mirror' ? (
              <path
                d={`M${x - 8} ${y + 10}l16 -28`}
                stroke="#e3eee6"
                strokeWidth="2"
              />
            ) : (
              <path d={`M${x - 8} ${y + 3}l8 -12 8 12Z`} fill="#d5c18b" />
            )}
          </g>
        )}
      </g>
    );
  } else if (id === 'water')
    shape = (
      <g>
        {box(0.2, 0.2, 0.05, 0.65, 0.65, 1.25, colors.pale)}
        {box(0.3, 0.3, 1.3, 0.45, 0.45, 0.5, '#92b9b1')}
        {box(
          0.35,
          location.rotated ? 0.12 : 0.7,
          0.6,
          0.25,
          0.08,
          0.2,
          colors.metal,
        )}
      </g>
    );
  else if (id === 'lighting') {
    const [x, y] = project([0.5, 0.5, 2]);
    shape = (
      <g>
        {box(0.2, 0.2, 0, 0.6, 0.6, 0.08, colors.metal)}
        {line([0.5, 0.5, 0.08], [0.5, 0.5, 2])}
        <path d={`M${x - 8} ${y - 12}h16l7 20h-30Z`} fill="#d9c58f" />
      </g>
    );
  } else
    shape = box(
      0.02,
      0.02,
      0.02,
      item.width - 0.04,
      item.depth - 0.04,
      0.15,
      item.kind === 'finish' ? colors.wood : colors.green,
    );
  return <g className="gym-furniture">{shape}</g>;
}
export function GymItemPreview({
  item,
  rotated = false,
}: {
  item: GymItem;
  rotated?: boolean;
}) {
  if (item.kind === 'apparel')
    return (
      <svg viewBox="-28 -68 56 76" className="h-24 w-full" aria-hidden="true">
        <AvatarFigure
          appearance={{
            ...defaultAvatar,
            outfit: avatarOutfits[item.id] ? item.id : defaultAvatar.outfit,
          }}
        />
      </svg>
    );
  if (item.kind === 'finish')
    return (
      <svg
        className="h-24 w-full"
        viewBox="0 0 240 220"
        aria-hidden="true"
        data-floor={item.surface === 'floor' ? item.id : ''}
        data-wall={item.surface === 'wall' ? item.id : ''}
      >
        <RoomSurfaces
          size={3}
          origin={[120, 106]}
          floorId={item.surface === 'floor' ? item.id : ''}
          wallId={item.surface === 'wall' ? item.id : ''}
        />
      </svg>
    );
  const tall =
    item.id === 'water'
      ? 72
      : item.id.startsWith('award-')
        ? 65
        : item.id === 'trophy-cabinet'
          ? 82
          : ['rack', 'cable'].includes(item.id)
            ? 88
            : [
                  'bike',
                  'treadmill',
                  'clock',
                  'mirror',
                  'poster',
                  'lighting',
                  'water',
                ].includes(item.id)
              ? 75
              : item.id === 'plant'
                ? 55
                : item.id === 'dumbbell-rack'
                  ? 42
                  : item.kind === 'expansion'
                    ? 35
                    : 26;
  const width =
    item.kind === 'expansion' ? 2 : rotated ? item.depth : item.width;
  const depth =
    item.kind === 'expansion' ? 2 : rotated ? item.width : item.depth;
  return (
    <svg
      viewBox={`${-depth * 36 - 10} ${-tall - 10} ${(width + depth) * 36 + 20} ${(width + depth) * 18 + tall + 24}`}
      className="h-24 w-full"
      aria-hidden="true"
    >
      <Furniture
        item={item}
        location={{ room: 'main', x: 0, y: 0, rotated }}
        origin={[0, 0]}
      />
    </svg>
  );
}

export function IsometricScene({
  gym,
  room,
  selected,
  preview,
  onSelect,
  onCell,
  onDrop,
  onKeyboardMove,
  living = false,
}: {
  gym: GymState;
  room: 'main' | 'annex';
  selected?: string;
  preview?: GymPlacement | null;
  onSelect?: (id: string) => void;
  onCell?: (x: number, y: number) => void;
  onDrop?: (id: string, placement: GymPlacement) => void;
  onKeyboardMove?: (id: string, placement: GymPlacement) => void;
  living?: boolean;
}) {
  const character = useGymCharacter(gym, room, living);
  const size = roomSize(gym, room);
  const {
    svg: svgRef,
    preview: dragPreview,
    announcement,
    start: onDragStart,
    move: onDragMove,
    end: onDragEnd,
    cancel: onDragCancel,
  } = useGymDrag({ gym, size, onSelect, onDrop });
  const movementHelp = useId();
  const activeId = dragPreview?.id ?? selected;
  const width = size * 72 + 96,
    height = size * 36 + 135;
  const origin: [number, number] = [width / 2, 110];
  const floor = (x: number, y: number) =>
    `${origin[0] + (x - y) * 36},${origin[1] + (x + y) * 18}`;
  const owned = ownedItems(gym)
    .map((entry) => ({
      ...entry,
      location:
        entry.id === dragPreview?.id
          ? dragPreview.position
          : entry.id === selected && preview !== undefined
            ? preview
            : gym.placements[entry.id],
    }))
    .filter((entry) => entry.location?.room === room)
    .sort(
      (a, b) => a.location!.x + a.location!.y - b.location!.x - b.location!.y,
    );
  const layers = [
    ...owned,
    ...(character
      ? [
          {
            id: 'gym-character',
            item: null,
            location: {
              room,
              x: character.cell.x,
              y: character.cell.y,
              rotated: false,
            },
          },
        ]
      : []),
  ].sort((a, b) => {
    const af = Boolean(a.item && isWalkableItem(a.item)),
      bf = Boolean(b.item && isWalkableItem(b.item));
    if (af !== bf) return af ? -1 : 1;
    return a.location!.x + a.location!.y - b.location!.x - b.location!.y;
  });
  const floorId = gym.purchases[gym.finishes[room]?.floor ?? '']?.itemId ?? '';
  const wallId = gym.purchases[gym.finishes[room]?.wall ?? '']?.itemId ?? '';
  return (
    <>
      {onSelect ? (
        <p id={movementHelp} className="sr-only">
          Arrastra los objetos para moverlos. Con teclado: flechas para ajustar
          la posición, Intro para guardar y Escape para cancelar el arrastre.
        </p>
      ) : null}
      <output className="sr-only" aria-live="polite">
        {announcement}
      </output>
      <svg
        ref={svgRef}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragCancel}
        onLostPointerCapture={onDragCancel}
        viewBox={`0 0 ${width} ${height}`}
        className="block w-full"
        aria-label={`Tu gimnasio, sala ${room === 'main' ? 'principal' : 'anexa'}, ${size} por ${size} casillas`}
        data-floor={floorId}
        data-wall={wallId}
      >
        <RoomSurfaces
          size={size}
          origin={origin}
          floorId={floorId}
          wallId={wallId}
          onCell={onCell}
        />
        {layers.map(({ id, item, location }) => {
          if (!item && character)
            return (
              <g
                key="gym-character"
                aria-label="Tu personaje"
                pointerEvents="none"
                className="gym-character-position"
                style={{
                  transform: `translate(${origin[0] + (character.cell.x - character.cell.y) * 36}px,${origin[1] + (character.cell.x + character.cell.y + 1) * 18 - character.elevation}px)`,
                }}
              >
                <AvatarFigure
                  appearance={gym.avatar ?? defaultAvatar}
                  action={character.action}
                  groundOffset={character.elevation}
                />
              </g>
            );
          if (!item) return null;
          return (
            <g
              key={id}
              role={onSelect ? 'button' : undefined}
              tabIndex={onSelect ? 0 : undefined}
              aria-label={item.name}
              aria-hidden={!onSelect || undefined}
              aria-pressed={onSelect ? activeId === id : undefined}
              aria-describedby={onSelect ? movementHelp : undefined}
              data-draggable={Boolean(onDrop)}
              data-dragging={dragPreview?.id === id}
              onPointerDown={(event) => onDragStart(event, id, location!, item)}
              className="gym-scene-object"
              onClick={(event) => {
                if (!onDrop || event.detail === 0) onSelect?.(id);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  onSelect?.('');
                  return;
                }
                const shifts: Record<string, [number, number]> = {
                  ArrowUp: [0, -1],
                  ArrowDown: [0, 1],
                  ArrowLeft: [-1, 0],
                  ArrowRight: [1, 0],
                };
                const delta = shifts[event.key];
                if (delta && onKeyboardMove) {
                  event.preventDefault();
                  const candidate = {
                    ...location!,
                    x: Math.max(
                      0,
                      Math.min(
                        size - (location!.rotated ? item.depth : item.width),
                        location!.x + delta[0],
                      ),
                    ),
                    y: Math.max(
                      0,
                      Math.min(
                        size - (location!.rotated ? item.width : item.depth),
                        location!.y + delta[1],
                      ),
                    ),
                  };
                  onKeyboardMove(id, candidate);
                } else if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  if (
                    selected === id &&
                    preview &&
                    onDrop &&
                    !placementError(gym, id, preview)
                  )
                    onDrop(id, preview);
                  else onSelect?.(id);
                }
              }}
            >
              <g aria-hidden="true">
                {activeId === id ? (
                  <polygon
                    points={`${floor(location!.x, location!.y)} ${floor(location!.x + (location!.rotated ? item.depth : item.width), location!.y)} ${floor(location!.x + (location!.rotated ? item.depth : item.width), location!.y + (location!.rotated ? item.width : item.depth))} ${floor(location!.x, location!.y + (location!.rotated ? item.width : item.depth))}`}
                    fill={
                      placementError(gym, id, location!)
                        ? 'var(--destructive)'
                        : 'var(--primary)'
                    }
                    fillOpacity=".18"
                    stroke={
                      placementError(gym, id, location!)
                        ? 'var(--destructive)'
                        : 'var(--primary)'
                    }
                    strokeWidth="2"
                  />
                ) : null}
                <Furniture
                  item={item}
                  location={location!}
                  origin={origin}
                  trophies={Object.entries(gym.displays ?? {})
                    .filter(
                      ([trophy, place]) =>
                        place.shelfId === id &&
                        !(trophy === selected && preview),
                    )
                    .flatMap(([trophy, place]) => {
                      const entry = ownedItems(gym).find(
                        (owned) => owned.id === trophy,
                      );
                      return entry
                        ? [{ item: entry.item, slot: place.slot }]
                        : [];
                    })}
                />
              </g>
            </g>
          );
        })}
      </svg>
    </>
  );
}
