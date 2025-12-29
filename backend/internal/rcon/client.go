package rcon

import (
	"fmt"
	"sync"
	"time"

	"github.com/gorcon/rcon"
)

type Manager struct {
	connections map[string]*rcon.Conn
	mu          sync.RWMutex
}

func NewManager() *Manager {
	return &Manager{
		connections: make(map[string]*rcon.Conn),
	}
}

func (m *Manager) Connect(serverID, address, password string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if conn, exists := m.connections[serverID]; exists {
		conn.Close()
		delete(m.connections, serverID)
	}

	// Try to connect with retries
	var conn *rcon.Conn
	var err error

	for i := 0; i < 3; i++ {
		conn, err = rcon.Dial(address, password, rcon.SetDialTimeout(5*time.Second))
		if err == nil {
			break
		}
		time.Sleep(time.Second)
	}

	if err != nil {
		return fmt.Errorf("failed to connect to %s: %w", address, err)
	}

	m.connections[serverID] = conn
	return nil
}

func (m *Manager) Execute(serverID, command string) (string, error) {
	m.mu.RLock()
	conn, exists := m.connections[serverID]
	m.mu.RUnlock()

	if !exists {
		return "", fmt.Errorf("not connected to server %s", serverID)
	}

	response, err := conn.Execute(command)
	if err != nil {
		m.mu.Lock()
		delete(m.connections, serverID)
		m.mu.Unlock()
		return "", fmt.Errorf("command failed: %w", err)
	}

	return response, nil
}

func (m *Manager) Disconnect(serverID string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if conn, exists := m.connections[serverID]; exists {
		conn.Close()
		delete(m.connections, serverID)
	}
}

func (m *Manager) IsConnected(serverID string) bool {
	m.mu.RLock()
	defer m.mu.RUnlock()
	_, exists := m.connections[serverID]
	return exists
}
