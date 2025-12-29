"use client";

import Link from "next/link";
import { usePathname, useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Terminal,
  FolderOpen,
  Database,
  Settings,
  ChevronLeft,
  Server,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { getServers, getServerStats } from "@/lib/api";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

export default function ServerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const serverId = params.id as string;
  const [collapsed, setCollapsed] = useState(false);

  const { data: servers } = useQuery({
    queryKey: ["servers"],
    queryFn: getServers,
    refetchInterval: 3000,
  });

  const { data: stats } = useQuery({
    queryKey: ["server-stats", serverId],
    queryFn: () => getServerStats(serverId),
    refetchInterval: 5000,
  });

  const server = servers?.find((s) => s.id === serverId);

  // Server is installing if running but uptime < 5 min and no players possible yet
  const isInstalling =
    server?.status === "running" &&
    stats?.uptime !== undefined &&
    stats.uptime < 300;

  // Redirect to console if installing and not already on console page
  useEffect(() => {
    if (isInstalling && !pathname.endsWith("/console")) {
      router.push(`/server/${serverId}/console`);
    }
  }, [isInstalling, pathname, router, serverId]);

  const navigation = [
    {
      name: "Overview",
      href: `/server/${serverId}`,
      icon: LayoutDashboard,
      disabled: isInstalling,
    },
    {
      name: "Console",
      href: `/server/${serverId}/console`,
      icon: Terminal,
      disabled: false,
    },
    {
      name: "Files",
      href: `/server/${serverId}/files`,
      icon: FolderOpen,
      disabled: isInstalling,
    },
    {
      name: "Database",
      href: `/server/${serverId}/database`,
      icon: Database,
      disabled: isInstalling,
    },
    {
      name: "Settings",
      href: `/server/${serverId}/settings`,
      icon: Settings,
      disabled: isInstalling,
    },
  ];

  const isActive = (href: string) => {
    if (href === `/server/${serverId}`) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-full">
        {/* Server Sidebar */}
        <aside
          className={cn(
            "flex h-full flex-col border-r border-border bg-sidebar transition-all duration-300 ease-in-out",
            collapsed ? "w-17" : "w-64"
          )}
        >
          {/* Back to Dashboard & Collapse Button */}
          <div className="flex items-center justify-between border-b border-border p-3">
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/"
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-foreground"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="rounded-lg">
                  Back to Dashboard
                </TooltipContent>
              </Tooltip>
            ) : (
              <Link
                href="/"
                className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
                Back to Dashboard
              </Link>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCollapsed(!collapsed)}
                  className={cn(
                    "h-8 w-8 shrink-0 rounded-lg",
                    collapsed && "mx-auto"
                  )}
                >
                  {collapsed ? (
                    <PanelLeft className="h-4 w-4" />
                  ) : (
                    <PanelLeftClose className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="rounded-lg">
                {collapsed ? "Expand sidebar" : "Collapse sidebar"}
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Server Info */}
          <div className="border-b border-border p-4">
            <div
              className={cn(
                "flex items-center",
                collapsed ? "justify-center" : "gap-3"
              )}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Server className="h-5 w-5 text-primary" />
                  </div>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right" className="rounded-lg">
                    <p className="font-semibold">
                      {server?.name || "Loading..."}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {isInstalling ? "Installing..." : server?.status}
                    </p>
                  </TooltipContent>
                )}
              </Tooltip>
              {!collapsed && (
                <div className="flex-1 overflow-hidden">
                  <h2 className="truncate text-sm font-semibold text-foreground">
                    {server?.name || "Loading..."}
                  </h2>
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "h-2 w-2 rounded-full",
                        isInstalling
                          ? "animate-pulse bg-[#ff9f0a]"
                          : server?.status === "running"
                            ? "bg-[#30d158]"
                            : server?.status === "stopped"
                              ? "bg-[#ff453a]"
                              : "bg-[#ff9f0a]"
                      )}
                    />
                    <span className="text-xs capitalize text-muted-foreground">
                      {isInstalling
                        ? "Installing..."
                        : server?.status || "unknown"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-3">
            {isInstalling && !collapsed && (
              <div className="mb-4 rounded-xl bg-[#ff9f0a]/10 p-3 text-xs text-[#ff9f0a]">
                <p className="font-medium">Server is installing...</p>
                <p className="mt-1 text-[#ff9f0a]/80">
                  Please wait while CS2 downloads. This may take a few minutes.
                </p>
              </div>
            )}
            {navigation.map((item) => {
              const active = isActive(item.href);
              const NavIcon = item.icon;

              if (item.disabled) {
                if (collapsed) {
                  return (
                    <Tooltip key={item.name}>
                      <TooltipTrigger asChild>
                        <div className="flex h-10 w-10 cursor-not-allowed items-center justify-center rounded-xl opacity-40">
                          <NavIcon className="h-5 w-5" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="rounded-lg">
                        {item.name} (disabled during installation)
                      </TooltipContent>
                    </Tooltip>
                  );
                }
                return (
                  <div
                    key={item.name}
                    className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium opacity-40"
                  >
                    <NavIcon className="h-5 w-5" />
                    {item.name}
                  </div>
                );
              }

              if (collapsed) {
                return (
                  <Tooltip key={item.name}>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200",
                          active
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        )}
                      >
                        <NavIcon className="h-5 w-5" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="rounded-lg">
                      {item.name}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <NavIcon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </TooltipProvider>
  );
}
