export default function Loading() {
  return (
    <main className="min-h-[calc(100vh-72px)] bg-background px-6 pb-20 pt-10">
      <div className="mx-auto max-w-3xl">
        <div className="h-4 w-16 animate-pulse rounded-[2px] bg-[#efefef]" />
        <div className="mt-6 h-12 w-80 animate-pulse rounded-[2px] bg-[#efefef]" />
        <div className="mt-3 h-4 w-64 animate-pulse rounded-[2px] bg-[#efefef]" />
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <div className="box h-16 animate-pulse bg-[#f3f3f3]" />
          <div className="box h-16 animate-pulse bg-[#f3f3f3]" />
        </div>
        <div className="mt-12 h-5 w-14 animate-pulse rounded-[2px] bg-[#efefef]" />
        <div className="mt-5 space-y-3">
          <div className="box h-[72px] animate-pulse bg-[#f3f3f3]" />
          <div className="box h-[72px] animate-pulse bg-[#f3f3f3]" />
          <div className="box h-[72px] animate-pulse bg-[#f3f3f3]" />
          <div className="box h-[72px] animate-pulse bg-[#f3f3f3]" />
        </div>
      </div>
    </main>
  );
}
