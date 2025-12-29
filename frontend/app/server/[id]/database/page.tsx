"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Database, Play, Copy, Check } from "lucide-react";
import { getServers, executeQuery } from "@/lib/api";
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

export default function ServerDatabasePage() {
  const params = useParams();
  const serverId = params.id as string;
  const [query, setQuery] = useState("SELECT * FROM players LIMIT 10;");
  const [results, setResults] = useState<any[] | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: servers } = useQuery({
    queryKey: ["servers"],
    queryFn: getServers,
  });

  const server = servers?.find((s) => s.id === serverId);

  const runQuery = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await executeQuery(serverId, query);
      setColumns(result.columns || []);
      setResults(result.rows || []);
    } catch (err: any) {
      setError(err.message || "Query failed");
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const copyQuery = () => {
    navigator.clipboard.writeText(query);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exampleQueries = [
    { name: "All Players", query: "SELECT * FROM players LIMIT 10;" },
    { name: "Player Stats", query: "SELECT steamid, name, kills, deaths FROM player_stats ORDER BY kills DESC LIMIT 10;" },
    { name: "Recent Matches", query: "SELECT * FROM matches ORDER BY created_at DESC LIMIT 5;" },
    { name: "Ban List", query: "SELECT * FROM bans WHERE active = 1;" },
  ];

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
          <h1 className="text-2xl font-semibold text-foreground">Database</h1>
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
          Query database for {server.name}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Query Editor */}
        <div className="lg:col-span-3">
          <div className="rounded-2xl border border-border bg-card shadow-apple">
            {/* Editor Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">SQL Editor</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={copyQuery}>
                  {copied ? (
                    <Check className="h-4 w-4 text-[#30d158]" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button size="sm" onClick={runQuery} disabled={loading}>
                  <Play className="h-4 w-4" />
                  {loading ? "Running..." : "Run Query"}
                </Button>
              </div>
            </div>

            {/* Editor */}
            <div className="p-4">
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-32 w-full resize-none rounded-xl border border-border bg-background p-4 font-mono text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Enter your SQL query..."
              />
            </div>

            {/* Results */}
            <div className="border-t border-border">
              {error ? (
                <div className="p-4">
                  <div className="rounded-xl bg-[#ff453a]/10 p-4 text-sm text-[#ff453a]">
                    {error}
                  </div>
                </div>
              ) : results ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {columns.map((col) => (
                          <TableHead key={col}>{col}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.map((row, i) => (
                        <TableRow key={i}>
                          {columns.map((col) => (
                            <TableCell key={col}>
                              {String(row[col] ?? "NULL")}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                      {results.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={columns.length || 1}
                            className="py-8 text-center text-muted-foreground"
                          >
                            No results
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Run a query to see results
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Quick Queries */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-apple">
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              Quick Queries
            </h3>
            <div className="space-y-2">
              {exampleQueries.map((q) => (
                <button
                  key={q.name}
                  onClick={() => setQuery(q.query)}
                  className="w-full rounded-xl px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {q.name}
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-apple">
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              Database Info
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <span className="text-foreground">SQLite</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tables</span>
                <span className="text-foreground">12</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Size</span>
                <span className="text-foreground">2.4 MB</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
