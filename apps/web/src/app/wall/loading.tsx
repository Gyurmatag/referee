export default function Loading() {
  return (
    <main className="min-h-[calc(100vh-72px)] bg-background px-6 pb-16 pt-8">
      <div className="mx-auto mb-10 max-w-6xl">
        <div className="h-10 w-72 animate-pulse rounded-[2px] bg-[#efefef]" />
        <div className="mt-3 h-4 w-40 animate-pulse rounded-[2px] bg-[#efefef]" />
      </div>
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-3">
        <section className="flex flex-col gap-3">
          <div className="h-5 w-28 animate-pulse rounded-[2px] bg-[#efefef]" />
          <div className="h-16 w-full animate-pulse rounded-[2px] bg-[#efefef]" />
          <div className="h-16 w-5/6 animate-pulse rounded-[2px] bg-[#efefef]" />
        </section>
        <section className="flex flex-col gap-3">
          <div className="h-5 w-20 animate-pulse rounded-[2px] bg-[#efefef]" />
          <div className="h-24 w-full animate-pulse rounded-[2px] bg-[#efefef]" />
          <div className="h-24 w-full animate-pulse rounded-[2px] bg-[#efefef]" />
          <div className="h-24 w-full animate-pulse rounded-[2px] bg-[#efefef]" />
        </section>
        <section className="flex flex-col gap-2">
          <div className="h-5 w-24 animate-pulse rounded-[2px] bg-[#efefef]" />
          <div className="h-3 w-full animate-pulse rounded-[2px] bg-[#efefef]" />
          <div className="h-3 w-11/12 animate-pulse rounded-[2px] bg-[#efefef]" />
          <div className="h-3 w-4/5 animate-pulse rounded-[2px] bg-[#efefef]" />
          <div className="h-3 w-3/4 animate-pulse rounded-[2px] bg-[#efefef]" />
        </section>
      </div>
    </main>
  );
}
