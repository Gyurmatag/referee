function srcFor(key: string) {
  return `/api/evidence?key=${encodeURIComponent(key)}`;
}

export function ShotGallery({
  shots,
  label,
}: {
  shots: string[];
  label?: string;
}) {
  if (shots.length === 0) return null;
  return (
    <div>
      {label ? <p className="mb-2 text-[12px] text-muted-foreground">{label}</p> : null}
      <div className="grid grid-cols-2 gap-2">
        {shots.map((key) => (
          <a
            key={key}
            href={srcFor(key)}
            target="_blank"
            rel="noreferrer"
            className="overflow-hidden rounded-[10px] border border-black/10 bg-[#f3f3f3]"
          >
            <img
              src={srcFor(key)}
              alt="E2E screenshot"
              className="aspect-[16/10] w-full bg-white object-contain"
            />
            <p className="truncate px-2 py-1 font-mono text-[10px] text-muted-foreground">
              {key.split("/").pop()}
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}
