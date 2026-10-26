import sharp from 'sharp';

const root = new URL('../public/', import.meta.url);
for (const [file, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) {
  await sharp(new URL('icon.svg', root).pathname).resize(size, size).png().toFile(new URL(file, root).pathname);
}
await sharp(new URL('zero-to-hero-social.svg', root).pathname).png().toFile(new URL('zero-to-hero-social.png', root).pathname);
