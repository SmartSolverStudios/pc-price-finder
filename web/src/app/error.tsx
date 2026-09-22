"use client";

import { ErrorState } from "@/components/error-state";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="space-y-4 py-10">
      <ErrorState message="Something went wrong while rendering this page." detail={error.digest ?? error.message} />
      <div className="flex justify-center">
        <Button variant="outline" size="sm" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  );
}
