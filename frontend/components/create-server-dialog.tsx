"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Plus, Server } from "lucide-react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { createServer } from "@/lib/api";

export function CreateServerDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [port, setPort] = useState("27015");
  const [rconPassword, setRconPassword] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createServer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servers"] });
      setOpen(false);
      setName("");
      setPort("27015");
      setRconPassword("");
    },
    onError: (error: Error & { response?: { data?: { error?: string } } }) => {
      console.error("Create server error:", error.response?.data?.error || error.message);
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate({ name, port, rconPassword });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-xl">
          <Plus className="mr-2 h-4 w-4" />
          New Server
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl border-border bg-card p-0 shadow-apple-lg sm:max-w-md">
        <DialogHeader className="border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Server className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-foreground">
                Create Server
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Set up a new CS2 game server
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-5">
            <div className="space-y-2">
              <Label
                htmlFor="name"
                className="text-sm font-medium text-foreground"
              >
                Server Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My CS2 Server"
                className="rounded-lg"
                required
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="port"
                className="text-sm font-medium text-foreground"
              >
                Port
              </Label>
              <Input
                id="port"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="27015"
                className="rounded-lg"
                required
              />
              <p className="text-xs text-muted-foreground">
                Default CS2 port is 27015
              </p>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="rconPassword"
                className="text-sm font-medium text-foreground"
              >
                RCON Password
              </Label>
              <Input
                id="rconPassword"
                type="password"
                value={rconPassword}
                onChange={(e) => setRconPassword(e.target.value)}
                placeholder="Enter RCON password"
                className="rounded-lg"
                required
              />
              <p className="text-xs text-muted-foreground">
                Password for remote console access
              </p>
            </div>
          </div>

          {mutation.isError && (
            <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {(mutation.error as Error & { response?: { data?: { error?: string } } })?.response?.data?.error ||
               mutation.error?.message ||
               "Failed to create server"}
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1 rounded-lg"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 rounded-lg"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Creating..." : "Create Server"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
