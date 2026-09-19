import { redirect } from "next/navigation";

export default async function TeamLogsRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/s/${id}`);
}
