export default function Loading() {
  return (
    <main className="mx-auto max-w-3xl px-6 pb-20 pt-10">
      <div className="h-10 w-56 animate-pulse rounded-[2px] bg-[#efefef]" />
      <div className="mt-4 h-4 w-72 animate-pulse rounded-[2px] bg-[#efefef]" />
      <div className="mt-8 flex gap-2">
        <div className="h-9 w-28 animate-pulse rounded-[2px] bg-[#191919]" />
        <div className="h-9 w-24 animate-pulse rounded-[2px] bg-[#efefef]" />
      </div>
    </main>
  );
}
