'use client';

import { Dumbbell, Maximize2, X } from 'lucide-react';
import { useState } from 'react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { exerciseImageUrl } from '@/lib/exercise-catalog';

export function ExerciseImage({
  image,
  name,
}: {
  image?: string;
  name: string;
}) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  if (!image || failedImage === image)
    return (
      <span className="grid size-full place-items-center bg-muted text-primary">
        <Dumbbell className="size-7" />
      </span>
    );
  return (
    <img
      alt={`Demostración de ${name}`}
      className="size-full object-cover"
      height="160"
      width="160"
      loading="lazy"
      onError={() => setFailedImage(image)}
      src={exerciseImageUrl(image)}
    />
  );
}

function conciseExerciseText(description: string) {
  const sentences = description.split(/(?<=\.)\s+/).filter(Boolean);
  const first = sentences[0] ?? description;
  if (first.length <= 130) return [first];
  const boundary = first.lastIndexOf(' ', 125);
  return [
    first.slice(0, boundary > 80 ? boundary : 125).replace(/[\s,;:.]+$/, '') +
      '…',
  ];
}

export function ExercisePreview({
  image,
  name,
  description,
  compact = false,
}: {
  image?: string;
  name: string;
  description: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const failed = Boolean(image && failedImage === image);
  const steps = conciseExerciseText(description);
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (value) setFailedImage(null);
      }}
    >
      <DialogTrigger
        aria-label={`Ver demostración de ${name}`}
        className={`group relative block shrink-0 overflow-hidden rounded-xl bg-white outline-offset-4 transition focus-visible:outline-2 focus-visible:outline-primary ${compact ? 'size-16' : 'exercise-preview'}`}
        onClick={(event) => {
          setDark(Boolean(event.currentTarget.closest('.dark')));
        }}
      >
        <ExerciseImage image={image} name={name} />
        <span
          aria-hidden="true"
          className="absolute bottom-1 right-1 grid size-6 place-items-center rounded-md bg-black/65 text-white"
        >
          <Maximize2 className="size-3.5" />
        </span>
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className={`${dark ? 'dark' : ''} max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto overscroll-contain rounded-3xl p-0 sm:max-w-[560px]`}
      >
        <div className="sticky top-0 z-10 flex items-start gap-3 border-b border-border bg-popover p-4 sm:p-5">
          <div className="min-w-0 flex-1">
            <DialogTitle className="pr-2 text-lg font-bold leading-snug">
              {name}
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs">
              Demostración e instrucciones
            </DialogDescription>
          </div>
          <DialogClose
            aria-label="Cerrar demostración"
            className="grid size-11 shrink-0 place-items-center rounded-full bg-muted text-foreground transition hover:bg-accent"
          >
            <X className="size-5" />
          </DialogClose>
        </div>
        {open && image && (
          <div className="bg-white">
            {failed || image.startsWith('data:image/') ? (
              <div>
                <img
                  className="mx-auto max-h-[40dvh] w-full object-contain"
                  src={exerciseImageUrl(image)}
                  alt={name}
                />
                {!image.startsWith('data:image/') ? <output className="block px-4 py-2 text-center text-xs text-zinc-600">
                  Animación no disponible. Se muestra la imagen.
                </output> : null}
              </div>
            ) : (
              <video
                key={image}
                aria-label={`Demostración animada de ${name}`}
                className="mx-auto aspect-square max-h-[44dvh] w-full object-contain"
                src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/exercise-videos/${image.replace(/\.jpg$/, '.mp4')}`}
                poster={exerciseImageUrl(image)}
                playsInline
                muted
                loop
                autoPlay
                preload="metadata"
                onError={() => setFailedImage(image ?? null)}
              />
            )}
          </div>
        )}
        <div className="p-4 sm:p-5">
          {!image && (
            <p className="mb-4 text-sm text-muted-foreground">
              Este ejercicio no tiene demostración visual disponible.
            </p>
          )}
          <ol className="space-y-3">
            {steps.map((step, index) => (
              <li key={index} className="flex gap-3 text-sm leading-relaxed">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold tabular-nums">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          {image && (
            <p className="mt-5 border-t border-border pt-3 text-[11px] text-muted-foreground">
              Demostración orientativa · © Gym visual
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
