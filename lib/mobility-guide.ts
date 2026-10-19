export type MobilityGuide = {
  id: string;
  name: string;
  steps: [string, string];
};

export const mobilityGuides: Record<string, MobilityGuide> = {
  'Rodilla a pared / dorsiflexión': {
    id: 'ankle', name: 'Rodilla a pared / dorsiflexión',
    steps: ['Apoya el pie entero cerca de una pared.', 'Lleva la rodilla hacia la pared sin despegar el talón y vuelve despacio.'],
  },
  'Flexor de cadera': {
    id: 'hip-flexor', name: 'Flexor de cadera',
    steps: ['Coloca una rodilla en el suelo y el otro pie delante.', 'Lleva suavemente la cadera hacia delante sin arquear la zona lumbar. Cambia de lado.'],
  },
  'Open book': {
    id: 'open-book', name: 'Open book',
    steps: ['Túmbate de lado con las rodillas dobladas y los brazos juntos delante.', 'Abre el brazo de arriba girando el pecho; mantén las rodillas juntas y vuelve.'],
  },
  'Wall slides': {
    id: 'wall-slides', name: 'Wall slides',
    steps: ['Apoya la espalda en una pared y coloca los brazos flexionados.', 'Desliza los brazos hacia arriba sin arquear la espalda y baja con control.'],
  },
  'Sentadilla profunda asistida': {
    id: 'squat', name: 'Sentadilla profunda asistida',
    steps: ['Sujétate a un apoyo estable y separa los pies cómodamente.', 'Baja hasta una sentadilla cómoda, respira y vuelve a subir con ayuda del apoyo.'],
  },
  '90/90 de cadera': {
    id: 'hip-90', name: '90/90 de cadera',
    steps: ['Siéntate con una rodilla delante y otra al lado, ambas flexionadas.', 'Gira las rodillas al lado contrario sin forzar; usa las manos como apoyo.'],
  },
  'Isquios suave': {
    id: 'hamstring', name: 'Isquios suave',
    steps: ['Siéntate con una pierna estirada y la otra cómoda.', 'Inclínate desde la cadera hacia la pierna estirada hasta notar una tensión suave.'],
  },
  'Rotación torácica cuadrupedia': {
    id: 'thoracic', name: 'Rotación torácica cuadrupedia',
    steps: ['Ponte a cuatro apoyos y coloca una mano detrás de la cabeza.', 'Gira el codo hacia arriba desde la parte alta de la espalda; mantén la cadera estable.'],
  },
  'Bajar al suelo y levantarse': {
    id: 'floor-to-stand', name: 'Bajar al suelo y levantarse',
    steps: ['Baja al suelo con control, pasando por una rodilla si te ayuda.', 'Vuelve a ponerte de pie usando las manos o un apoyo estable si lo necesitas.'],
  },
};

export function resetMobilityKeys(done: string[], visibleKeys: string[]): string[] {
  const visible = new Set(visibleKeys);
  return done.filter((key) => !visible.has(key));
}
