const express = require("express");
const { Server } = require("socket.io");
const axios = require("axios");
const http = require("http");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3004;

const ROOM_SERVICE_URL =
  process.env.ROOM_SERVICE_URL || "http://room-service:3001";
const DRAWING_SERVICE_URL =
  process.env.DRAWING_SERVICE_URL || "http://drawing-service:3002";
const CHAT_SERVICE_URL =
  process.env.CHAT_SERVICE_URL || "http://chat-service:3003";

app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// In-memory storage for connected clients
const clients = new Map(); // socketId -> { socket, roomId, userName }

io.on("connection", (socket) => {
  console.log("New Socket.IO connection:", socket.id);

  socket.on("joinRoom", async (data) => {
    try {
      const { roomId, userName } = data;
      const socketId = socket.id;

      // Join Socket.IO room
      socket.join(roomId);
      socket.roomId = roomId;
      socket.userName = userName;

      clients.set(socketId, { socket, roomId, userName });

      // Call room service
      const joinResponse = await axios.post(
        `${ROOM_SERVICE_URL}/rooms/${roomId}/join`,
        {
          socketId,
          userName,
        }
      );

      // Fetch current canvas state
      let canvasData = null;
      try {
        const canvasResponse = await axios.get(
          `${DRAWING_SERVICE_URL}/drawing/${roomId}/canvas`
        );
        canvasData = canvasResponse.data.canvas;
      } catch (error) {
        console.error("Error fetching canvas:", error);
      }

      // Fetch current chat history
      let chatHistory = [];
      try {
        const chatResponse = await axios.get(
          `${CHAT_SERVICE_URL}/chat/${roomId}/messages?limit=50`
        );
        chatHistory = chatResponse.data.messages || [];
      } catch (error) {
        console.error("Error fetching chat history:", error);
      }

      // Fetch current lock status
      let lockStatus = { isLocked: false };
      try {
        const lockResponse = await axios.get(
          `${DRAWING_SERVICE_URL}/drawing/${roomId}/lock`
        );
        lockStatus = lockResponse.data;
      } catch (error) {
        console.error("Error fetching lock status:", error);
      }

      // Send comprehensive room state to the joining user
      socket.emit("roomState", {
        roomData: joinResponse.data,
        canvas: canvasData,
        chatHistory: chatHistory,
        lockStatus: lockStatus,
      });

      // Broadcast to other users in the room
      socket.to(roomId).emit("userJoined", {
        user: { socketId, userName },
      });

      console.log(`User ${userName} (${socketId}) joined room ${roomId}`);
    } catch (error) {
      console.error("Join room error:", error);
      socket.emit("error", { message: error.message });
    }
  });

  socket.on("requestLock", async (data) => {
    try {
      const { roomId, userName } = data;
      const socketId = socket.id;

      const lockResponse = await axios.post(
        `${DRAWING_SERVICE_URL}/drawing/${roomId}/lock`,
        {
          socketId,
          userName,
        }
      );

      // Send lock response to requesting user
      socket.emit("lockStatus", {
        isLocked: lockResponse.data.isLocked,
        lockedBy: lockResponse.data.lockedBy,
        lockedByUserName: lockResponse.data.lockedByUserName,
        success: lockResponse.data.success,
      });

      // Broadcast lock status to room if successful
      if (lockResponse.data.success) {
        socket.to(roomId).emit("lockStatus", {
          isLocked: true,
          lockedBy: socketId,
          lockedByUserName: userName,
        });
      }
    } catch (error) {
      console.error("Request lock error:", error);
      socket.emit("error", { message: error.message });
    }
  });

  socket.on("releaseLock", async (data) => {
    try {
      const { roomId } = data;
      const socketId = socket.id;

      await axios.post(`${DRAWING_SERVICE_URL}/drawing/${roomId}/unlock`, {
        socketId,
      });

      // Broadcast lock release to room
      io.to(roomId).emit("lockStatus", {
        isLocked: false,
        lockedBy: null,
        lockedByUserName: null,
      });
    } catch (error) {
      console.error("Release lock error:", error);
      socket.emit("error", { message: error.message });
    }
  });

  socket.on("updateCanvas", async (data) => {
    try {
      const { roomId, updatedElements, canvasColor } = data;
      const socketId = socket.id;

      await axios.post(`${DRAWING_SERVICE_URL}/drawing/${roomId}/canvas`, {
        socketId,
        elements: updatedElements,
        canvasColor,
      });

      // Broadcast canvas update to other users in room
      socket.to(roomId).emit("updateCanvas", {
        updatedElements,
        canvasColor,
        updatedBy: socketId,
      });
    } catch (error) {
      console.error("Update canvas error:", error);
      socket.emit("error", { message: error.message });
    }
  });

  socket.on("sendMessage", async (data) => {
    try {
      const { roomId, message, userName } = data;
      const socketId = socket.id;

      const msgResponse = await axios.post(
        `${CHAT_SERVICE_URL}/chat/${roomId}/messages`,
        {
          socketId,
          message,
          userName,
        }
      );

      // Broadcast message to all users in room (including sender)
      io.to(roomId).emit("getMessage", msgResponse.data.message);
    } catch (error) {
      console.error("Send message error:", error);
      socket.emit("error", { message: error.message });
    }
  });

  socket.on("disconnect", async () => {
    console.log("Socket.IO disconnected:", socket.id);
    const socketId = socket.id;
    const roomId = socket.roomId;

    if (roomId) {
      try {
        // Leave room service
        await axios.post(`${ROOM_SERVICE_URL}/rooms/${roomId}/leave`, {
          socketId,
        });

        // Release any locks
        await axios.post(`${DRAWING_SERVICE_URL}/drawing/${roomId}/unlock`, {
          socketId,
        });

        // Clean up
        clients.delete(socketId);

        // Broadcast user left to room
        socket.to(roomId).emit("userLeft", { socketId });

        // Broadcast lock release in case user had lock
        socket.to(roomId).emit("lockStatus", {
          isLocked: false,
          lockedBy: null,
          lockedByUserName: null,
        });
      } catch (error) {
        console.error("Disconnect cleanup error:", error);
      }
    }
  });
});

// HTTP endpoint for services to notify WebSocket clients
app.post("/notify/:roomId", (req, res) => {
  try {
    const { roomId } = req.params;
    const event = req.body;

    // Broadcast event to all clients in the room using Socket.IO
    io.to(roomId).emit(event.type, event);

    res.json({ success: true });
  } catch (error) {
    console.error("Notification error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "websocket-gateway",
    connections: clients.size,
  });
});

server.listen(PORT, () => {
  console.log(`WebSocket gateway running on port ${PORT}`);
});
