export type GymAvatar = {
  body: 'man' | 'woman';
  hair: (typeof avatarHairstyles)[number]['id'];
  skin: string;
  outfit: string;
  wandering: boolean;
};
export const defaultAvatar: GymAvatar = {
  body: 'man',
  hair: 'short',
  skin: '#bd8b69',
  outfit: 'outfit-base',
  wandering: true,
};
export const avatarSkins = ['#f0c7a5', '#bd8b69', '#8d5b3d', '#50372c'];
export const avatarHairstyles = [
  { id: 'short', name: 'Corto' },
  { id: 'curly', name: 'Rizado' },
  { id: 'long', name: 'Largo' },
  { id: 'ponytail', name: 'Coleta' },
  { id: 'buzz', name: 'Rapado' },
  { id: 'pixie', name: 'Pixie' },
  { id: 'bob', name: 'Media melena' },
  { id: 'bun', name: 'Moño' },
  { id: 'afro', name: 'Afro' },
  { id: 'braids', name: 'Trenzas' },
  { id: 'mohawk', name: 'Cresta' },
  { id: 'bald', name: 'Sin pelo' },
] as const;
export type AvatarOutfit = {
  name: string;
  shirt: string;
  pants: string;
  top:
    | 'tee'
    | 'jacket'
    | 'hoodie'
    | 'tank'
    | 'crop'
    | 'compression'
    | 'oversized';
  bottom: 'joggers' | 'shorts' | 'leggings';
};
export const avatarOutfits: Record<string, AvatarOutfit> = {
  'outfit-base': {
    name: 'Ropa inicial',
    shirt: '#6e967c',
    pants: '#35443d',
    top: 'tee',
    bottom: 'joggers',
  },
  'outfit-ocean': {
    name: 'Conjunto océano',
    shirt: '#609bb0',
    pants: '#253e50',
    top: 'jacket',
    bottom: 'joggers',
  },
  'outfit-clay': {
    name: 'Conjunto arcilla',
    shirt: '#b9775e',
    pants: '#553d37',
    top: 'tee',
    bottom: 'shorts',
  },
  'outfit-night': {
    name: 'Conjunto noche',
    shirt: '#76789c',
    pants: '#302f48',
    top: 'hoodie',
    bottom: 'joggers',
  },
  'outfit-forest': {
    name: 'Tirantes bosque',
    shirt: '#478b77',
    pants: '#253b35',
    top: 'tank',
    bottom: 'joggers',
  },
  'outfit-sprint': {
    name: 'Running coral',
    shirt: '#d77c69',
    pants: '#34445a',
    top: 'tank',
    bottom: 'shorts',
  },
  'outfit-lilac': {
    name: 'Conjunto lavanda',
    shirt: '#b09ac8',
    pants: '#615478',
    top: 'crop',
    bottom: 'leggings',
  },
  'outfit-graphite': {
    name: 'Técnico grafito',
    shirt: '#495966',
    pants: '#27323c',
    top: 'compression',
    bottom: 'leggings',
  },
  'outfit-sand': {
    name: 'Oversize arena',
    shirt: '#d7bf94',
    pants: '#59634d',
    top: 'oversized',
    bottom: 'shorts',
  },
};
