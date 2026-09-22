import { ExternalLink as ExternalLinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ExternalLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className={cn("inline-flex items-center gap-1 underline-offset-4 hover:text-foreground hover:underline", className)}
    >
      {children}
      <ExternalLinkIcon className="size-3 shrink-0 opacity-60" aria-hidden />
    </a>
  );
}

export function ExternalLinkButton({
  href,
  children,
  variant = "outline",
  size = "sm",
  className,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "outline" | "default" | "secondary" | "ghost";
  size?: "sm" | "default" | "xs";
  className?: string;
}) {
  return (
    <Button asChild variant={variant} size={size} className={className}>
      <a href={href} target="_blank" rel="noopener noreferrer nofollow">
        {children}
        <ExternalLinkIcon data-icon="inline-end" aria-hidden />
      </a>
    </Button>
  );
}
