"use client";

import { useQuery } from "@tanstack/react-query";
import { Server, Cpu, HardDrive, MemoryStick } from "lucide-react";
import { getServers, getHealth } from "@/lib/api";
import { CreateServerDialog } from "@/components/create-server-dialog";
import { ServerCard } from "@/components/server-card";

export default function Dashboard() {
  const { data: servers, isLoading } = useQuery({
    queryKey: ["servers"],
    queryFn: getServers,
    refetchInterval: 5000,
  });

  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: getHealth,
  });

  const runningServers = servers?.filter((s) => s.status === "running") || [];
  const totalServers = servers?.length || 0;

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Manage your CS2 game servers
          </p>
        </div>
        <CreateServerDialog />
      </div>

      {/* Resource Cards */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <ResourceCard
          title="Servers"
          value={totalServers.toString()}
          subtitle={`${runningServers.length} running`}
          icon={Server}
          iconColor="text-[#0a84ff]"
          iconBg="bg-[#0a84ff]/10"
        />
        <ResourceCard
          title="CPU Usage"
          value="24%"
          subtitle="4 cores available"
          icon={Cpu}
          iconColor="text-[#30d158]"
          iconBg="bg-[#30d158]/10"
        />
        <ResourceCard
          title="Memory"
          value="4.2 GB"
          subtitle="of 16 GB used"
          icon={MemoryStick}
          iconColor="text-[#bf5af2]"
          iconBg="bg-[#bf5af2]/10"
        />
        <ResourceCard
          title="Storage"
          value="128 GB"
          subtitle="of 512 GB used"
          icon={HardDrive}
          iconColor="text-[#ff9f0a]"
          iconBg="bg-[#ff9f0a]/10"
        />
      </div>

      {/* Servers Section */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Game Servers</h2>
        {health && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[#30d158]" />
            <span className="text-sm text-muted-foreground">
              Backend {health.status}
            </span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading servers...</p>
          </div>
        </div>
      ) : servers && servers.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {servers.map((server) => (
            <ServerCard key={server.id} server={server} />
          ))}
        </div>
      ) : (
        <EmptyState />
      )}
    </div>
  );
}

function ResourceCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  iconBg,
}: {
  title: string;
  value: string;
  subtitle: string;
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
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className={`rounded-xl ${iconBg} p-3`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <Server className="h-7 w-7 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold text-foreground">
        No servers yet
      </h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        Create your first CS2 server to start managing game sessions
      </p>
      <div className="mt-6">
        <CreateServerDialog />
      </div>
    </div>
  );
}
