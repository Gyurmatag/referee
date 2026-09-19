export default function Loading() {
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-6 pb-20 pt-10">
      <div className="h-10 w-28 animate-pulse rounded-[2px] bg-[#efefef]" />
      <div className="h-4 w-96 animate-pulse rounded-[2px] bg-[#efefef]" />
      <div className="box p-6">
        <div className="h-5 w-36 animate-pulse rounded-[2px] bg-[#efefef]" />
        <div className="mt-5 h-3 w-full animate-pulse rounded-[2px] bg-[#efefef]" />
        <div className="mt-4 h-3 w-full animate-pulse rounded-[2px] bg-[#efefef]" />
        <div className="mt-4 h-3 w-full animate-pulse rounded-[2px] bg-[#efefef]" />
      </div>
      <div className="box h-48 p-6">
        <div className="h-5 w-32 animate-pulse rounded-[2px] bg-[#efefef]" />
        <div className="mt-6 h-4 w-full animate-pulse rounded-[2px] bg-[#efefef]" />
        <div className="mt-3 h-4 w-2/3 animate-pulse rounded-[2px] bg-[#efefef]" />
      </div>
    </main>
  );
}
