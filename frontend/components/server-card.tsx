"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Play, Square, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Server, startServer, stopServer, deleteServer } from "@/lib/api";
import Link from "next/link";

interface ServerCardProps {
  server: Server;
}

export function ServerCard({ server }: ServerCardProps) {
  const queryClient = useQueryClient();

  const startMutation = useMutation({
    mutationFn: () => startServer(server.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["servers"] }),
  });

  const stopMutation = useMutation({
    mutationFn: () => stopServer(server.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["servers"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteServer(server.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["servers"] }),
  });

  const isRunning = server.status === "running";
  const isLoading =
    startMutation.isPending ||
    stopMutation.isPending ||
    deleteMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card shadow-apple transition-all duration-200 hover:shadow-apple-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-5">
          <div className="flex items-center gap-4">
            {/* Status Indicator */}
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                isRunning ? "bg-[#30d158]/10" : "bg-muted"
              }`}
            >
              <div
                className={`h-3 w-3 rounded-full ${
                  isRunning ? "bg-[#30d158] animate-pulse" : "bg-muted-foreground"
                }`}
              />
            </div>

            {/* Server Info */}
            <div>
              <h3 className="text-base font-semibold text-foreground">
                {server.name}
              </h3>
              <div className="mt-1 flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  Port: {server.port}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    isRunning ? "status-running" : "status-stopped"
                  }`}
                >
                  {isRunning ? "Running" : "Stopped"}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Link href={`/server/${server.id}`}>
              <Button size="sm" variant="outline" className="rounded-lg">
                <ExternalLink className="mr-1.5 h-4 w-4" />
                Open
              </Button>
            </Link>

            {isRunning ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => stopMutation.mutate()}
                disabled={isLoading}
                className="rounded-lg"
              >
                <Square className="mr-1.5 h-4 w-4" />
                Stop
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => startMutation.mutate()}
                disabled={isLoading}
                className="rounded-lg"
              >
                <Play className="mr-1.5 h-4 w-4" />
                Start
              </Button>
            )}

            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => deleteMutation.mutate()}
              disabled={isLoading}
              className="rounded-lg text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
