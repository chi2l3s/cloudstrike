"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getServers,
  getServerLogs,
  getServerSettings,
  rconConnect,
  rconCommand,
  rconDisconnect,
  rconStatus,
} from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useRef, useState } from "react";
import {
  Terminal,
  Send,
  RefreshCw,
  Unplug,
  Plug,
  Loader2,
  ScrollText,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RconEntry {
  type: "command" | "response" | "error" | "system";
  text: string;
  timestamp: Date;
}

export default function ServerConsolePage() {
  const params = useParams();
  const serverId = params.id as string;
  const queryClient = useQueryClient();

  // Docker logs state
  const logsRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // RCON state
  const [rconCommand_, setRconCommand] = useState("");
  const [rconHistory, setRconHistory] = useState<RconEntry[]>([]);
  const [autoConnectAttempted, setAutoConnectAttempted] = useState(false);
  const rconRef = useRef<HTMLDivElement>(null);

  const { data: servers } = useQuery({
    queryKey: ["servers"],
    queryFn: getServers,
  });

  const server = servers?.find((s) => s.id === serverId);

  // Docker logs
  const { data: logs, refetch: refetchLogs } = useQuery({
    queryKey: ["server-logs", serverId],
    queryFn: () => getServerLogs(serverId, 200),
    refetchInterval: 3000,
    enabled: !!server,
  });

  // Server settings for RCON password
  const { data: settings } = useQuery({
    queryKey: ["server-settings", serverId],
    queryFn: () => getServerSettings(serverId),
    enabled: !!server,
  });

  // RCON connection status
  const { data: isConnected, isLoading: checkingConnection } = useQuery({
    queryKey: ["rcon-status", serverId],
    queryFn: () => rconStatus(serverId),
    refetchInterval: 5000,
    enabled: !!server,
  });

  // RCON mutations
  const connectMutation = useMutation({
    mutationFn: (password: string) =>
      rconConnect(serverId, `localhost:${server?.port || "27015"}`, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rcon-status", serverId] });
      addRconEntry("system", "Connected to RCON successfully");
    },
    onError: (err: Error) => {
      addRconEntry("error", `Connection failed: ${err.message}`);
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: () => rconDisconnect(serverId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rcon-status", serverId] });
      addRconEntry("system", "Disconnected from RCON");
    },
  });

  const commandMutation = useMutation({
    mutationFn: (cmd: string) => rconCommand(serverId, cmd),
    onSuccess: (response, cmd) => {
      addRconEntry("command", `> ${cmd}`);
      if (response) {
        addRconEntry("response", response);
      }
    },
    onError: (err: Error, cmd) => {
      addRconEntry("command", `> ${cmd}`);
      addRconEntry("error", err.message);
    },
  });

  // Auto-connect RCON
  useEffect(() => {
    if (
      settings?.rconPassword &&
      isConnected === false &&
      !autoConnectAttempted &&
      !connectMutation.isPending
    ) {
      setAutoConnectAttempted(true);
      addRconEntry("system", "Auto-connecting to RCON...");
      connectMutation.mutate(settings.rconPassword);
    }
  }, [settings, isConnected, autoConnectAttempted, connectMutation]);

  // Auto-scroll logs
  useEffect(() => {
    if (autoScroll && logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Auto-scroll RCON
  useEffect(() => {
    if (rconRef.current) {
      rconRef.current.scrollTop = rconRef.current.scrollHeight;
    }
  }, [rconHistory]);

  const addRconEntry = (type: RconEntry["type"], text: string) => {
    setRconHistory((prev) => [...prev, { type, text, timestamp: new Date() }]);
  };

  const handleRconSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rconCommand_.trim()) return;
    commandMutation.mutate(rconCommand_);
    setRconCommand("");
  };

  const handleManualConnect = () => {
    if (settings?.rconPassword) {
      connectMutation.mutate(settings.rconPassword);
    }
  };

  const handleScroll = () => {
    if (logsRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = logsRef.current;
      setAutoScroll(scrollHeight - scrollTop - clientHeight < 50);
    }
  };

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

  const logLines = logs?.split("\n").filter((line) => line.trim()) || [];

  return (
    <div className="flex h-full flex-col gap-6 bg-background p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-foreground">Console</h1>
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
            Docker logs and RCON console for {server.name}
          </p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid flex-1 grid-cols-1 gap-6 overflow-hidden lg:grid-cols-2">
        {/* Docker Logs Panel */}
        <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-apple">
          {/* Logs Header */}
          <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                <ScrollText className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Docker Logs
                </h3>
                <p className="text-xs text-muted-foreground">
                  Container output stream
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetchLogs()}
              className="h-8 w-8 rounded-lg"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Logs Content */}
          <div
            ref={logsRef}
            onScroll={handleScroll}
            className="flex-1 overflow-auto bg-[#0d0d0d] p-4 font-mono text-xs leading-relaxed"
          >
            {logLines.length === 0 ? (
              <p className="text-[#48484a]">Waiting for logs...</p>
            ) : (
              logLines.map((line, i) => {
                // Parse timestamp if present (format: 2024-01-01T12:00:00.000000000Z)
                const timestampMatch = line.match(
                  /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/
                );
                const timestamp = timestampMatch ? timestampMatch[1] : null;
                const content = timestamp
                  ? line.substring(line.indexOf(" ") + 1)
                  : line;

                // Color based on content
                const isError =
                  content.toLowerCase().includes("error") ||
                  content.toLowerCase().includes("fail");
                const isWarning =
                  content.toLowerCase().includes("warn") ||
                  content.toLowerCase().includes("warning");
                const isSuccess =
                  content.toLowerCase().includes("success") ||
                  content.toLowerCase().includes("started") ||
                  content.toLowerCase().includes("ready");

                return (
                  <div key={i} className="flex gap-2">
                    {timestamp && (
                      <span className="shrink-0 text-[#48484a]">
                        {timestamp.substring(11, 19)}
                      </span>
                    )}
                    <span
                      className={cn(
                        "break-all",
                        isError && "text-[#ff453a]",
                        isWarning && "text-[#ffd60a]",
                        isSuccess && "text-[#30d158]",
                        !isError && !isWarning && !isSuccess && "text-[#98989d]"
                      )}
                    >
                      {content}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Auto-scroll indicator */}
          <div className="border-t border-border bg-muted/30 px-4 py-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{logLines.length} lines</span>
              <span
                className={cn(
                  "flex items-center gap-1",
                  autoScroll && "text-[#30d158]"
                )}
              >
                {autoScroll ? "Auto-scrolling" : "Scroll paused"}
              </span>
            </div>
          </div>
        </div>

        {/* RCON Console Panel */}
        <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-apple">
          {/* RCON Header */}
          <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#30d158]/10">
                <Terminal className="h-4 w-4 text-[#30d158]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  RCON Console
                </h3>
                <p className="text-xs text-muted-foreground">
                  Remote server commands
                </p>
              </div>
            </div>
            <div
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                isConnected ? "status-running" : "status-stopped"
              )}
            >
              {isConnected ? "Connected" : "Disconnected"}
            </div>
          </div>

          {/* RCON Content */}
          {!isConnected ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                {connectMutation.isPending || checkingConnection ? (
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                ) : (
                  <Plug className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="text-center">
                <h4 className="text-base font-semibold text-foreground">
                  {connectMutation.isPending
                    ? "Connecting..."
                    : settings?.rconPassword
                      ? "RCON Disconnected"
                      : "RCON Password Required"}
                </h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  {settings?.rconPassword
                    ? "Click to connect to the server"
                    : "Set RCON password in server settings"}
                </p>
              </div>
              {settings?.rconPassword && !connectMutation.isPending && (
                <Button onClick={handleManualConnect} className="rounded-xl">
                  <Plug className="mr-2 h-4 w-4" />
                  Connect to RCON
                </Button>
              )}
              {!settings?.rconPassword && (
                <Button
                  variant="outline"
                  onClick={() =>
                    (window.location.href = `/server/${serverId}/settings`)
                  }
                  className="rounded-xl"
                >
                  Go to Settings
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* RCON Output */}
              <div
                ref={rconRef}
                className="flex-1 overflow-auto bg-[#0d0d0d] p-4 font-mono text-sm"
              >
                {rconHistory.length === 0 ? (
                  <p className="text-[#48484a]">
                    Type a command below to get started...
                  </p>
                ) : (
                  rconHistory.map((entry, i) => (
                    <div
                      key={i}
                      className={cn(
                        "mb-1",
                        entry.type === "command" && "text-[#ffd60a]",
                        entry.type === "error" && "text-[#ff453a]",
                        entry.type === "system" && "text-[#0a84ff]",
                        entry.type === "response" && "text-[#30d158]"
                      )}
                    >
                      {entry.text}
                    </div>
                  ))
                )}
              </div>

              {/* RCON Input */}
              <div className="border-t border-border bg-muted/30 p-3">
                <form onSubmit={handleRconSubmit} className="flex gap-2">
                  <Input
                    value={rconCommand_}
                    onChange={(e) => setRconCommand(e.target.value)}
                    placeholder="Enter command (e.g., status, changelevel de_dust2)"
                    className="flex-1 rounded-xl border-border bg-background font-mono text-sm"
                    disabled={commandMutation.isPending}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={commandMutation.isPending}
                    className="rounded-xl"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => disconnectMutation.mutate()}
                    className="rounded-xl"
                  >
                    <Unplug className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
