export default function Loading() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-5 px-6 pb-20 pt-10">
      <div className="flex items-end justify-between">
        <div className="h-10 w-60 animate-pulse rounded-[2px] bg-[#efefef]" />
        <div className="h-4 w-14 animate-pulse rounded-[2px] bg-[#efefef]" />
      </div>
      <div className="h-4 w-96 animate-pulse rounded-[2px] bg-[#efefef]" />
      <div className="box h-40 p-5">
        <div className="h-4 w-32 animate-pulse rounded-[2px] bg-[#efefef]" />
        <div className="mt-4 h-2 w-full animate-pulse rounded-[2px] bg-[#efefef]" />
        <div className="mt-6 h-3 w-full animate-pulse rounded-[2px] bg-[#efefef]" />
        <div className="mt-2 h-3 w-5/6 animate-pulse rounded-[2px] bg-[#efefef]" />
      </div>
      <div className="box h-40 p-5">
        <div className="h-4 w-24 animate-pulse rounded-[2px] bg-[#efefef]" />
        <div className="mt-4 h-2 w-3/4 animate-pulse rounded-[2px] bg-[#efefef]" />
        <div className="mt-6 h-3 w-full animate-pulse rounded-[2px] bg-[#efefef]" />
      </div>
    </main>
  );
}
