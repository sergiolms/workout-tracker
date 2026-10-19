export type RoutineId = 'A1' | 'B1' | 'A2' | 'B2' | 'C1' | 'A3' | 'B3' | 'C2';

export type Exercise = {
  name: string;
  target: string;
  sets: number;
  minReps: number;
  maxReps: number;
  increment: number;
  unit?: string;
  catalogId?: string;
  description?: string;
  image?: string;
};

const exercise = (name: string, target: string, sets: number, minReps: number, maxReps: number, increment = 2.5, unit = 'kg'): Exercise => ({ name, target, sets, minReps, maxReps, increment, unit });

export const routines: Record<RoutineId, Exercise[]> = {
  A1: [
    exercise('Prensa de piernas', '3×8–12 · RIR 2–3', 3, 8, 12),
    exercise('Press de pecho en máquina', '3×8–12 · RIR 2–3', 3, 8, 12),
    exercise('Remo sentado', '3×8–12 · RIR 2–3', 3, 8, 12),
    exercise('Curl femoral', '3×10–12 · RIR 2–3', 3, 10, 12),
    exercise('Jalón al pecho', '2×8–12 · RIR 2–3', 2, 8, 12),
    exercise('Farmer carry', '3×20–40 m · RIR 2–3', 3, 20, 40, 1, 'kg/m'),
    exercise('Levantarse del suelo', '1×5 · Cómodo', 1, 5, 5, 1, 'reps'),
  ],
  B1: [
    exercise('Sentadilla a banco / goblet squat', '3×8–12 · RIR 2–3', 3, 8, 12),
    exercise('Press hombros máquina', '3×8–12 · RIR 2–3', 3, 8, 12),
    exercise('Remo con pecho apoyado', '3×8–12 · RIR 2–3', 3, 8, 12),
    exercise('Hip thrust', '3×8–12 · RIR 2–3', 3, 8, 12),
    exercise('Press pecho inclinado', '2×8–12 · RIR 2–3', 2, 8, 12),
    exercise('Pallof press', '3×10–12 · RIR 2–3', 3, 10, 12),
    exercise('Levantarse del suelo', '1×5 · Cómodo', 1, 5, 5, 1, 'reps'),
  ],
  A2: [
    exercise('Prensa / hack squat', '3×6–10 · RIR 1–2', 3, 6, 10),
    exercise('Peso muerto rumano mancuernas', '3×8–10 · RIR 2', 3, 8, 10),
    exercise('Press pecho', '3×6–10 · RIR 1–2', 3, 6, 10),
    exercise('Remo sentado', '3×8–12 · RIR 1–2', 3, 8, 12),
    exercise('Jalón al pecho', '3×8–12 · RIR 1–2', 3, 8, 12),
    exercise('Farmer carry', '3×30–60 m · RIR 1–2', 3, 30, 60, 1, 'kg/m'),
    exercise('Levantarse del suelo', '1×5 · Cómodo', 1, 5, 5, 1, 'reps'),
  ],
  B2: [
    exercise('Step-up cajón bajo', '3×8–10 · RIR 2', 3, 8, 10),
    exercise('Hip thrust', '3×8–12 · RIR 1–2', 3, 8, 12),
    exercise('Press hombro', '3×8–10 · RIR 2', 3, 8, 10),
    exercise('Remo unilateral', '3×8–12 · RIR 1–2', 3, 8, 12),
    exercise('Press inclinado', '3×8–12 · RIR 1–2', 3, 8, 12),
    exercise('Pallof press', '3×10 · RIR 1–2', 3, 10, 10),
    exercise('Levantarse del suelo', '1×5 · Cómodo', 1, 5, 5, 1, 'reps'),
  ],
  C1: [
    exercise('Goblet squat / sentadilla banco', '2×10–12 · RIR 3', 2, 10, 12),
    exercise('Peso muerto kettlebell desde altura', '2×8–10 · RIR 3', 2, 8, 10),
    exercise('Jalón al pecho', '2×10–12 · RIR 3', 2, 10, 12),
    exercise('Press pecho máquina', '2×10–12 · RIR 3', 2, 10, 12),
    exercise('Face pull', '2×12–15 · RIR 3', 2, 12, 15),
    exercise('Suitcase carry', '2×20–30 m · RIR 2–3', 2, 20, 30, 1, 'kg/m'),
    exercise('Step-up', '2×8 · RIR 3', 2, 8, 8),
  ],
  A3: [
    exercise('Prensa / hack squat', '4×6–8 · RIR 1–2', 4, 6, 8),
    exercise('Peso muerto rumano', '3×6–10 · RIR 1–2', 3, 6, 10),
    exercise('Press pecho', '3×6–10 · RIR 1–2', 3, 6, 10),
    exercise('Remo sentado', '3×8–10 · RIR 1–2', 3, 8, 10),
    exercise('Jalón al pecho', '2×8–12 · RIR 1–2', 2, 8, 12),
    exercise('Farmer carry pesado', '3×30–60 m · RIR 1–2', 3, 30, 60, 1, 'kg/m'),
    exercise('Levantarse del suelo', '1×5 · Fluido', 1, 5, 5, 1, 'reps'),
  ],
  B3: [
    exercise('Step-up alto / split squat asistido', '3×8–10 · RIR 1–2', 3, 8, 10),
    exercise('Hip thrust', '3×6–10 · RIR 1–2', 3, 6, 10),
    exercise('Press hombro', '3×6–10 · RIR 1–2', 3, 6, 10),
    exercise('Remo unilateral', '3×8–12 · RIR 1–2', 3, 8, 12),
    exercise('Press inclinado', '2×8–12 · RIR 1–2', 2, 8, 12),
    exercise('Pallof press', '3×10–12 · RIR 2', 3, 10, 12),
    exercise('Elevación gemelos', '3×10–15 · RIR 2', 3, 10, 15),
  ],
  C2: [
    exercise('Goblet squat', '3×8–12 · RIR 2–3', 3, 8, 12),
    exercise('Peso muerto kettlebell', '3×8–10 · RIR 2–3', 3, 8, 10),
    exercise('Jalón al pecho', '2×10–12 · RIR 2–3', 2, 10, 12),
    exercise('Flexión inclinada / press pecho', '2×10–15 · RIR 2–3', 2, 10, 15),
    exercise('Cable chop', '2×10–12 · RIR 2–3', 2, 10, 12),
    exercise('Suitcase carry', '3×25–40 m · RIR 2', 3, 25, 40, 1, 'kg/m'),
    exercise('Step-up alterno', '2×10–12 · RIR 2–3', 2, 10, 12),
  ],
};

export const warmup = ['3–5 min de cardio suave', 'Movilidad de tobillo y cadera', '2 series de aproximación'];
export const mobility = [
  ['Rodilla a pared / dorsiflexión', '2×8/lado', 'Tobillos'],
  ['Flexor de cadera', '2×30 s/lado', 'Cadera'],
  ['Open book', '8/lado', 'Tórax'],
  ['Wall slides', '8–10', 'Hombros'],
  ['Sentadilla profunda asistida', '2×20–30 s', 'Global'],
  ['90/90 de cadera', '2×6/lado', 'Cadera'],
  ['Isquios suave', '2×30–45 s/lado', 'Piernas'],
  ['Rotación torácica cuadrupedia', '2×8/lado', 'Tórax'],
  ['Bajar al suelo y levantarse', '5 reps', 'Funcional'],
] as const;

