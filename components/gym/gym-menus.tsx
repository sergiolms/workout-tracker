'use client';
import { useState } from 'react';
import { ChevronDown, Store, Package } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';

export function GymChoiceMenu<T extends string>({
  label,
  value,
  choices,
  onChange,
}: {
  label: string;
  value: T;
  choices: { id: T; name: string }[];
  onChange: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className="gym-choice"
        aria-label={`${label}: ${choices.find((choice) => choice.id === value)?.name}`}
      >
        {choices.find((choice) => choice.id === value)?.name}
        <ChevronDown aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-44 p-1.5" align="end">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => {
            onChange(next as T);
            setOpen(false);
          }}
        >
          {choices.map((choice) => (
            <DropdownMenuRadioItem
              className="min-h-11 px-3"
              onClick={() => setOpen(false)}
              key={choice.id}
              value={choice.id}
            >
              {choice.name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
export type GymPanel = 'shop' | 'inventory';
export function GymNavigation({
  value,
  onChange,
}: {
  value: GymPanel;
  onChange: (panel: GymPanel) => void;
}) {
  return (
    <nav data-feedback="flow" aria-label="Gimnasio" className="gym-panel-nav">
      {(
        [
          { id: 'shop', name: 'Tienda', icon: Store },
          { id: 'inventory', name: 'Inventario', icon: Package },
        ] as const
      ).map(({ id, name, icon: Icon }) => (
        <button
          key={id}
          type="button"
          aria-current={value === id ? 'page' : undefined}
          onClick={() => onChange(id)}
        >
          <Icon aria-hidden="true" />
          {name}
        </button>
      ))}
    </nav>
  );
}
