export default function PresentationLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#f7f6f5] px-8">
      <div className="w-full max-w-4xl">
        <div className="h-16 w-48 animate-pulse rounded-[2px] bg-[#efefef]" />
        <div className="mt-8 h-20 w-full animate-pulse rounded-[2px] bg-[#efefef]" />
        <div className="mt-3 h-20 w-4/5 animate-pulse rounded-[2px] bg-[#efefef]" />
      </div>
    </div>
  );
}
