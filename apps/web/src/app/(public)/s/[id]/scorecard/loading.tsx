export default function Loading() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 px-6 pb-20 pt-10">
      <div className="flex items-end justify-between">
        <div className="h-10 w-52 animate-pulse rounded-[2px] bg-[#efefef]" />
        <div className="h-4 w-36 animate-pulse rounded-[2px] bg-[#efefef]" />
      </div>
      <div className="box p-6">
        <div className="h-5 w-24 animate-pulse rounded-[2px] bg-[#efefef]" />
        <div className="mt-4 h-12 w-full animate-pulse rounded-[2px] bg-[#efefef]" />
        <div className="mt-2 h-12 w-full animate-pulse rounded-[2px] bg-[#efefef]" />
        <div className="mt-2 h-12 w-full animate-pulse rounded-[2px] bg-[#efefef]" />
      </div>
      <div className="box p-6">
        <div className="h-5 w-28 animate-pulse rounded-[2px] bg-[#efefef]" />
        <div className="mt-4 flex justify-between">
          <div className="h-4 w-32 animate-pulse rounded-[2px] bg-[#efefef]" />
          <div className="h-4 w-16 animate-pulse rounded-[2px] bg-[#efefef]" />
        </div>
        <div className="mt-3 flex justify-between">
          <div className="h-4 w-40 animate-pulse rounded-[2px] bg-[#efefef]" />
          <div className="h-4 w-16 animate-pulse rounded-[2px] bg-[#efefef]" />
        </div>
      </div>
    </main>
  );
}
