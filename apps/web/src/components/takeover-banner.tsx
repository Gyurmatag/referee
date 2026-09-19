import Link from "next/link";
import { Button } from "@/components/ui/button";

export function TakeoverBanner({
  id,
  visible,
}: {
  id: string;
  visible: boolean;
}) {
  if (!visible) return null;
  return (
    <div className="box mt-6 px-4 py-4">
      <p className="text-[15px] font-medium">Take over the isolated browser</p>
      <p className="mt-1 text-[13px] text-muted-foreground">
        The judge hit a login wall. Sign in there - including Google or GitHub - then continue
        judging.
      </p>
      <Button asChild className="mt-3">
        <Link href={`/s/${id}/takeover`}>Take over login</Link>
      </Button>
    </div>
  );
}
