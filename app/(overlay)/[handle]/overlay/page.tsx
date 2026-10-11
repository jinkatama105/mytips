import { Suspense } from "react";
import Overlay from "./overlay-client";

async function Inner({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  return <Overlay handle={decodeURIComponent(handle)} />;
}

export default function OverlayPage({
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
