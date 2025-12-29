package api

import (
	"encoding/json"
	"net/http"
	"strings"
)

type CreateServerRequest struct {
	Name         string `json:"name"`
	Port         string `json:"port"`
	RconPassword string `json:"rconPassword"`
}

type ServerResponse struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Port   string `json:"port"`
	Status string `json:"status"`
}

func (s *Server) handleListServers(w http.ResponseWriter, r *http.Request) {
	containers, err := s.docker.ListContainers()
	if err != nil {
		s.json(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	servers := []ServerResponse{}
	for _, c := range containers {
		if c.Labels["cloudstrike"] == "true" {
			servers = append(servers, ServerResponse{
				ID:     c.ID[:12],
				Name:   c.Labels["cloudstrike.name"],
				Port:   c.Labels["cloudstrike.port"],
				Status: c.State,
			})
		}
	}

	s.json(w, http.StatusOK, servers)
}

func (s *Server) handleCreateServer(w http.ResponseWriter, r *http.Request) {
	var req CreateServerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.json(w, http.StatusBadRequest, map[string]string{"error": "invalid request"})
		return
	}

	if req.Name == "" || req.Port == "" {
		s.json(w, http.StatusBadRequest, map[string]string{"error": "name and port required"})
		return
	}

	if req.RconPassword == "" {
		s.json(w, http.StatusBadRequest, map[string]string{"error": "rcon password required"})
		return
	}

	id, err := s.docker.CreateGameServer(req.Name, req.Port, req.RconPassword)
	if err != nil {
		s.json(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	if err := s.docker.StartContainer(id); err != nil {
		s.json(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	// Save RCON password to settings
	shortID := id[:12]
	settingsStore[shortID] = &ServerSettings{
		ServerName:   req.Name,
		MaxPlayers:   10,
		Map:          "de_dust2",
		Tickrate:     128,
		RconPassword: req.RconPassword,
		SvPassword:   "",
		GameMode:     "1",
		GameType:     "0",
	}

	s.json(w, http.StatusCreated, ServerResponse{
		ID:     shortID,
		Name:   req.Name,
		Port:   req.Port,
		Status: "running",
	})
}

func (s *Server) handleStartServer(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	containers, _ := s.docker.ListContainers()
	for _, c := range containers {
		if strings.HasPrefix(c.ID, id) {
			if err := s.docker.StartContainer(c.ID); err != nil {
				s.json(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
				return
			}
			s.json(w, http.StatusOK, map[string]string{"status": "started"})
			return
		}
	}

	s.json(w, http.StatusNotFound, map[string]string{"error": "server not found"})
}

func (s *Server) handleStopServer(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	containers, _ := s.docker.ListContainers()
	for _, c := range containers {
		if strings.HasPrefix(c.ID, id) {
			if err := s.docker.StopContainer(c.ID); err != nil {
				s.json(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
				return
			}
			s.json(w, http.StatusOK, map[string]string{"status": "stopped"})
			return
		}
	}

	s.json(w, http.StatusNotFound, map[string]string{"error": "server not found"})
}

func (s *Server) handleDeleteServer(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	containers, _ := s.docker.ListContainers()
	for _, c := range containers {
		if strings.HasPrefix(c.ID, id) {
			if err := s.docker.RemoveContainer(c.ID); err != nil {
				s.json(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
				return
			}
			s.json(w, http.StatusOK, map[string]string{"status": "deleted"})
			return
		}
	}

	s.json(w, http.StatusNotFound, map[string]string{"error": "server not found"})
}
