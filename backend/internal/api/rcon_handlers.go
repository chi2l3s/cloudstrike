package api

import (
	"encoding/json"
	"net/http"
)

type RCONConnectRequest struct {
	Address  string `json:"address"`
	Password string `json:"password"`
}

type RCONCommandRequest struct {
	Command string `json:"command"`
}

func (s *Server) handleRCONConnect(w http.ResponseWriter, r *http.Request) {
	serverID := r.PathValue("id")

	var req RCONConnectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.json(w, http.StatusBadRequest, map[string]string{"error": "invalid request"})
		return
	}

	if req.Password == "" {
		s.json(w, http.StatusBadRequest, map[string]string{"error": "password required"})
		return
	}

	// Get container info to find the correct address
	fullID, err := s.docker.GetContainerByPrefix(serverID)
	if err != nil || fullID == "" {
		s.json(w, http.StatusNotFound, map[string]string{"error": "server not found"})
		return
	}

	// Try to get container IP for direct connection
	address := req.Address
	if address == "" || address == "localhost:27015" {
		// Try container IP first (for docker-to-docker or host-to-container via bridge)
		containerIP, err := s.docker.GetContainerIP(fullID)
		if err == nil && containerIP != "" {
			// Get the port from container labels or use default
			containers, _ := s.docker.ListContainers()
			port := "27015"
			for _, c := range containers {
				if c.ID == fullID {
					if p, ok := c.Labels["cloudstrike.port"]; ok {
						port = p
					}
					break
				}
			}
			address = containerIP + ":" + port
		} else {
			// Fallback to localhost with mapped port
			address = "127.0.0.1:27015"
		}
	}

	if err := s.rcon.Connect(serverID, address, req.Password); err != nil {
		s.json(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	s.json(w, http.StatusOK, map[string]string{"status": "connected", "address": address})
}

func (s *Server) handleRCONCommand(w http.ResponseWriter, r *http.Request) {
	serverID := r.PathValue("id")

	var req RCONCommandRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.json(w, http.StatusBadRequest, map[string]string{"error": "invalid request"})
		return
	}

	if req.Command == "" {
		s.json(w, http.StatusBadRequest, map[string]string{"error": "command required"})
		return
	}

	response, err := s.rcon.Execute(serverID, req.Command)
	if err != nil {
		s.json(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	s.json(w, http.StatusOK, map[string]string{"response": response})
}

func (s *Server) handleRCONDisconnect(w http.ResponseWriter, r *http.Request) {
	serverID := r.PathValue("id")
	s.rcon.Disconnect(serverID)
	s.json(w, http.StatusOK, map[string]string{"status": "disconnected"})
}

func (s *Server) handleRCONStatus(w http.ResponseWriter, r *http.Request) {
	serverID := r.PathValue("id")
	connected := s.rcon.IsConnected(serverID)
	s.json(w, http.StatusOK, map[string]bool{"connected": connected})
}
