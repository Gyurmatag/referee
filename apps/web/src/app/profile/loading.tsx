export default function Loading() {
  return (
    <main className="mx-auto max-w-lg px-6 pb-20 pt-10">
      <div className="h-10 w-28 animate-pulse rounded-[2px] bg-[#efefef]" />
      <div className="box mt-8 p-6">
        <div className="flex items-center gap-4">
          <div className="size-14 animate-pulse rounded-[5px] bg-[#efefef]" />
          <div className="flex-1">
            <div className="h-5 w-36 animate-pulse rounded-[2px] bg-[#efefef]" />
            <div className="mt-2 h-4 w-24 animate-pulse rounded-[2px] bg-[#efefef]" />
          </div>
        </div>
        <div className="mt-5 flex gap-1.5">
          <div className="h-6 w-20 animate-pulse rounded-[2px] bg-[#efefef]" />
          <div className="h-6 w-20 animate-pulse rounded-[2px] bg-[#efefef]" />
        </div>
        <div className="mt-5 h-px w-full bg-[#efefef]" />
        <div className="mt-5 h-9 w-24 animate-pulse rounded-[2px] bg-[#efefef]" />
      </div>
    </main>
  );
}
