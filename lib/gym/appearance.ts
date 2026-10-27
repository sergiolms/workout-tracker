export type GymAvatar = {
  body: 'man' | 'woman';
  hair: 'short' | 'curly' | 'long' | 'ponytail';
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
export const avatarOutfits: Record<
  string,
  { name: string; shirt: string; pants: string }
> = {
  'outfit-base': { name: 'Ropa inicial', shirt: '#6e967c', pants: '#35443d' },
  'outfit-ocean': {
    name: 'Conjunto océano',
    shirt: '#609bb0',
    pants: '#253e50',
  },
  'outfit-clay': {
    name: 'Conjunto arcilla',
    shirt: '#b9775e',
    pants: '#553d37',
  },
  'outfit-night': {
    name: 'Conjunto noche',
    shirt: '#76789c',
    pants: '#302f48',
  },
};
