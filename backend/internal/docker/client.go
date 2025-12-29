package docker

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/image"
	"github.com/docker/docker/client"
	"github.com/docker/go-connections/nat"
)

type Client struct {
	cli *client.Client
	ctx context.Context
}

func NewClient() (*Client, error) {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return nil, err
	}

	return &Client{
		cli: cli,
		ctx: context.Background(),
	}, nil
}

func (c *Client) Close() error {
	return c.cli.Close()
}

func (c *Client) Ping() error {
	_, err := c.cli.Ping(c.ctx)
	return err
}

func (c *Client) ListContainers() ([]types.Container, error) {
	return c.cli.ContainerList(c.ctx, container.ListOptions{All: true})
}

func (c *Client) CreateGameServer(name string, port string, rconPassword string) (string, error) {
	// First try to pull the image (don't fail if already exists)
	reader, err := c.cli.ImagePull(c.ctx, "joedwards32/cs2", image.PullOptions{})
	if err == nil {
		defer reader.Close()
		io.Copy(io.Discard, reader)
	}
	// If pull fails, continue - image might already exist locally

	// Remove existing container with same name if exists
	containerName := "cloudstrike-" + name
	containers, _ := c.cli.ContainerList(c.ctx, container.ListOptions{All: true})
	for _, cont := range containers {
		for _, n := range cont.Names {
			if n == "/"+containerName {
				c.cli.ContainerRemove(c.ctx, cont.ID, container.RemoveOptions{Force: true})
				break
			}
		}
	}

	portTCP, _ := nat.NewPort("tcp", port)
	portUDP, _ := nat.NewPort("udp", port)

	resp, err := c.cli.ContainerCreate(c.ctx,
		&container.Config{
			Image: "joedwards32/cs2",
			Env: []string{
				"CS2_SERVERNAME=" + name,
				"CS2_PORT=" + port,
				"CS2_RCON_PORT=" + port,
				"CS2_RCONPW=" + rconPassword,
			},
			Labels: map[string]string{
				"cloudstrike":      "true",
				"cloudstrike.name": name,
				"cloudstrike.port": port,
			},
			ExposedPorts: nat.PortSet{
				portTCP: struct{}{},
				portUDP: struct{}{},
			},
		},
		&container.HostConfig{
			PortBindings: nat.PortMap{
				portTCP: []nat.PortBinding{{HostPort: port}},
				portUDP: []nat.PortBinding{{HostPort: port}},
			},
		},
		nil, nil, "cloudstrike-"+name,
	)
	if err != nil {
		return "", err
	}

	return resp.ID, nil
}

func (c *Client) StartContainer(id string) error {
	return c.cli.ContainerStart(c.ctx, id, container.StartOptions{})
}

func (c *Client) StopContainer(id string) error {
	return c.cli.ContainerStop(c.ctx, id, container.StopOptions{})
}

func (c *Client) RemoveContainer(id string) error {
	return c.cli.ContainerRemove(c.ctx, id, container.RemoveOptions{Force: true})
}

type ContainerStats struct {
	CPU         float64 `json:"cpu"`
	Memory      uint64  `json:"memory"`
	MemoryLimit uint64  `json:"memoryLimit"`
	Uptime      int64   `json:"uptime"`
}

func (c *Client) GetContainerStats(id string) (*ContainerStats, error) {
	stats, err := c.cli.ContainerStatsOneShot(c.ctx, id)
	if err != nil {
		return nil, err
	}
	defer stats.Body.Close()

	var statsJSON types.StatsJSON
	if err := json.NewDecoder(stats.Body).Decode(&statsJSON); err != nil {
		return nil, err
	}

	cpuDelta := float64(statsJSON.CPUStats.CPUUsage.TotalUsage - statsJSON.PreCPUStats.CPUUsage.TotalUsage)
	systemDelta := float64(statsJSON.CPUStats.SystemUsage - statsJSON.PreCPUStats.SystemUsage)
	cpuPercent := 0.0
	if systemDelta > 0 && cpuDelta > 0 {
		cpuPercent = (cpuDelta / systemDelta) * float64(len(statsJSON.CPUStats.CPUUsage.PercpuUsage)) * 100.0
	}

	inspect, err := c.cli.ContainerInspect(c.ctx, id)
	if err != nil {
		return nil, err
	}

	var uptime int64 = 0
	if inspect.State.Running {
		startTime, _ := time.Parse(time.RFC3339Nano, inspect.State.StartedAt)
		uptime = int64(time.Since(startTime).Seconds())
	}

	return &ContainerStats{
		CPU:         cpuPercent,
		Memory:      statsJSON.MemoryStats.Usage,
		MemoryLimit: statsJSON.MemoryStats.Limit,
		Uptime:      uptime,
	}, nil
}

func (c *Client) GetContainerByPrefix(prefix string) (string, error) {
	containers, err := c.ListContainers()
	if err != nil {
		return "", err
	}
	for _, cont := range containers {
		if strings.HasPrefix(cont.ID, prefix) {
			return cont.ID, nil
		}
	}
	return "", nil
}

func (c *Client) GetContainerIP(id string) (string, error) {
	inspect, err := c.cli.ContainerInspect(c.ctx, id)
	if err != nil {
		return "", err
	}

	// Try to get IP from default bridge network
	if inspect.NetworkSettings != nil {
		// First try bridge network
		if network, ok := inspect.NetworkSettings.Networks["bridge"]; ok && network.IPAddress != "" {
			return network.IPAddress, nil
		}
		// Fallback to global IP
		if inspect.NetworkSettings.IPAddress != "" {
			return inspect.NetworkSettings.IPAddress, nil
		}
	}

	return "", fmt.Errorf("no IP address found for container")
}

func (c *Client) GetContainerPort(id string, portNum string) (string, error) {
	inspect, err := c.cli.ContainerInspect(c.ctx, id)
	if err != nil {
		return "", err
	}

	// Check port bindings to host
	portKey := nat.Port(portNum + "/tcp")
	if bindings, ok := inspect.NetworkSettings.Ports[portKey]; ok && len(bindings) > 0 {
		return bindings[0].HostPort, nil
	}

	return portNum, nil
}

func (c *Client) ExecInContainer(id string, cmd []string) (string, error) {
	execConfig := container.ExecOptions{
		Cmd:          cmd,
		AttachStdout: true,
		AttachStderr: true,
	}

	execID, err := c.cli.ContainerExecCreate(c.ctx, id, execConfig)
	if err != nil {
		return "", err
	}

	resp, err := c.cli.ContainerExecAttach(c.ctx, execID.ID, container.ExecAttachOptions{})
	if err != nil {
		return "", err
	}
	defer resp.Close()

	output, err := io.ReadAll(resp.Reader)
	if err != nil {
		return "", err
	}

	return string(output), nil
}

func (c *Client) CopyFromContainer(id, srcPath string) (io.ReadCloser, error) {
	reader, _, err := c.cli.CopyFromContainer(c.ctx, id, srcPath)
	return reader, err
}

func (c *Client) CopyToContainer(id, dstPath string, content io.Reader) error {
	return c.cli.CopyToContainer(c.ctx, id, dstPath, content, container.CopyToContainerOptions{})
}

func (c *Client) GetContainerLogs(id string, tail string) (string, error) {
	options := container.LogsOptions{
		ShowStdout: true,
		ShowStderr: true,
		Tail:       tail,
		Timestamps: true,
	}

	reader, err := c.cli.ContainerLogs(c.ctx, id, options)
	if err != nil {
		return "", err
	}
	defer reader.Close()

	// Docker logs have a header for each line (8 bytes)
	// We need to strip these headers
	output, err := io.ReadAll(reader)
	if err != nil {
		return "", err
	}

	// Clean docker log output - remove stream headers
	var cleanLogs strings.Builder
	data := output
	for len(data) > 0 {
		if len(data) < 8 {
			break
		}
		// First 8 bytes are header: [stream type (1)] [0 0 0] [size (4 bytes big endian)]
		size := int(data[4])<<24 | int(data[5])<<16 | int(data[6])<<8 | int(data[7])
		data = data[8:]
		if size > len(data) {
			size = len(data)
		}
		cleanLogs.Write(data[:size])
		data = data[size:]
	}

	return cleanLogs.String(), nil
}
