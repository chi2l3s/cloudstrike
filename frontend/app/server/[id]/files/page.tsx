"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FolderOpen,
  File,
  ChevronRight,
  Upload,
  Download,
  Trash2,
  RefreshCw,
  Home,
} from "lucide-react";
import { getServers, getServerFiles, deleteServerFile, uploadServerFile } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface FileItem {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  modTime: string;
}

const BASE_PATH = "/home/steam/cs2-dedicated";

export default function ServerFilesPage() {
  const params = useParams();
  const serverId = params.id as string;
  const queryClient = useQueryClient();
  const [currentPath, setCurrentPath] = useState(BASE_PATH);
  const [uploadOpen, setUploadOpen] = useState(false);

  const { data: servers } = useQuery({
    queryKey: ["servers"],
    queryFn: getServers,
  });

  const { data: files, isLoading, refetch } = useQuery({
    queryKey: ["server-files", serverId, currentPath],
    queryFn: () => getServerFiles(serverId, currentPath),
    refetchInterval: 10000,
  });

  const deleteMutation = useMutation({
    mutationFn: (path: string) => deleteServerFile(serverId, path),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["server-files", serverId] });
    },
  });

  const server = servers?.find((s) => s.id === serverId);

  const navigateToFolder = (path: string) => {
    setCurrentPath(path);
  };

  const navigateUp = () => {
    if (currentPath === BASE_PATH) return;
    const parts = currentPath.split("/").filter(Boolean);
    parts.pop();
    const newPath = "/" + parts.join("/");
    // Don't go above BASE_PATH
    if (newPath.length < BASE_PATH.length) {
      setCurrentPath(BASE_PATH);
    } else {
      setCurrentPath(newPath);
    }
  };

  // Get relative path parts for breadcrumb (relative to BASE_PATH)
  const getRelativePath = () => {
    if (currentPath === BASE_PATH) return [];
    const relativePath = currentPath.replace(BASE_PATH, "");
    return relativePath.split("/").filter(Boolean);
  };

  const relativeParts = getRelativePath();

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
            File Manager
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
          Manage files for {server.name}
        </p>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex items-center justify-between">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm">
          <button
            onClick={() => setCurrentPath(BASE_PATH)}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Home className="h-4 w-4" />
            <span>cs2-dedicated</span>
          </button>
          {relativeParts.map((part: string, index: number) => (
            <div key={index} className="flex items-center">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <button
                onClick={() =>
                  navigateToFolder(BASE_PATH + "/" + relativeParts.slice(0, index + 1).join("/"))
                }
                className="rounded-lg px-2 py-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {part}
              </button>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Upload className="h-4 w-4" />
                Upload
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload File</DialogTitle>
                <DialogDescription>
                  Upload a file to {currentPath}
                </DialogDescription>
              </DialogHeader>
              <FileUploader
                serverId={serverId}
                path={currentPath}
                onSuccess={() => {
                  setUploadOpen(false);
                  refetch();
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* File List */}
      <div className="rounded-2xl border border-border bg-card shadow-apple">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Loading files...</p>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50%]">Name</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Modified</TableHead>
                <TableHead className="w-25">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentPath !== BASE_PATH && (
                <TableRow
                  className="cursor-pointer"
                  onClick={navigateUp}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <FolderOpen className="h-5 w-5 text-[#ff9f0a]" />
                      <span className="font-medium">..</span>
                    </div>
                  </TableCell>
                  <TableCell>—</TableCell>
                  <TableCell>—</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              )}
              {files?.map((file: FileItem) => (
                <TableRow
                  key={file.path}
                  className={file.isDir ? "cursor-pointer" : ""}
                  onClick={() => file.isDir && navigateToFolder(file.path)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {file.isDir ? (
                        <FolderOpen className="h-5 w-5 text-[#ff9f0a]" />
                      ) : (
                        <File className="h-5 w-5 text-[#0a84ff]" />
                      )}
                      <span className="font-medium">{file.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {file.isDir ? "—" : formatBytes(file.size)}
                  </TableCell>
                  <TableCell>
                    {new Date(file.modTime).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {!file.isDir && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(
                              `/api/servers/${serverId}/files/download?path=${encodeURIComponent(
                                file.path
                              )}`,
                              "_blank"
                            );
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-[#ff453a] hover:text-[#ff453a]"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete ${file.name}?`)) {
                            deleteMutation.mutate(file.path);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!files || files.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center">
                    <FolderOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                      No files found
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

function FileUploader({
  serverId,
  path,
  onSuccess,
}: {
  serverId: string;
  path: string;
  onSuccess: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      await uploadServerFile(serverId, path, file);
      onSuccess();
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border-2 border-dashed border-border p-8 text-center">
        <input
          type="file"
          id="file-upload"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <label
          htmlFor="file-upload"
          className="cursor-pointer text-sm text-muted-foreground"
        >
          {file ? (
            <span className="font-medium text-foreground">{file.name}</span>
          ) : (
            <>
              <Upload className="mx-auto mb-2 h-8 w-8" />
              Click to select a file
            </>
          )}
        </label>
      </div>
      <Button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="w-full"
      >
        {uploading ? "Uploading..." : "Upload"}
      </Button>
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
