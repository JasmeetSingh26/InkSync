const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = process.env.PORT || 3003;
const WEBSOCKET_GATEWAY_URL =
  process.env.WEBSOCKET_GATEWAY_URL || "http://websocket-gateway:3004";
const MAX_MESSAGES_PER_ROOM = 500;

app.use(cors());
app.use(express.json());

// In-memory storage
const roomMessages = new Map(); // roomId -> Array of messages

// Notify WebSocket Gateway
async function notifyWebSocket(roomId, event) {
  try {
    await axios.post(`${WEBSOCKET_GATEWAY_URL}/notify/${roomId}`, event);
  } catch (error) {
    console.error("WebSocket notification error:", error);
  }
}

// Send message
app.post("/chat/:roomId/messages", async (req, res) => {
  try {
    const { roomId } = req.params;
    const { socketId, message, userName } = req.body;

    const messageData = {
      id: uuidv4(),
      roomId,
      socketId,
      message,
      userName,
      timestamp: Date.now(),
    };

    // Get or create room messages array
    let messages = roomMessages.get(roomId) || [];

    // Add new message to the beginning
    messages.unshift(messageData);

    // Keep only the last MAX_MESSAGES_PER_ROOM messages
    if (messages.length > MAX_MESSAGES_PER_ROOM) {
      messages = messages.slice(0, MAX_MESSAGES_PER_ROOM);
    }

    roomMessages.set(roomId, messages);

    // Notify WebSocket Gateway
    await notifyWebSocket(roomId, {
      type: "message-sent",
      roomId,
      socketId,
      message: messageData,
    });

    res.json({ success: true, message: messageData });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get message history
app.get("/chat/:roomId/messages", (req, res) => {
  try {
    const { roomId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const messages = roomMessages.get(roomId) || [];

    // Apply pagination
    const paginatedMessages = messages.slice(offset, offset + limit);

    res.json({
      success: true,
      messages: paginatedMessages.reverse(), // Return in chronological order
      total: messages.length,
    });
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete message (admin)
app.delete("/chat/:roomId/messages/:messageId", async (req, res) => {
  try {
    const { roomId, messageId } = req.params;

    const messages = roomMessages.get(roomId) || [];
    const filteredMessages = messages.filter((msg) => msg.id !== messageId);

    roomMessages.set(roomId, filteredMessages);

    // Notify WebSocket Gateway
    await notifyWebSocket(roomId, {
      type: "message-deleted",
      roomId,
      messageId,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Delete message error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get chat stats
app.get("/chat/:roomId/stats", async (req, res) => {
  try {
    const { roomId } = req.params;
    const messages = roomMessages.get(roomId) || [];

    // Get active users count from room service
    let activeUsers = 0;
    try {
      const response = await axios.get(
        `http://room-service:3001/rooms/${roomId}/users`
      );
      activeUsers = response.data.users ? response.data.users.length : 0;
    } catch (error) {
      console.error("Error getting user count:", error);
    }

    res.json({
      success: true,
      totalMessages: messages.length,
      activeUsers,
      lastActivity: messages.length > 0 ? messages[0].timestamp : Date.now(),
    });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "chat-service",
    totalRooms: roomMessages.size,
    totalMessages: Array.from(roomMessages.values()).reduce(
      (total, messages) => total + messages.length,
      0
    ),
  });
});

app.listen(PORT, () => {
  console.log(`Chat service running on port ${PORT}`);
});
