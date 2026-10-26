'use client';

import { useState } from 'react';
import { Stepper } from '@/components/number-stepper';
import { OptionalSection } from '@/components/optional-section';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { calculatePlates } from '@/lib/plate-calculator';

const defaultStock = [25, 20, 15, 10, 5, 2.5, 1.25, 0.5, 0.25].map(
  (weight) => ({ weight, pairs: weight === 20 ? 4 : 2 }),
);
const kg = (value: number) =>
  `${value.toLocaleString('es-ES', { maximumFractionDigits: 2 })} kg`;

export function PlateCalculator({
  load,
  onClose,
}: {
  load: number;
  onClose: () => void;
}) {
  const [target, setTarget] = useState(load);
  const [bar, setBar] = useState(20);
  const [stock, setStock] = useState(defaultStock);
  const result = calculatePlates(target, bar, stock);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogTitle>Discos para la barra</DialogTitle>
        <DialogDescription>
          El peso total incluye la barra. Monta los mismos discos en ambos
          lados.
        </DialogDescription>
        <div className="space-y-2 text-sm font-medium">
          <span>Peso total</span>
          <Stepper
            label="Peso total con barra"
            value={target}
            onChange={setTarget}
            step={0.5}
            max={1000}
            suffix="kg"
          />
        </div>
        <div
          className="border-y border-border py-4"
          aria-live="polite"
          aria-atomic="true"
        >
          {result ? (
            <>
              <p className="text-sm font-medium">Por lado</p>
              {result.plates.length ? (
                <ul
                  className="mt-3 flex flex-wrap gap-2"
                  aria-label="Discos en cada lado"
                >
                  {result.plates.map((plate) => (
                    <li
                      key={plate.weight}
                      className="rounded border border-border px-3 py-2 font-semibold tabular-nums"
                    >
                      {plate.pairs} × {kg(plate.weight)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 font-semibold">Solo la barra</p>
              )}
              <p className="mt-3 text-lg font-bold tabular-nums">
                Total: {kg(result.total)}
              </p>
              {result.remaining > 0 ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  Faltan {kg(result.remaining)} para el peso elegido con estos
                  discos.
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-sm">
              El peso total debe ser igual o mayor que la barra.
            </p>
          )}
        </div>
        <OptionalSection
          title="Barra y discos"
          summary={`Barra de ${kg(bar)}`}
          subtle
        >
          <div className="space-y-2 text-sm font-medium">
            <span>Peso de la barra</span>
            <Stepper
              label="Peso de la barra"
              value={bar}
              onChange={setBar}
              step={0.5}
              max={100}
              suffix="kg"
            />
          </div>
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">
              Pares disponibles
            </legend>
            {stock.map((plate, index) => (
              <div
                key={plate.weight}
                className="grid grid-cols-[1fr_8rem] items-center gap-3"
              >
                <span className="text-sm">{kg(plate.weight)}</span>
                <Stepper
                  label={`Pares de discos de ${kg(plate.weight)}`}
                  value={plate.pairs}
                  onChange={(pairs) =>
                    setStock((current) =>
                      current.map((item, position) =>
                        position === index ? { ...item, pairs } : item,
                      ),
                    )
                  }
                  max={10}
                />
              </div>
            ))}
          </fieldset>
        </OptionalSection>
      </DialogContent>
    </Dialog>
  );
}
