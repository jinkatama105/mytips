import { Suspense } from "react";
import TipClient from "./tip-client";

async function Inner({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  return <TipClient handle={decodeURIComponent(handle)} />;
}

export default function TipPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <Inner params={params} />
    </Suspense>
  );
}
