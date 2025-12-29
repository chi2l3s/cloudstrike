package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/chi2l3s/cloudstrike/internal/api"
	"github.com/chi2l3s/cloudstrike/internal/config"
	"github.com/chi2l3s/cloudstrike/internal/docker"
)

func main() {
	log.Println("☁️ Starting Cloud Strike Panel...")

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	dockerClient, err := docker.NewClient()
	if err != nil {
		log.Fatalf("Failed to connect to Docker: %v", err)
	}
	defer dockerClient.Close()

	log.Println("✅ Connected to Docker")

	server := api.NewServer(cfg, dockerClient)
	go func() {
		if err := server.Run(); err != nil {
			log.Fatalf("Server error: %v", err)
		}
	}()

	log.Printf("🚀 Server running on http://localhost:%s", cfg.Port)

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down...")
}
