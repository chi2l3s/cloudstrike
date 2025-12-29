"use client";

import {
  rconCommand,
  rconConnect,
  rconDisconnect,
  rconStatus,
  getServerSettings,
} from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Send, Terminal, Unplug, Loader2, Plug } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

interface ConsoleEntry {
  type: "command" | "response" | "error" | "system";
  text: string;
  timestamp: Date;
}

interface ServerConsoleProps {
  serverId: string;
  serverName?: string;
  serverPort?: string;
  fullHeight?: boolean;
}

export function ServerConsole({
  serverId,
  serverName = "Server",
  serverPort = "27015",
  fullHeight = false,
}: ServerConsoleProps) {
  const [command, setCommand] = useState("");
  const [history, setHistory] = useState<ConsoleEntry[]>([]);
  const [autoConnectAttempted, setAutoConnectAttempted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Get server settings for RCON password
  const { data: settings } = useQuery({
    queryKey: ["server-settings", serverId],
    queryFn: () => getServerSettings(serverId),
  });

  const { data: isConnected, isLoading: checkingConnection } = useQuery({
    queryKey: ["rcon-status", serverId],
    queryFn: () => rconStatus(serverId),
    refetchInterval: 5000,
  });

  const connectMutation = useMutation({
    mutationFn: (password: string) =>
      rconConnect(serverId, `localhost:${serverPort}`, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rcon-status", serverId] });
      addEntry("system", "Connected to RCON successfully");
    },
    onError: (err: Error) => {
      addEntry("error", `Connection failed: ${err.message}`);
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: () => rconDisconnect(serverId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rcon-status", serverId] });
      addEntry("system", "Disconnected from RCON");
    },
  });

  // Auto-connect when settings are loaded and not connected
  useEffect(() => {
    if (
      settings?.rconPassword &&
      isConnected === false &&
      !autoConnectAttempted &&
      !connectMutation.isPending
    ) {
      setAutoConnectAttempted(true);
      addEntry("system", "Auto-connecting to RCON...");
      connectMutation.mutate(settings.rconPassword);
    }
  }, [settings, isConnected, autoConnectAttempted, connectMutation]);

  const commandMutation = useMutation({
    mutationFn: (cmd: string) => rconCommand(serverId, cmd),
    onSuccess: (response, cmd) => {
      addEntry("command", `> ${cmd}`);
      if (response) {
        addEntry("response", response);
      }
    },
    onError: (err: Error, cmd) => {
      addEntry("command", `> ${cmd}`);
      addEntry("error", err.message);
    },
  });

  const addEntry = (type: ConsoleEntry["type"], text: string) => {
    setHistory((prev) => [...prev, { type, text, timestamp: new Date() }]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;
    commandMutation.mutate(command);
    setCommand("");
  };

  const handleManualConnect = () => {
    if (settings?.rconPassword) {
      connectMutation.mutate(settings.rconPassword);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  return (
    <div className={`flex flex-col overflow-hidden ${fullHeight ? "h-full" : "h-[500px] rounded-2xl border border-border shadow-apple"} bg-card`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#30d158]/10">
            <Terminal className="h-4 w-4 text-[#30d158]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {serverName}
            </h3>
            <p className="text-xs text-muted-foreground">RCON Console</p>
          </div>
        </div>
        <div
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
            isConnected ? "status-running" : "status-stopped"
          }`}
        >
          {isConnected ? "Connected" : "Disconnected"}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
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
                  ? "Auto-connecting to RCON"
                  : "RCON Password Required"}
              </h4>
              <p className="mt-1 text-sm text-muted-foreground">
                {settings?.rconPassword
                  ? "Using saved password from server settings"
                  : "Set RCON password in server settings first"}
              </p>
            </div>
            {!settings?.rconPassword && (
              <Button
                variant="outline"
                onClick={() => window.location.href = `/server/${serverId}/settings`}
                className="rounded-lg"
              >
                Go to Settings
              </Button>
            )}
            {settings?.rconPassword && !connectMutation.isPending && (
              <Button
                onClick={handleManualConnect}
                className="rounded-lg"
              >
                Retry Connection
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Console Output */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-auto bg-[#0d0d0d] p-4 font-mono text-sm"
            >
              {history.length === 0 ? (
                <p className="text-[#48484a]">
                  Type a command below to get started...
                </p>
              ) : (
                history.map((entry, i) => (
                  <div
                    key={i}
                    className={`mb-1 ${
                      entry.type === "command"
                        ? "text-[#ffd60a]"
                        : entry.type === "error"
                        ? "text-[#ff453a]"
                        : entry.type === "system"
                        ? "text-[#0a84ff]"
                        : "text-[#30d158]"
                    }`}
                  >
                    {entry.text}
                  </div>
                ))
              )}
            </div>

            {/* Input Bar */}
            <div className="border-t border-border bg-muted/30 p-3">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  placeholder="Enter command (e.g., status, changelevel de_dust2)"
                  className="flex-1 rounded-lg border-border bg-background font-mono text-sm"
                  disabled={commandMutation.isPending}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={commandMutation.isPending}
                  className="rounded-lg"
                >
                  <Send className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() => disconnectMutation.mutate()}
                  className="rounded-lg"
                >
                  <Unplug className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
