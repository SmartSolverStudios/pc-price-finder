import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-20 text-center">
      <div className="font-mono text-xs text-muted-foreground">404</div>
      <h1 className="text-lg font-medium">This component is not part of the current build.</h1>
      <p className="text-sm text-muted-foreground">The scraper output has no data for this page.</p>
      <Button asChild variant="outline" size="sm">
        <Link href="/">Back to dashboard</Link>
      </Button>
    </div>
  );
}
