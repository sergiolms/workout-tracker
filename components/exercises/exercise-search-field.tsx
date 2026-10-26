'use client';

import { useRef, type RefObject } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ExerciseSearchField({
  value,
  onChange,
  inputRef,
}: {
  value: string;
  onChange: (value: string) => void;
  inputRef?: RefObject<HTMLInputElement | null>;
}) {
  const localRef = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? localRef;
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-background pl-3 focus-within:ring-2 focus-within:ring-ring">
      <Search
        aria-hidden="true"
        className="size-4 shrink-0 text-muted-foreground"
      />
      <input
        ref={ref}
        aria-label="Buscar ejercicios"
        type="search"
        autoComplete="off"
        spellCheck={false}
        maxLength={120}
        placeholder="Buscar ejercicio…"
        className="h-12 min-w-0 flex-1 bg-transparent pr-3 text-base outline-none"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {value ? (
        <Button
          aria-label="Limpiar búsqueda"
          variant="ghost"
          className="size-11 shrink-0 p-0"
          onClick={() => {
            onChange('');
            ref.current?.focus();
          }}
        >
          <X aria-hidden="true" className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}
