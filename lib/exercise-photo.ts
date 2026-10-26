export async function prepareExercisePhoto(file: File): Promise<string> {
  if (
    !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
    file.size > 10_000_000
  )
    throw Error('Elige una foto JPG, PNG o WebP de hasta 10 MB.');
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 320 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw Error('No se pudo preparar la foto en este navegador.');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const image = canvas.toDataURL('image/webp', 0.65);
    if (image.length > 65000)
      throw Error(
        'La foto sigue siendo demasiado grande. Prueba con una imagen más sencilla.',
      );
    return image;
  } finally {
    bitmap.close();
  }
}
