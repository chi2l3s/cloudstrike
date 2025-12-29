"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Cpu, HardDrive, MemoryStick, Clock, Globe, Users } from "lucide-react";
import { getServers, getServerStats } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ServerConsole } from "@/components/server-console";

export default function ServerOverviewPage() {
  const params = useParams();
  const serverId = params.id as string;

  const { data: servers } = useQuery({
    queryKey: ["servers"],
    queryFn: getServers,
  });

  const { data: stats } = useQuery({
    queryKey: ["server-stats", serverId],
    queryFn: () => getServerStats(serverId),
    refetchInterval: 5000,
  });

  const server = servers?.find((s) => s.id === serverId);

  if (!server) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading server...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-foreground">
            {server.name}
          </h1>
          <Badge
            variant={
              server.status === "running"
                ? "success"
                : server.status === "stopped"
                ? "destructive"
                : "warning"
            }
          >
            {server.status}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Server overview and resource monitoring
        </p>
      </div>

      {/* Resource Stats */}
      <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="CPU Usage"
          value={stats?.cpu ? `${stats.cpu.toFixed(1)}%` : "—"}
          icon={Cpu}
          iconColor="text-[#30d158]"
          iconBg="bg-[#30d158]/10"
        />
        <StatCard
          title="Memory"
          value={stats?.memory ? formatBytes(stats.memory) : "—"}
          subtitle={stats?.memoryLimit ? `of ${formatBytes(stats.memoryLimit)}` : undefined}
          icon={MemoryStick}
          iconColor="text-[#bf5af2]"
          iconBg="bg-[#bf5af2]/10"
        />
        <StatCard
          title="Storage"
          value={stats?.storage ? formatBytes(stats.storage) : "—"}
          icon={HardDrive}
          iconColor="text-[#ff9f0a]"
          iconBg="bg-[#ff9f0a]/10"
        />
        <StatCard
          title="Uptime"
          value={stats?.uptime ? formatUptime(stats.uptime) : "—"}
          icon={Clock}
          iconColor="text-[#0a84ff]"
          iconBg="bg-[#0a84ff]/10"
        />
      </div>

      {/* Server Info & Console */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Server Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Server Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoRow
              icon={Globe}
              label="IP Address"
              value={`${server.ip || "localhost"}:${server.port}`}
            />
            <InfoRow
              icon={Users}
              label="Players"
              value={stats?.players ? `${stats.players}/${stats.maxPlayers}` : "0/0"}
            />
            <InfoRow
              icon={Globe}
              label="Map"
              value={stats?.map || "Unknown"}
            />
            <InfoRow
              icon={Clock}
              label="Created"
              value={server.createdAt ? new Date(server.createdAt).toLocaleDateString() : "—"}
            />
          </CardContent>
        </Card>

        {/* Console Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Console</CardTitle>
          </CardHeader>
          <CardContent>
            <ServerConsole serverId={serverId} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  iconBg,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  iconBg: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-apple transition-all duration-200 hover:shadow-apple-lg">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
          {subtitle && (
            <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className={`rounded-xl ${iconBg} p-3`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
