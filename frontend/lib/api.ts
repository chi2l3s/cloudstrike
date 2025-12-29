import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api",
});

export interface Server {
  id: string;
  name: string;
  port: string;
  status: string;
  ip?: string;
  createdAt?: string;
}

export interface CreateServerRequest {
  name: string;
  port: string;
  rconPassword: string;
}

export interface ServerStats {
  cpu: number;
  memory: number;
  memoryLimit: number;
  storage: number;
  uptime: number;
  players: number;
  maxPlayers: number;
  map: string;
}

export interface FileItem {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  modTime: string;
}

export interface ServerSettings {
  serverName: string;
  maxPlayers: number;
  map: string;
  tickrate: number;
  rconPassword: string;
  svPassword: string;
  gameMode: string;
  gameType: string;
}

export const getServers = async (): Promise<Server[]> => {
  const { data } = await api.get("/servers");
  return data;
};

export const createServer = async (
  req: CreateServerRequest
): Promise<Server> => {
  const { data } = await api.post("/servers", req);
  return data;
};

export const startServer = async (id: string): Promise<void> => {
  await api.post(`/servers/${id}/start`);
};

export const stopServer = async (id: string): Promise<void> => {
  await api.post(`/servers/${id}/stop`);
};

export const deleteServer = async (id: string): Promise<void> => {
  await api.delete(`/servers/${id}`);
};

export const getHealth = async () => {
  const { data } = await api.get("/health");
  return data;
};

export const rconConnect = async (
  id: string,
  address: string,
  password: string
): Promise<void> => {
  await api.post(`/servers/${id}/rcon/connect`, { address, password });
};

export const rconCommand = async (
  id: string,
  command: string
): Promise<string> => {
  const { data } = await api.post(`/servers/${id}/rcon/command`, { command });
  return data.response;
};

export const rconDisconnect = async (id: string): Promise<void> => {
  await api.post(`/servers/${id}/rcon/disconnect`);
};

export const rconStatus = async (id: string): Promise<boolean> => {
  const { data } = await api.get(`/servers/${id}/rcon/status`);
  return data.connected;
};

// Server Stats
export const getServerStats = async (id: string): Promise<ServerStats> => {
  const { data } = await api.get(`/servers/${id}/stats`);
  return data;
};

// File Management
export const getServerFiles = async (
  id: string,
  path: string = "/"
): Promise<FileItem[]> => {
  const { data } = await api.get(`/servers/${id}/files`, {
    params: { path },
  });
  return data;
};

export const deleteServerFile = async (
  id: string,
  path: string
): Promise<void> => {
  await api.delete(`/servers/${id}/files`, {
    params: { path },
  });
};

export const uploadServerFile = async (
  id: string,
  path: string,
  file: File
): Promise<void> => {
  const formData = new FormData();
  formData.append("file", file);
  await api.post(`/servers/${id}/files/upload`, formData, {
    params: { path },
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

// Server Settings
export const getServerSettings = async (
  id: string
): Promise<ServerSettings> => {
  const { data } = await api.get(`/servers/${id}/settings`);
  return data;
};

export const updateServerSettings = async (
  id: string,
  settings: ServerSettings
): Promise<ServerSettings> => {
  const { data } = await api.put(`/servers/${id}/settings`, settings);
  return data;
};

// Database (placeholder for SQLite queries)
export const executeQuery = async (
  id: string,
  query: string
): Promise<{ columns: string[]; rows: Record<string, unknown>[] }> => {
  // This would need a backend endpoint for actual database queries
  // For now, return empty result
  return { columns: [], rows: [] };
};

// Docker Logs
export const getServerLogs = async (
  id: string,
  tail: number = 100
): Promise<string> => {
  const { data } = await api.get(`/servers/${id}/logs`, {
    params: { tail: tail.toString() },
  });
  return data.logs;
};
