'use client';
import {
  useRef,
  useState,
  useCallback,
  useEffect,
  type PointerEvent,
} from 'react';
import { draggedPlacement } from '@/lib/gym/drag';
import { placementError } from '@/lib/gym/engine';
import type { GymState, GymPlacement } from '@/lib/gym/types';
import type { GymItem } from '@/lib/gym/catalog';

type Drag = {
  pointer: number;
  id: string;
  start: GymPlacement;
  item: GymItem;
  origin: { x: number; y: number };
  client: { x: number; y: number };
  position: GymPlacement;
  moved: boolean;
};
export function useGymDrag({
  gym,
  size,
  onSelect,
  onDrop,
}: {
  gym: GymState;
  size: number;
  onSelect?: (id: string) => void;
  onDrop?: (id: string, placement: GymPlacement) => void;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const current = useRef<Drag | null>(null);
  const [preview, setPreview] = useState<{
    id: string;
    position: GymPlacement;
  } | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const point = (event: PointerEvent) => {
    const matrix = svg.current?.getScreenCTM();
    if (!matrix) return null;
    return new DOMPoint(event.clientX, event.clientY).matrixTransform(
      matrix.inverse(),
    );
  };
  const clear = useCallback(() => {
    const drag = current.current;
    current.current = null;
    setPreview(null);
    if (drag && svg.current?.hasPointerCapture(drag.pointer))
      svg.current.releasePointerCapture(drag.pointer);
  }, []);
  useEffect(() => {
    if (!onDrop) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && current.current) {
        clear();
        setAnnouncement('Movimiento cancelado.');
      }
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [onDrop, clear]);
  return {
    svg,
    preview,
    announcement,
    start: (
      event: PointerEvent,
      id: string,
      start: GymPlacement,
      item: GymItem,
    ) => {
      if (!onDrop || event.button !== 0 || !event.isPrimary || current.current)
        return;
      const origin = point(event);
      if (!origin) return;
      event.preventDefault();
      current.current = {
        pointer: event.pointerId,
        id,
        start: { ...start },
        item,
        origin,
        client: { x: event.clientX, y: event.clientY },
        position: start,
        moved: false,
      };
      svg.current?.setPointerCapture(event.pointerId);
      setAnnouncement('');
    },
    move: (event: PointerEvent) => {
      const drag = current.current;
      if (!drag || drag.pointer !== event.pointerId) return;
      const location = point(event);
      if (!location) return;
      if (
        !drag.moved &&
        Math.hypot(
          event.clientX - drag.client.x,
          event.clientY - drag.client.y,
        ) < 6
      )
        return;
      drag.moved = true;
      drag.position = draggedPlacement(
        drag.start,
        location.x - drag.origin.x,
        location.y - drag.origin.y,
        size,
        drag.item.width,
        drag.item.depth,
      );
      setPreview({ id: drag.id, position: drag.position });
    },
    end: (event: PointerEvent) => {
      const drag = current.current;
      if (!drag || drag.pointer !== event.pointerId) return;
      clear();
      if (!drag.moved) {
        onSelect?.(drag.id);
        return;
      }
      const error = placementError(gym, drag.id, drag.position);
      if (error) {
        setAnnouncement(`${error} El objeto conserva su posición.`);
        return;
      }
      onDrop?.(drag.id, drag.position);
      setAnnouncement(`${drag.item.name}: nueva posición.`);
    },
    cancel: (event: PointerEvent) => {
      if (current.current?.pointer === event.pointerId) {
        clear();
        setAnnouncement('Movimiento cancelado.');
      }
    },
  };
}
