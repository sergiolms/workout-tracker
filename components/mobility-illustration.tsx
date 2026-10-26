const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export function MobilityIllustration({ id, name }: { id: string; name: string }) {
  return (
    <img
      alt={`Postura de referencia para ${name}`}
      className="aspect-square w-full rounded-xl object-cover"
      height={900}
      src={`${BASE_PATH}/mobility/${id}.jpg`}
      loading="lazy"
      width={900}
    />
  );
}
