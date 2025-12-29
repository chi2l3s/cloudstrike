"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard, Server, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { getServers, getHealth } from "@/lib/api";

export function Sidebar() {
  const pathname = usePathname();

  const { data: servers } = useQuery({
    queryKey: ["servers"],
    queryFn: getServers,
    refetchInterval: 5000,
  });

  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: getHealth,
  });

  const runningServers = servers?.filter((s) => s.status === "running") || [];

  // Hide sidebar on server pages (they have their own sidebar)
  if (pathname.startsWith("/server/")) {
    return null;
  }

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-border px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
          <Server className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-foreground">
            Cloud Strike
          </h1>
          <p className="text-xs text-muted-foreground">CS2 Panel</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3">
        <Link
          href="/"
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
            pathname === "/"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          <LayoutDashboard className="h-5 w-5" />
          Dashboard
        </Link>

        {/* Servers List */}
        {servers && servers.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 px-3 text-xs font-medium uppercase text-muted-foreground">
              Servers
            </p>
            <div className="space-y-1">
              {servers.map((server) => (
                <Link
                  key={server.id}
                  href={`/server/${server.id}`}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-foreground"
                >
                  <div
                    className={cn(
                      "h-2 w-2 rounded-full",
                      server.status === "running"
                        ? "bg-[#30d158]"
                        : "bg-[#ff453a]"
                    )}
                  />
                  <span className="flex-1 truncate">{server.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Status Footer */}
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3 rounded-xl bg-accent/50 p-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#30d158]/10">
            <Activity className="h-4 w-4 text-[#30d158]" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium text-foreground">
              {health?.status === "healthy" ? "Online" : "Offline"}
            </p>
            <p className="text-xs text-muted-foreground">
              {runningServers.length} server{runningServers.length !== 1 ? "s" : ""} running
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
