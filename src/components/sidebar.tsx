"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CreditCard,
  RefreshCw,
} from "lucide-react";

const navigation = [
  { name: "Revenue", href: "/", icon: LayoutDashboard },
  { name: "Stripe Data", href: "/stripe", icon: CreditCard },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-56 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-5">
        <h1 className="text-lg font-bold text-primary">Revenue Tracker</h1>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-3">
        <div className="text-xs text-muted-foreground text-center">
          Data synced from Stripe
        </div>
      </div>
    </div>
  );
}
