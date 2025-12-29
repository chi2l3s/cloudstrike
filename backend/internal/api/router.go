package api

import (
	"encoding/json"
	"net/http"

	"github.com/chi2l3s/cloudstrike/internal/config"
	"github.com/chi2l3s/cloudstrike/internal/docker"
	"github.com/chi2l3s/cloudstrike/internal/rcon"
)

type Server struct {
	cfg    *config.Config
	docker *docker.Client
	rcon   *rcon.Manager
	router *http.ServeMux
}

func NewServer(cfg *config.Config, dockerClient *docker.Client) *Server {
	s := &Server{
		cfg:    cfg,
		docker: dockerClient,
		rcon:   rcon.NewManager(),
		router: http.NewServeMux(),
	}
	s.setupRoutes()
	return s
}

func (s *Server) setupRoutes() {
	s.router.HandleFunc("GET /api/health", s.handleHealth)
	s.router.HandleFunc("GET /api/servers", s.handleListServers)
	s.router.HandleFunc("POST /api/servers", s.handleCreateServer)
	s.router.HandleFunc("POST /api/servers/{id}/start", s.handleStartServer)
	s.router.HandleFunc("POST /api/servers/{id}/stop", s.handleStopServer)
	s.router.HandleFunc("DELETE /api/servers/{id}", s.handleDeleteServer)

	s.router.HandleFunc("POST /api/servers/{id}/rcon/connect", s.handleRCONConnect)
	s.router.HandleFunc("POST /api/servers/{id}/rcon/command", s.handleRCONCommand)
	s.router.HandleFunc("POST /api/servers/{id}/rcon/disconnect", s.handleRCONDisconnect)
	s.router.HandleFunc("GET /api/servers/{id}/rcon/status", s.handleRCONStatus)

	// Stats
	s.router.HandleFunc("GET /api/servers/{id}/stats", s.handleServerStats)

	// Files
	s.router.HandleFunc("GET /api/servers/{id}/files", s.handleListFiles)
	s.router.HandleFunc("DELETE /api/servers/{id}/files", s.handleDeleteFile)
	s.router.HandleFunc("POST /api/servers/{id}/files/upload", s.handleUploadFile)
	s.router.HandleFunc("GET /api/servers/{id}/files/download", s.handleDownloadFile)

	// Settings
	s.router.HandleFunc("GET /api/servers/{id}/settings", s.handleGetSettings)
	s.router.HandleFunc("PUT /api/servers/{id}/settings", s.handleUpdateSettings)

	// Logs
	s.router.HandleFunc("GET /api/servers/{id}/logs", s.handleGetLogs)
}

func (s *Server) Run() error {
	return http.ListenAndServe(":"+s.cfg.Port, s.corsMiddleware(s.router))
}

func (s *Server) corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func (s *Server) json(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	err := s.docker.Ping()
	status := "healthy"
	if err != nil {
		status = "docker unavailable"
	}

	s.json(w, http.StatusOK, map[string]string{
		"status": status,
		"name":   "Cloud Strike Panel",
	})
}
