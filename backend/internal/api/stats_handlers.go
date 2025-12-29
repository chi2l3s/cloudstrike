package api

import (
	"archive/tar"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

type ServerStatsResponse struct {
	CPU         float64 `json:"cpu"`
	Memory      uint64  `json:"memory"`
	MemoryLimit uint64  `json:"memoryLimit"`
	Storage     uint64  `json:"storage"`
	Uptime      int64   `json:"uptime"`
	Players     int     `json:"players"`
	MaxPlayers  int     `json:"maxPlayers"`
	Map         string  `json:"map"`
}

func (s *Server) handleServerStats(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	fullID, err := s.docker.GetContainerByPrefix(id)
	if err != nil || fullID == "" {
		s.json(w, http.StatusNotFound, map[string]string{"error": "server not found"})
		return
	}

	stats, err := s.docker.GetContainerStats(fullID)
	if err != nil {
		s.json(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	s.json(w, http.StatusOK, ServerStatsResponse{
		CPU:         stats.CPU,
		Memory:      stats.Memory,
		MemoryLimit: stats.MemoryLimit,
		Storage:     0,
		Uptime:      stats.Uptime,
		Players:     0,
		MaxPlayers:  10,
		Map:         "de_dust2",
	})
}

type FileItem struct {
	Name    string `json:"name"`
	Path    string `json:"path"`
	IsDir   bool   `json:"isDir"`
	Size    int64  `json:"size"`
	ModTime string `json:"modTime"`
}

func (s *Server) handleListFiles(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	path := r.URL.Query().Get("path")
	if path == "" {
		path = "/home/steam/cs2-dedicated"
	}

	fullID, err := s.docker.GetContainerByPrefix(id)
	if err != nil || fullID == "" {
		s.json(w, http.StatusNotFound, map[string]string{"error": "server not found"})
		return
	}

	output, err := s.docker.ExecInContainer(fullID, []string{"ls", "-la", "--time-style=+%Y-%m-%dT%H:%M:%S", path})
	if err != nil {
		s.json(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	files := parseListOutput(output, path)
	s.json(w, http.StatusOK, files)
}

func parseListOutput(output, basePath string) []FileItem {
	var files []FileItem

	// Clean docker exec output - remove non-printable characters
	cleanOutput := ""
	for _, r := range output {
		if r >= 32 || r == '\n' || r == '\t' {
			cleanOutput += string(r)
		}
	}

	lines := strings.Split(cleanOutput, "\n")

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "total") {
			continue
		}

		// Skip lines that don't start with permission bits
		if len(line) < 10 {
			continue
		}

		// Check if line starts with valid permission pattern (d, -, l, etc.)
		firstChar := line[0]
		if firstChar != 'd' && firstChar != '-' && firstChar != 'l' {
			continue
		}

		fields := strings.Fields(line)
		if len(fields) < 9 {
			continue
		}

		// Format: drwxr-xr-x 2 user group size date time name
		// With our time format: drwxr-xr-x 2 user group size 2024-01-01T12:00:00 name
		name := fields[len(fields)-1]
		if name == "." || name == ".." {
			continue
		}

		isDir := firstChar == 'd'

		// Parse size (field 4, 0-indexed)
		size := int64(0)
		if len(fields) >= 5 {
			if n, err := strconv.ParseInt(fields[4], 10, 64); err == nil {
				size = n
			}
		}

		// Find timestamp field
		modTime := ""
		for _, f := range fields {
			if strings.Contains(f, "T") && len(f) > 10 {
				modTime = f
				break
			}
		}

		files = append(files, FileItem{
			Name:    name,
			Path:    filepath.Join(basePath, name),
			IsDir:   isDir,
			Size:    size,
			ModTime: modTime,
		})
	}

	return files
}

func parseInt64(s string) (int64, error) {
	var n int64
	err := json.Unmarshal([]byte(s), &n)
	return n, err
}

func (s *Server) handleDeleteFile(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	path := r.URL.Query().Get("path")
	if path == "" {
		s.json(w, http.StatusBadRequest, map[string]string{"error": "path required"})
		return
	}

	fullID, err := s.docker.GetContainerByPrefix(id)
	if err != nil || fullID == "" {
		s.json(w, http.StatusNotFound, map[string]string{"error": "server not found"})
		return
	}

	_, err = s.docker.ExecInContainer(fullID, []string{"rm", "-rf", path})
	if err != nil {
		s.json(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	s.json(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (s *Server) handleUploadFile(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	path := r.URL.Query().Get("path")
	if path == "" {
		path = "/home/steam/cs2-dedicated"
	}

	fullID, err := s.docker.GetContainerByPrefix(id)
	if err != nil || fullID == "" {
		s.json(w, http.StatusNotFound, map[string]string{"error": "server not found"})
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		s.json(w, http.StatusBadRequest, map[string]string{"error": "file required"})
		return
	}
	defer file.Close()

	// Create tar archive for docker copy
	pr, pw := io.Pipe()
	tw := tar.NewWriter(pw)

	go func() {
		defer pw.Close()
		defer tw.Close()

		hdr := &tar.Header{
			Name: header.Filename,
			Mode: 0644,
			Size: header.Size,
		}
		tw.WriteHeader(hdr)
		io.Copy(tw, file)
	}()

	err = s.docker.CopyToContainer(fullID, path, pr)
	if err != nil {
		s.json(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	s.json(w, http.StatusOK, map[string]string{"status": "uploaded"})
}

func (s *Server) handleDownloadFile(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	path := r.URL.Query().Get("path")
	if path == "" {
		s.json(w, http.StatusBadRequest, map[string]string{"error": "path required"})
		return
	}

	fullID, err := s.docker.GetContainerByPrefix(id)
	if err != nil || fullID == "" {
		s.json(w, http.StatusNotFound, map[string]string{"error": "server not found"})
		return
	}

	reader, err := s.docker.CopyFromContainer(fullID, path)
	if err != nil {
		s.json(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	defer reader.Close()

	tr := tar.NewReader(reader)
	for {
		hdr, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			s.json(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}

		w.Header().Set("Content-Disposition", "attachment; filename="+filepath.Base(hdr.Name))
		w.Header().Set("Content-Type", "application/octet-stream")
		io.Copy(w, tr)
		return
	}
}

type ServerSettings struct {
	ServerName   string `json:"serverName"`
	MaxPlayers   int    `json:"maxPlayers"`
	Map          string `json:"map"`
	Tickrate     int    `json:"tickrate"`
	RconPassword string `json:"rconPassword"`
	SvPassword   string `json:"svPassword"`
	GameMode     string `json:"gameMode"`
	GameType     string `json:"gameType"`
}

var settingsStore = make(map[string]*ServerSettings)

func (s *Server) handleGetSettings(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	fullID, err := s.docker.GetContainerByPrefix(id)
	if err != nil || fullID == "" {
		s.json(w, http.StatusNotFound, map[string]string{"error": "server not found"})
		return
	}

	settings, ok := settingsStore[id]
	if !ok {
		settings = &ServerSettings{
			ServerName:   "CS2 Server",
			MaxPlayers:   10,
			Map:          "de_dust2",
			Tickrate:     128,
			RconPassword: "",
			SvPassword:   "",
			GameMode:     "1",
			GameType:     "0",
		}
	}

	s.json(w, http.StatusOK, settings)
}

func (s *Server) handleUpdateSettings(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	fullID, err := s.docker.GetContainerByPrefix(id)
	if err != nil || fullID == "" {
		s.json(w, http.StatusNotFound, map[string]string{"error": "server not found"})
		return
	}

	var settings ServerSettings
	if err := json.NewDecoder(r.Body).Decode(&settings); err != nil {
		s.json(w, http.StatusBadRequest, map[string]string{"error": "invalid request"})
		return
	}

	settingsStore[id] = &settings

	s.json(w, http.StatusOK, settings)
}

// Unused import fix
var _ = os.PathSeparator

func (s *Server) handleGetLogs(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	tail := r.URL.Query().Get("tail")
	if tail == "" {
		tail = "100"
	}

	fullID, err := s.docker.GetContainerByPrefix(id)
	if err != nil || fullID == "" {
		s.json(w, http.StatusNotFound, map[string]string{"error": "server not found"})
		return
	}

	logs, err := s.docker.GetContainerLogs(fullID, tail)
	if err != nil {
		s.json(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	s.json(w, http.StatusOK, map[string]string{"logs": logs})
}
