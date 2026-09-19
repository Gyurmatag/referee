import { TakeoverView } from "./takeover-view";

export default async function TakeoverPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="shell pb-20 pt-10">
      <TakeoverView id={id} />
    </main>
  );
}
