export default function Loading() {
  return (
    <main className="shell pb-20 pt-10">
      <div className="h-10 w-28 animate-pulse rounded-[2px] bg-[#efefef]" />
      <div className="box mt-8 p-6">
        <div className="flex items-center gap-4">
          <div className="size-14 animate-pulse rounded-[5px] bg-[#efefef]" />
          <div className="h-4 w-24 animate-pulse rounded-[2px] bg-[#efefef]" />
        </div>
        <div className="mt-6 h-4 w-16 animate-pulse rounded-[2px] bg-[#efefef]" />
        <div className="mt-2 h-10 w-full animate-pulse rounded-[2px] bg-[#efefef]" />
        <div className="mt-5 h-9 w-16 animate-pulse rounded-[2px] bg-[#191919]" />
      </div>
    </main>
  );
}
