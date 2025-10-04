const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = process.env.PORT || 3001;
const WEBSOCKET_URL =
  process.env.WEBSOCKET_URL || "http://websocket-gateway:3004";

app.use(cors());
app.use(express.json());

// In-memory storage (replace Redis)
const rooms = new Map();
const roomUsers = new Map();

// Notify WebSocket Gateway
async function notifyWebSocket(roomId, event) {
  try {
    await axios.post(`${WEBSOCKET_URL}/internal/broadcast`, {
      roomId,
      ...event,
    });
  } catch (error) {
    console.log("WebSocket notification failed:", error);
    // Continue anyway - app still works
  }
}

// Create or join room
app.post("/rooms/:roomId/join", async (req, res) => {
  try {
    const { roomId } = req.params;
    const { socketId, userName } = req.body;

    // Get or create room data
    let room = rooms.get(roomId);
    if (!room) {
      room = {
        roomId,
        canvasColor: "#ffffff",
        createdAt: Date.now(),
      };
      rooms.set(roomId, room);
    }

    // Get or create room users
    let users = roomUsers.get(roomId);
    if (!users) {
      users = new Map();
      roomUsers.set(roomId, users);
    }

    // Add user to room
    const userData = {
      socketId,
      userName,
      joinedAt: Date.now(),
    };

    users.set(socketId, userData);

    // Default canvas data
    const canvas = {
      roomId,
      elements: [],
      canvasColor: "#ffffff",
    };

    // Notify WebSocket Gateway
    await notifyWebSocket(roomId, {
      type: "user-joined",
      user: userData,
    });

    res.json({
      success: true,
      room,
      canvas,
      user: userData,
    });
  } catch (error) {
    console.error("Join room error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Leave room
app.post("/rooms/:roomId/leave", async (req, res) => {
  try {
    const { roomId } = req.params;
    const { socketId } = req.body;

    const users = roomUsers.get(roomId);
    if (users && users.has(socketId)) {
      const userData = users.get(socketId);
      users.delete(socketId);

      // If room is empty, clean up
      if (users.size === 0) {
        roomUsers.delete(roomId);
        rooms.delete(roomId);
      }

      // Notify WebSocket Gateway
      await notifyWebSocket(roomId, {
        type: "user-left",
        socketId,
      });

      res.json({ success: true, user: userData });
    } else {
      res.status(404).json({ success: false, error: "User not found in room" });
    }
  } catch (error) {
    console.error("Leave room error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get room users
app.get("/rooms/:roomId/users", (req, res) => {
  try {
    const { roomId } = req.params;
    const users = roomUsers.get(roomId);

    if (users) {
      const userList = Array.from(users.values());
      res.json({ users: userList });
    } else {
      res.json({ users: [] });
    }
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get room details
app.get("/rooms/:roomId", (req, res) => {
  try {
    const { roomId } = req.params;
    const room = rooms.get(roomId);

    if (room) {
      const users = roomUsers.get(roomId);
      const userList = users ? Array.from(users.values()) : [];

      res.json({
        success: true,
        room: {
          ...room,
          userCount: userList.length,
          users: userList,
        },
      });
    } else {
      res.status(404).json({ success: false, error: "Room not found" });
    }
  } catch (error) {
    console.error("Get room error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "room-service",
    rooms: rooms.size,
    totalUsers: Array.from(roomUsers.values()).reduce(
      (total, users) => total + users.size,
      0
    ),
  });
});

app.listen(PORT, () => {
  console.log(`Room service running on port ${PORT}`);
});
