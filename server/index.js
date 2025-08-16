const express = require("express");
const cors = require("cors");
const http = require("http");
const app = express();
let dotenv = require("dotenv");
dotenv.config();

const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.use(cors());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

app.get("/", (req, res) => {
  res.send("hello");
});

let rooms = [];
const Port = process.env.PORT || 4000;

io.on("connection", (socket) => {
  console.log("a user connected");
  // Join Room
  socket.on("joinRoom", (data) => {
    console.log("joined room", data.roomId);
    socket.join(data.roomId);
    const elements = rooms.find((element) => element.roomId === data.roomId);
    if (elements) {
      // uppdate the new user with the current canvas
      io.to(socket.id).emit("updateCanvas", elements);
      elements.user = [...elements.user, socket.id];
      // Send current lock status to new user
      io.to(socket.id).emit("lockStatus", {
        isLocked: elements.isLocked || false,
        lockedBy: elements.lockedBy || null,
        lockedByUserName: elements.lockedByUserName || null,
      });
    } else {
      rooms.push({
        roomId: data.roomId,
        updatedElements: [],
        user: [socket.id],
        canvasColor: "#121212",
        isLocked: false,
        lockedBy: null,
        lockedByUserName: null,
      });
    }
  });

  // Request lock for drawing
  socket.on("requestLock", (data) => {
    const room = rooms.find((element) => element.roomId === data.roomId);
    if (room && !room.isLocked) {
      room.isLocked = true;
      room.lockedBy = socket.id;
      room.lockedByUserName = data.userName;

      // Notify all users in the room about the lock
      io.to(data.roomId).emit("lockStatus", {
        isLocked: true,
        lockedBy: socket.id,
        lockedByUserName: data.userName,
      });
    } else if (room && room.isLocked) {
      // Lock is already taken, notify the requesting user
      io.to(socket.id).emit("lockStatus", {
        isLocked: true,
        lockedBy: room.lockedBy,
        lockedByUserName: room.lockedByUserName,
      });
    }
  });

  // Release lock when drawing stops
  socket.on("releaseLock", (data) => {
    const room = rooms.find((element) => element.roomId === data.roomId);
    if (room && room.lockedBy === socket.id) {
      room.isLocked = false;
      room.lockedBy = null;
      room.lockedByUserName = null;

      // Notify all users in the room that lock is released
      io.to(data.roomId).emit("lockStatus", {
        isLocked: false,
        lockedBy: null,
        lockedByUserName: null,
      });
    }
  });

  // update the canvas
  socket.on("updateCanvas", (data) => {
    // Check if the user has the lock before allowing canvas update
    const room = rooms.find((element) => element.roomId === data.roomId);
    if (room && room.isLocked && room.lockedBy !== socket.id) {
      // User doesn't have the lock, reject the update
      io.to(socket.id).emit("lockStatus", {
        isLocked: true,
        lockedBy: room.lockedBy,
        lockedByUserName: room.lockedByUserName,
      });
      return;
    }

    // Broadcast the updated elements to all connected clients
    socket.to(data.roomId).emit("updateCanvas", data);
    if (room) {
      room.updatedElements = data.updatedElements;
      room.canvasColor = data.canvasColor;
    }
  });

  // send message
  socket.on("sendMessage", (data) => {
    // Broadcast the message to all clients in the room (including sender)
    io.to(data.roomId).emit("getMessage", data);
  });

  // ping server every 2 min to prevent render server from sleeping
  socket.on("pong", () => {
    setTimeout(() => {
      socket.emit("ping");
    }, 120000);
  });

  //clear elements when no one is in the room
  socket.on("disconnect", () => {
    rooms.forEach((element) => {
      element.user = element.user.filter((user) => user !== socket.id);
      // If the user who had the lock disconnects, release the lock
      if (element.lockedBy === socket.id) {
        element.isLocked = false;
        element.lockedBy = null;
        element.lockedByUserName = null;
        // Notify remaining users that lock is released
        io.to(element.roomId).emit("lockStatus", {
          isLocked: false,
          lockedBy: null,
          lockedByUserName: null,
        });
      }
      if (element.user.length === 0) {
        rooms = rooms.filter((room) => room.roomId !== element.roomId);
      }
    });
    // console.log(rooms);
  });
});

server.listen(Port, () => {
  console.log(`listening on *:${Port}`);
});
