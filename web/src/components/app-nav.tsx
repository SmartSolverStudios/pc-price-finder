"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { History, LayoutDashboard, Layers, ListChecks, Menu, Settings, type LucideIcon } from "lucide-react";
import { ComponentIcon } from "@/components/component-icon";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export interface NavComponent {
  key: string;
  label: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
}

const ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/build", label: "Build", icon: ListChecks },
  { href: "/components", label: "Components", icon: Layers },
  { href: "/history", label: "Price History", icon: History, disabled: true },
  { href: "/settings", label: "Settings", icon: Settings, disabled: true },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href;
}

function NavLinks({ components, onNavigate }: { components: NavComponent[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-6 text-sm">
      <ul className="flex flex-col gap-0.5">
        {ITEMS.map((item) => (
          <li key={item.href}>
            {item.disabled ? (
              <span
                aria-disabled
                className="flex cursor-not-allowed items-center gap-2.5 rounded-md px-2.5 py-1.5 text-muted-foreground/50"
              >
                <item.icon className="size-4" aria-hidden />
                {item.label}
                <span className="ml-auto rounded border border-border px-1.5 py-px text-[10px] tracking-wide uppercase">
                  Soon
                </span>
              </span>
            ) : (
              <Link
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground",
                  isActive(pathname, item.href) && "bg-sidebar-accent text-foreground",
                )}
              >
                <item.icon className="size-4" aria-hidden />
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ul>

      {components.length > 0 && (
        <div className="flex flex-col gap-1">
          <div className="px-2.5 text-[11px] font-medium tracking-wider text-muted-foreground/70 uppercase">
            Components
          </div>
          <ul className="flex flex-col gap-0.5">
            {components.map((c) => {
              const href = `/components/${c.key}`;
              return (
                <li key={c.key}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground",
                      pathname === href && "bg-sidebar-accent text-foreground",
                    )}
                  >
                    <ComponentIcon component={c.key} />
                    {c.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2 font-mono text-[13px] font-semibold tracking-tight">
      <span className="inline-block size-2 rounded-full bg-brand" aria-hidden />
      PC BUILD PRICE FINDER
    </Link>
  );
}

export function Sidebar({ components, footer }: { components: NavComponent[]; footer?: React.ReactNode }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-8 border-r border-sidebar-border bg-sidebar px-3 py-5 lg:flex">
      <div className="px-2.5">
        <Brand />
      </div>
      <div className="flex-1 overflow-y-auto">
        <NavLinks components={components} />
      </div>
      {footer && <div className="px-2.5 text-xs text-muted-foreground">{footer}</div>}
    </aside>
  );
}

export function MobileNav({ components, footer }: { components: NavComponent[]; footer?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/90 px-4 backdrop-blur lg:hidden">
      <Brand />
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Open navigation">
            <Menu />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 gap-6 bg-sidebar p-4">
          <SheetHeader className="p-0">
            <SheetTitle className="font-mono text-[13px]">PC BUILD PRICE FINDER</SheetTitle>
          </SheetHeader>
          <NavLinks components={components} onNavigate={() => setOpen(false)} />
          {footer && <div className="mt-auto text-xs text-muted-foreground">{footer}</div>}
        </SheetContent>
      </Sheet>
    </header>
  );
}
