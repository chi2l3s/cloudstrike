"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, RotateCcw } from "lucide-react";
import { getServers, getServerSettings, updateServerSettings } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ServerSettings {
  serverName: string;
  maxPlayers: number;
  map: string;
  tickrate: number;
  rconPassword: string;
  svPassword: string;
  gameMode: string;
  gameType: string;
}

export default function ServerSettingsPage() {
  const params = useParams();
  const serverId = params.id as string;
  const queryClient = useQueryClient();

  const { data: servers } = useQuery({
    queryKey: ["servers"],
    queryFn: getServers,
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ["server-settings", serverId],
    queryFn: () => getServerSettings(serverId),
  });

  const [formData, setFormData] = useState<ServerSettings>({
    serverName: "",
    maxPlayers: 10,
    map: "de_dust2",
    tickrate: 128,
    rconPassword: "",
    svPassword: "",
    gameMode: "1",
    gameType: "0",
  });

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: (data: ServerSettings) => updateServerSettings(serverId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["server-settings", serverId] });
      setHasChanges(false);
    },
  });

  const server = servers?.find((s) => s.id === serverId);

  const handleChange = (field: keyof ServerSettings, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const handleReset = () => {
    if (settings) {
      setFormData(settings);
      setHasChanges(false);
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

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
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
            Configure {server.name}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!hasChanges}
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateMutation.isPending}
          >
            <Save className="h-4 w-4" />
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading settings...</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* General Settings */}
          <Card>
            <CardHeader>
              <CardTitle>General</CardTitle>
              <CardDescription>
                Basic server configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="serverName">Server Name</Label>
                <Input
                  id="serverName"
                  value={formData.serverName}
                  onChange={(e) => handleChange("serverName", e.target.value)}
                  placeholder="My CS2 Server"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxPlayers">Max Players</Label>
                <Input
                  id="maxPlayers"
                  type="number"
                  min={1}
                  max={64}
                  value={formData.maxPlayers}
                  onChange={(e) => handleChange("maxPlayers", parseInt(e.target.value) || 10)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="map">Default Map</Label>
                <Input
                  id="map"
                  value={formData.map}
                  onChange={(e) => handleChange("map", e.target.value)}
                  placeholder="de_dust2"
                />
              </div>
            </CardContent>
          </Card>

          {/* Performance Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Performance</CardTitle>
              <CardDescription>
                Server performance settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tickrate">Tickrate</Label>
                <Input
                  id="tickrate"
                  type="number"
                  min={64}
                  max={128}
                  value={formData.tickrate}
                  onChange={(e) => handleChange("tickrate", parseInt(e.target.value) || 128)}
                />
                <p className="text-xs text-muted-foreground">
                  Higher tickrate = better hit registration (64 or 128)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gameMode">Game Mode</Label>
                <Input
                  id="gameMode"
                  value={formData.gameMode}
                  onChange={(e) => handleChange("gameMode", e.target.value)}
                  placeholder="1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gameType">Game Type</Label>
                <Input
                  id="gameType"
                  value={formData.gameType}
                  onChange={(e) => handleChange("gameType", e.target.value)}
                  placeholder="0"
                />
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>
                Passwords and access control
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rconPassword">RCON Password</Label>
                <Input
                  id="rconPassword"
                  type="password"
                  value={formData.rconPassword}
                  onChange={(e) => handleChange("rconPassword", e.target.value)}
                  placeholder="••••••••"
                />
                <p className="text-xs text-muted-foreground">
                  Password for remote console access
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="svPassword">Server Password</Label>
                <Input
                  id="svPassword"
                  type="password"
                  value={formData.svPassword}
                  onChange={(e) => handleChange("svPassword", e.target.value)}
                  placeholder="••••••••"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty for public server
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-[#ff453a]/20">
            <CardHeader>
              <CardTitle className="text-[#ff453a]">Danger Zone</CardTitle>
              <CardDescription>
                Destructive actions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-[#ff453a]/20 bg-[#ff453a]/5 p-4">
                <h4 className="text-sm font-medium text-foreground">
                  Delete Server
                </h4>
                <p className="mt-1 text-xs text-muted-foreground">
                  This will permanently delete the server and all its data.
                  This action cannot be undone.
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this server?")) {
                      // TODO: Implement delete
                    }
                  }}
                >
                  Delete Server
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
