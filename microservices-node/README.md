# InkSync Microservices (Node.js)

A simplified microservices architecture for InkSync using Node.js, Nginx, Kafka, and Redis.

## Architecture

- **Nginx**: Reverse proxy and load balancer (port 8080)
- **Room Service**: Manages rooms and users (port 3001)
- **Drawing Service**: Handles canvas operations and drawing locks (port 3002)
- **Chat Service**: Manages chat messages and history (port 3003)
- **WebSocket Gateway**: Real-time communication hub (port 3004)
- **Kafka**: Event streaming for inter-service communication
- **Redis**: Shared state and caching

## Services Overview

### Room Service (3001)

Manages room lifecycle and user participation.

**Endpoints:**

- `POST /rooms/:roomId/join` - Join a room
- `POST /rooms/:roomId/leave` - Leave a room
- `GET /rooms/:roomId/users` - Get users in room
- `GET /rooms/:roomId` - Get room details
- `GET /health` - Health check

### Drawing Service (3002)

Manages canvas state and drawing locks (5-minute expiration).

**Endpoints:**

- `POST /drawing/:roomId/lock` - Acquire drawing lock
- `POST /drawing/:roomId/unlock` - Release drawing lock
- `POST /drawing/:roomId/canvas` - Update canvas
- `GET /drawing/:roomId/canvas` - Get canvas state
- `GET /drawing/:roomId/lock` - Check lock status
- `GET /health` - Health check

### Chat Service (3003)

Handles chat messages with history (last 500 messages per room).

**Endpoints:**

- `POST /chat/:roomId/messages` - Send message
- `GET /chat/:roomId/messages?limit=50&offset=0` - Get message history
- `DELETE /chat/:roomId/messages/:messageId` - Delete message
- `GET /chat/:roomId/stats` - Get room statistics
- `GET /health` - Health check

### WebSocket Gateway (3004)

Real-time communication layer consuming Kafka events and proxying to clients.

**WebSocket Events (Client → Server):**

- `join-room` - Join a room
- `leave-room` - Leave a room
- `request-lock` - Request drawing lock
- `release-lock` - Release drawing lock
- `update-canvas` - Update canvas elements
- `send-message` - Send chat message

**WebSocket Events (Server → Client):**

- `joined` - Room joined successfully
- `user-joined` - Another user joined
- `user-left` - User left room
- `lock-acquired` - Lock acquired
- `lock-released` - Lock released
- `canvas-updated` - Canvas updated
- `new-message` - New chat message
- `error` - Error message

## Kafka Topics

- `room-events`: USER_JOINED, USER_LEFT
- `drawing-events`: LOCK_ACQUIRED, LOCK_RELEASED, CANVAS_UPDATED
- `chat-events`: MESSAGE_SENT, MESSAGE_DELETED

## Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local development)

## Getting Started

### 1. Start All Services

```powershell
cd microservices-node
docker-compose up --build -d
```

### 2. Check Service Health

```powershell
# Nginx health
curl http://localhost:8080/health

# Room service
curl http://localhost:8080/api/rooms/health

# Drawing service
curl http://localhost:8080/api/drawing/health

# Chat service
curl http://localhost:8080/api/chat/health

# WebSocket gateway
curl http://localhost:8080/ws/health
```

### 3. View Logs

```powershell
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f room-service
docker-compose logs -f drawing-service
docker-compose logs -f chat-service
docker-compose logs -f websocket-gateway
```

### 4. Stop Services

```powershell
docker-compose down
```

## API Examples

### Join a Room

```powershell
curl -X POST http://localhost:8080/api/rooms/test-room/join `
  -H "Content-Type: application/json" `
  -d '{"socketId":"user123","userName":"Alice"}'
```

### Get Room Users

```powershell
curl http://localhost:8080/api/rooms/test-room/users
```

### Request Drawing Lock

```powershell
curl -X POST http://localhost:8080/api/drawing/test-room/lock `
  -H "Content-Type: application/json" `
  -d '{"socketId":"user123","userName":"Alice"}'
```

### Update Canvas

```powershell
curl -X POST http://localhost:8080/api/drawing/test-room/canvas `
  -H "Content-Type: application/json" `
  -d '{"socketId":"user123","elements":[],"canvasColor":"#ffffff"}'
```

### Send Chat Message

```powershell
curl -X POST http://localhost:8080/api/chat/test-room/messages `
  -H "Content-Type: application/json" `
  -d '{"socketId":"user123","message":"Hello!","userName":"Alice"}'
```

### Get Chat History

```powershell
curl "http://localhost:8080/api/chat/test-room/messages?limit=20&offset=0"
```

## WebSocket Connection

```javascript
const ws = new WebSocket("ws://localhost:8080/ws");

ws.onopen = () => {
  // Join room
  ws.send(
    JSON.stringify({
      type: "join-room",
      roomId: "test-room",
      socketId: "user123",
      userName: "Alice",
    })
  );
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log("Received:", message);
};

// Send chat message
ws.send(
  JSON.stringify({
    type: "send-message",
    message: "Hello everyone!",
    userName: "Alice",
  })
);

// Request drawing lock
ws.send(
  JSON.stringify({
    type: "request-lock",
    userName: "Alice",
  })
);
```

## Development

### Run Service Locally

```powershell
# Start infrastructure
docker-compose up redis zookeeper kafka -d

# Run service
cd room-service
npm install
$env:REDIS_URL="redis://localhost:6379"
$env:KAFKA_BROKER="localhost:9092"
node index.js
```

### Environment Variables

Each service supports:

- `PORT` - Service port (default: 3001/3002/3003/3004)
- `REDIS_URL` - Redis connection URL (default: redis://localhost:6379)
- `KAFKA_BROKER` - Kafka broker address (default: localhost:9092)

WebSocket Gateway additional:

- `ROOM_SERVICE_URL` - Room service URL (default: http://localhost:3001)
- `DRAWING_SERVICE_URL` - Drawing service URL (default: http://localhost:3002)
- `CHAT_SERVICE_URL` - Chat service URL (default: http://localhost:3003)

## Architecture Decisions

- **No Service Registry**: Nginx handles routing with upstream configuration
- **No gRPC**: REST APIs for simplicity
- **Kafka for Events**: Asynchronous event streaming between services
- **Redis for State**: Shared state management (rooms, users, canvas, messages)
- **WebSocket Gateway**: Single entry point for real-time client communication
- **Stateless Services**: All services can scale horizontally

## Port Mapping

- `8080` - Nginx (external access point)
- `3001` - Room Service (internal)
- `3002` - Drawing Service (internal)
- `3003` - Chat Service (internal)
- `3004` - WebSocket Gateway (internal, exposed via Nginx /ws)
- `6379` - Redis (internal)
- `9092` - Kafka (internal)
- `2181` - Zookeeper (internal)

## Troubleshooting

### Services not starting

```powershell
# Check logs
docker-compose logs

# Rebuild images
docker-compose up --build --force-recreate
```

### Kafka connection issues

```powershell
# Ensure Kafka is ready
docker-compose logs kafka

# Wait for "started (kafka.server.KafkaServer)" message
```

### Redis connection issues

```powershell
# Test Redis connection
docker-compose exec redis redis-cli ping
# Should return PONG
```

### WebSocket not connecting

1. Ensure nginx is running: `docker-compose ps nginx`
2. Check nginx logs: `docker-compose logs nginx`
3. Verify websocket-gateway is running: `curl http://localhost:8080/ws/health`

## License

See root LICENSE file.
