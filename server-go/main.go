package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math"
	"math/rand"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const (
	WORLD_WIDTH  = 5000
	WORLD_HEIGHT = 5000
	MAX_PLAYERS  = 500
	MAX_FOOD     = 1000
	TICK_RATE    = 60
	SEND_RATE    = 20
	CELL_SIZE    = 500
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins in development
	},
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

// Player represents a game player
type Player struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	X           float64   `json:"x"`
	Y           float64   `json:"y"`
	VX          float64   `json:"vx"`
	VY          float64   `json:"vy"`
	Mass        float64   `json:"mass"`
	Size        float64   `json:"size"`
	Color       string    `json:"color"`
	LastUpdate  time.Time `json:"-"`
	Connection  *websocket.Conn `json:"-"`
	GridCell    string    `json:"-"`
	mutex       sync.RWMutex `json:"-"`
}

// Food represents food items
type Food struct {
	ID    string  `json:"id"`
	X     float64 `json:"x"`
	Y     float64 `json:"y"`
	Size  float64 `json:"size"`
	Color string  `json:"color"`
}

// SpatialGrid for efficient spatial queries
type SpatialGrid struct {
	cells    map[string]map[string]*Player
	cellSize float64
	mutex    sync.RWMutex
}

func NewSpatialGrid(cellSize float64) *SpatialGrid {
	return &SpatialGrid{
		cells:    make(map[string]map[string]*Player),
		cellSize: cellSize,
	}
}

func (sg *SpatialGrid) getCell(x, y float64) string {
	col := int(x / sg.cellSize)
	row := int(y / sg.cellSize)
	return fmt.Sprintf("%d,%d", col, row)
}

func (sg *SpatialGrid) AddPlayer(player *Player) {
	sg.mutex.Lock()
	defer sg.mutex.Unlock()
	
	cell := sg.getCell(player.X, player.Y)
	if sg.cells[cell] == nil {
		sg.cells[cell] = make(map[string]*Player)
	}
	sg.cells[cell][player.ID] = player
	player.GridCell = cell
}

func (sg *SpatialGrid) RemovePlayer(player *Player) {
	sg.mutex.Lock()
	defer sg.mutex.Unlock()
	
	if cell, exists := sg.cells[player.GridCell]; exists {
		delete(cell, player.ID)
		if len(cell) == 0 {
			delete(sg.cells, player.GridCell)
		}
	}
}

func (sg *SpatialGrid) UpdatePlayer(player *Player) {
	newCell := sg.getCell(player.X, player.Y)
	if newCell != player.GridCell {
		sg.RemovePlayer(player)
		sg.AddPlayer(player)
	}
}

func (sg *SpatialGrid) GetNearbyPlayers(x, y float64, radius int) []*Player {
	sg.mutex.RLock()
	defer sg.mutex.RUnlock()
	
	centerCol := int(x / sg.cellSize)
	centerRow := int(y / sg.cellSize)
	
	var nearby []*Player
	for col := centerCol - radius; col <= centerCol + radius; col++ {
		for row := centerRow - radius; row <= centerRow + radius; row++ {
			cell := fmt.Sprintf("%d,%d", col, row)
			if players, exists := sg.cells[cell]; exists {
				for _, player := range players {
					nearby = append(nearby, player)
				}
			}
		}
	}
	return nearby
}

// GameServer holds the game state
type GameServer struct {
	players     map[string]*Player
	food        map[string]*Food
	spatialGrid *SpatialGrid
	mutex       sync.RWMutex
	playerCount int
}

func NewGameServer() *GameServer {
	gs := &GameServer{
		players:     make(map[string]*Player),
		food:        make(map[string]*Food),
		spatialGrid: NewSpatialGrid(CELL_SIZE),
	}
	gs.generateFood()
	return gs
}

func (gs *GameServer) generateFood() {
	for i := 0; i < MAX_FOOD; i++ {
		food := &Food{
			ID:    fmt.Sprintf("food_%d", i),
			X:     rand.Float64() * WORLD_WIDTH,
			Y:     rand.Float64() * WORLD_HEIGHT,
			Size:  6,
			Color: fmt.Sprintf("hsl(%d, 70%%, 60%%)", rand.Intn(360)),
		}
		gs.food[food.ID] = food
	}
}

func (gs *GameServer) AddPlayer(player *Player) {
	gs.mutex.Lock()
	defer gs.mutex.Unlock()
	
	gs.players[player.ID] = player
	gs.spatialGrid.AddPlayer(player)
	gs.playerCount++
	
	log.Printf("Player %s joined. Total players: %d", player.Name, gs.playerCount)
}

func (gs *GameServer) RemovePlayer(playerID string) {
	gs.mutex.Lock()
	defer gs.mutex.Unlock()
	
	if player, exists := gs.players[playerID]; exists {
		gs.spatialGrid.RemovePlayer(player)
		delete(gs.players, playerID)
		gs.playerCount--
		
		log.Printf("Player %s left. Total players: %d", player.Name, gs.playerCount)
	}
}

func (gs *GameServer) UpdatePlayer(playerID string, vx, vy float64) {
	gs.mutex.RLock()
	player, exists := gs.players[playerID]
	gs.mutex.RUnlock()
	
	if !exists {
		return
	}
	
	player.mutex.Lock()
	defer player.mutex.Unlock()
	
	// Update velocity with speed based on size
	speed := math.Max(1.0, 5.0-(player.Size-20)/30)
	player.VX = vx * speed
	player.VY = vy * speed
}

func (gs *GameServer) UpdateGame() {
	gs.mutex.RLock()
	players := make([]*Player, 0, len(gs.players))
	for _, player := range gs.players {
		players = append(players, player)
	}
	gs.mutex.RUnlock()
	
	// Update all players
	for _, player := range players {
		player.mutex.Lock()
		
		now := time.Now()
		deltaTime := now.Sub(player.LastUpdate).Seconds()
		
		// Update position
		player.X += player.VX * deltaTime * 60
		player.Y += player.VY * deltaTime * 60
		
		// Boundary checking
		radius := player.Size / 2
		player.X = math.Max(radius, math.Min(WORLD_WIDTH-radius, player.X))
		player.Y = math.Max(radius, math.Min(WORLD_HEIGHT-radius, player.Y))
		
		// Update size and last update time
		player.Size = math.Sqrt(player.Mass)
		player.LastUpdate = now
		
		player.mutex.Unlock()
		
		// Update spatial grid
		gs.spatialGrid.UpdatePlayer(player)
	}
}

func (gs *GameServer) GetNearbyData(playerID string) ([]Player, []Food) {
	gs.mutex.RLock()
	player, exists := gs.players[playerID]
	gs.mutex.RUnlock()
	
	if !exists {
		return nil, nil
	}
	
	player.mutex.RLock()
	x, y := player.X, player.Y
	player.mutex.RUnlock()
	
	// Get nearby players
	nearbyPlayers := gs.spatialGrid.GetNearbyPlayers(x, y, 2)
	playerData := make([]Player, 0, len(nearbyPlayers))
	
	for _, p := range nearbyPlayers {
		if p.ID != playerID {
			p.mutex.RLock()
			playerData = append(playerData, Player{
				ID:   p.ID,
				Name: p.Name,
				X:    math.Round(p.X),
				Y:    math.Round(p.Y),
				Size: math.Round(p.Size),
				Mass: p.Mass,
				Color: p.Color,
			})
			p.mutex.RUnlock()
			
			// Limit to prevent overwhelming
			if len(playerData) >= 50 {
				break
			}
		}
	}
	
	// Get nearby food
	gs.mutex.RLock()
	nearbyFood := make([]Food, 0)
	count := 0
	for _, food := range gs.food {
		dx := food.X - x
		dy := food.Y - y
		if dx*dx+dy*dy < 250000 { // ~500px radius
			nearbyFood = append(nearbyFood, *food)
			count++
			if count >= 100 {
				break
			}
		}
	}
	gs.mutex.RUnlock()
	
	return playerData, nearbyFood
}

func (gs *GameServer) GetLeaderboard() []map[string]interface{} {
	gs.mutex.RLock()
	players := make([]*Player, 0, len(gs.players))
	for _, player := range gs.players {
		players = append(players, player)
	}
	gs.mutex.RUnlock()
	
	// Sort by mass (top 10)
	if len(players) > 10 {
		players = players[:10]
	}
	
	leaderboard := make([]map[string]interface{}, 0, len(players))
	for _, player := range players {
		player.mutex.RLock()
		leaderboard = append(leaderboard, map[string]interface{}{
			"name":  player.Name,
			"score": int(player.Mass / 4),
		})
		player.mutex.RUnlock()
	}
	
	return leaderboard
}

// Message types
type Message struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

func handleConnection(gs *GameServer, w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}
	defer conn.Close()
	
	var player *Player
	
	// Handle incoming messages
	for {
		var msg Message
		err := conn.ReadJSON(&msg)
		if err != nil {
			if player != nil {
				gs.RemovePlayer(player.ID)
			}
			break
		}
		
		switch msg.Type {
		case "join-game":
			data, ok := msg.Data.(map[string]interface{})
			if !ok {
				continue
			}
			
			name, ok := data["name"].(string)
			if !ok || len(strings.TrimSpace(name)) == 0 {
				conn.WriteJSON(Message{Type: "error", Data: "Invalid name"})
				continue
			}
			
			// Limit name length
			if len(name) > 128 {
				name = name[:128]
			}
			
			playerID := fmt.Sprintf("player_%d_%d", time.Now().UnixNano(), rand.Intn(1000))
			
			player = &Player{
				ID:         playerID,
				Name:       name,
				X:          rand.Float64()*(WORLD_WIDTH-100) + 50,
				Y:          rand.Float64()*(WORLD_HEIGHT-100) + 50,
				Mass:       400,
				Size:       20,
				Color:      fmt.Sprintf("hsl(%d, 70%%, 60%%)", rand.Intn(360)),
				LastUpdate: time.Now(),
				Connection: conn,
			}
			
			gs.AddPlayer(player)
			
			conn.WriteJSON(Message{
				Type: "game-joined",
				Data: map[string]interface{}{
					"playerId": playerID,
					"world":    map[string]int{"width": WORLD_WIDTH, "height": WORLD_HEIGHT},
				},
			})
			
		case "move":
			if player == nil {
				continue
			}
			
			data, ok := msg.Data.(map[string]interface{})
			if !ok {
				continue
			}
			
			x, _ := data["x"].(float64)
			y, _ := data["y"].(float64)
			
			// Clamp values
			x = math.Max(-1, math.Min(1, x))
			y = math.Max(-1, math.Min(1, y))
			
			gs.UpdatePlayer(player.ID, x, y)
		}
	}
}

func main() {
	gameServer := NewGameServer()
	
	// Game update loop
	go func() {
		ticker := time.NewTicker(time.Second / TICK_RATE)
		defer ticker.Stop()
		
		for {
			select {
			case <-ticker.C:
				gameServer.UpdateGame()
			}
		}
	}()
	
	// Broadcast loop
	go func() {
		ticker := time.NewTicker(time.Second / SEND_RATE)
		defer ticker.Stop()
		
		for {
			select {
			case <-ticker.C:
				gameServer.mutex.RLock()
				players := make([]*Player, 0, len(gameServer.players))
				for _, player := range gameServer.players {
					players = append(players, player)
				}
				gameServer.mutex.RUnlock()
				
				for _, player := range players {
					if player.Connection == nil {
						continue
					}
					
					nearbyPlayers, nearbyFood := gameServer.GetNearbyData(player.ID)
					
					player.mutex.RLock()
					updateData := map[string]interface{}{
						"players": nearbyPlayers,
						"food":    nearbyFood,
						"player": map[string]interface{}{
							"id":   player.ID,
							"name": player.Name,
							"x":    math.Round(player.X),
							"y":    math.Round(player.Y),
							"size": math.Round(player.Size),
							"mass": player.Mass,
							"color": player.Color,
						},
					}
					player.mutex.RUnlock()
					
					err := player.Connection.WriteJSON(Message{
						Type: "game-update",
						Data: updateData,
					})
					
					if err != nil {
						gameServer.RemovePlayer(player.ID)
					}
				}
			}
		}
	}()
	
	// Leaderboard broadcast
	go func() {
		ticker := time.NewTicker(3 * time.Second)
		defer ticker.Stop()
		
		for {
			select {
			case <-ticker.C:
				if gameServer.playerCount == 0 {
					continue
				}
				
				leaderboard := gameServer.GetLeaderboard()
				
				gameServer.mutex.RLock()
				for _, player := range gameServer.players {
					if player.Connection != nil {
						player.Connection.WriteJSON(Message{
							Type: "leaderboard-update",
							Data: leaderboard,
						})
					}
				}
				gameServer.mutex.RUnlock()
			}
		}
	}()
	
	// Serve static files
	http.Handle("/", http.FileServer(http.Dir("../public")))
	
	// WebSocket endpoint
	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		handleConnection(gameServer, w, r)
	})
	
	port := "3001"
	log.Printf("🚀 Go Game Server starting on port %s - Ready for 400+ players!", port)
	log.Printf("🌍 Game world: %dx%d", WORLD_WIDTH, WORLD_HEIGHT)
	log.Printf("⚡ Optimized for high concurrency with spatial grid")
	
	log.Fatal(http.ListenAndServe(":"+port, nil))
} 