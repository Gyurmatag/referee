export default function Loading() {
  return (
    <main className="shell pb-20 pt-10">
      <div className="h-4 w-28 animate-pulse rounded-[2px] bg-[#efefef]" />
      <div className="mt-6 h-12 w-80 animate-pulse rounded-[2px] bg-[#efefef]" />
      <div className="mt-3 h-4 w-96 animate-pulse rounded-[2px] bg-[#efefef]" />
      <div className="box mt-8 aspect-[16/10] animate-pulse bg-[#f3f3f3]" />
      <div className="mt-4 h-9 w-40 animate-pulse rounded-[2px] bg-[#191919]" />
    </main>
  );
}
