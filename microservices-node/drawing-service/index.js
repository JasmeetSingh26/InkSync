const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3002;
const WEBSOCKET_GATEWAY_URL =
  process.env.WEBSOCKET_GATEWAY_URL || "http://websocket-gateway:3004";
const LOCK_TIMEOUT = 300000; // 5 minutes

app.use(cors());
app.use(express.json());

// In-memory storage
const canvasData = new Map(); // roomId -> canvas object
const roomLocks = new Map(); // roomId -> lock object

// Notify WebSocket Gateway
async function notifyWebSocket(roomId, event) {
  try {
    await axios.post(`${WEBSOCKET_GATEWAY_URL}/notify/${roomId}`, event);
  } catch (error) {
    console.error("WebSocket notification error:", error);
  }
}

// Clean up expired locks
setInterval(() => {
  const now = Date.now();
  for (const [roomId, lock] of roomLocks.entries()) {
    if (lock.expiresAt <= now) {
      roomLocks.delete(roomId);
      console.log(`Expired lock cleaned up for room: ${roomId}`);
      // Notify about lock release
      notifyWebSocket(roomId, {
        type: "lock-released",
        roomId,
        socketId: lock.socketId,
      });
    }
  }
}, 60000); // Check every minute

// Request drawing lock
app.post("/drawing/:roomId/lock", async (req, res) => {
  try {
    const { roomId } = req.params;
    const { socketId, userName } = req.body;

    const existingLock = roomLocks.get(roomId);

    if (existingLock && existingLock.expiresAt > Date.now()) {
      return res.json({
        success: false,
        isLocked: true,
        lockedBy: existingLock.socketId,
        lockedByUserName: existingLock.userName,
        message: "Canvas is locked by another user",
      });
    }

    const lock = {
      roomId,
      socketId,
      userName,
      lockedAt: Date.now(),
      expiresAt: Date.now() + LOCK_TIMEOUT,
    };

    roomLocks.set(roomId, lock);

    // Notify WebSocket Gateway
    await notifyWebSocket(roomId, {
      type: "lock-acquired",
      roomId,
      socketId,
      userName,
    });

    res.json({
      success: true,
      isLocked: true,
      lockedBy: socketId,
      lockedByUserName: userName,
    });
  } catch (error) {
    console.error("Lock request error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Release drawing lock
app.post("/drawing/:roomId/unlock", async (req, res) => {
  try {
    const { roomId } = req.params;
    const { socketId } = req.body;

    const existingLock = roomLocks.get(roomId);

    if (!existingLock) {
      return res.json({ success: false, message: "No lock exists" });
    }

    if (existingLock.socketId !== socketId) {
      return res.json({ success: false, message: "You do not own this lock" });
    }

    roomLocks.delete(roomId);

    // Notify WebSocket Gateway
    await notifyWebSocket(roomId, {
      type: "lock-released",
      roomId,
      socketId,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Unlock error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update canvas
app.post("/drawing/:roomId/canvas", async (req, res) => {
  try {
    const { roomId } = req.params;
    const { socketId, elements, canvasColor } = req.body;

    const canvas = {
      roomId,
      elements: elements || [],
      canvasColor: canvasColor || "#ffffff",
      lastUpdated: Date.now(),
      updatedBy: socketId,
    };

    canvasData.set(roomId, canvas);

    // Notify WebSocket Gateway
    await notifyWebSocket(roomId, {
      type: "canvas-updated",
      roomId,
      socketId,
      elements,
      canvasColor,
    });

    res.json({ success: true, canvas });
  } catch (error) {
    console.error("Canvas update error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get canvas
app.get("/drawing/:roomId/canvas", (req, res) => {
  try {
    const { roomId } = req.params;
    const canvas = canvasData.get(roomId) || {
      roomId,
      elements: [],
      canvasColor: "#ffffff",
    };
    res.json({ success: true, canvas });
  } catch (error) {
    console.error("Get canvas error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get lock status
app.get("/drawing/:roomId/lock", (req, res) => {
  try {
    const { roomId } = req.params;
    const lock = roomLocks.get(roomId);

    if (!lock || lock.expiresAt <= Date.now()) {
      // Clean up expired lock
      if (lock) roomLocks.delete(roomId);
      return res.json({ success: true, isLocked: false });
    }

    res.json({
      success: true,
      isLocked: true,
      lockedBy: lock.socketId,
      lockedByUserName: lock.userName,
      lockedAt: lock.lockedAt,
    });
  } catch (error) {
    console.error("Get lock status error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "drawing-service",
    canvases: canvasData.size,
    activeLocks: roomLocks.size,
  });
});

app.listen(PORT, () => {
  console.log(`Drawing service running on port ${PORT}`);
});
