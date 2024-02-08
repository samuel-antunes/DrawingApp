import express, { Express, Request, Response } from "express";

const cors = require("cors");

const http = require("http");
const app: Express = express();

type roomContent = {
  messages: string[];
  roomID: string;
};

app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

const rooms: roomContent[] = [];

app.get("/rooms", (req: Request, res: Response) => {
  res.send({ rooms: rooms });
});

const server = http.createServer(app);

import { Server } from "socket.io";

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

type Point = { x: number; y: number };
type DrawLine = {
  prevPoint: Point | null;
  currentPoint: Point;
  color: string;
  roomID: string;
};

io.on("connection", (socket) => {
  console.log(socket.id, " connected");
  socket.on("client-ready", () => {
    socket.broadcast.emit("get-canvas-state");
  });
  socket.on("canvas-state", (state) => {
    socket.broadcast.emit("canvas-state-from-server", state);
  });
  socket.on(
    "draw-line",
    ({ prevPoint, currentPoint, color, roomID }: DrawLine) => {
      socket
        .to(roomID)
        .emit("draw-line", { prevPoint, currentPoint, color, roomID });
    }
  );
  socket.on("clear", () => {
    io.emit("clear");
  });

  socket.on("create-room", (data) => {
    console.log(`${data.username} created room ${data.roomID}`);
    socket.join(data.roomID);
    rooms.push(data.roomID);
  });
  socket.on("join-room", (data) => {
    console.log(`${data.username} joined room ${data.roomID}`);
    socket.join(data.roomID);
    const currRoom = rooms.find((room) => {
      return room == data.roomID;
    });
    if (currRoom) socket.emit("chat-history", currRoom.messages);
  });
  socket.on("send-message", (data) => {
    socket.to(data.roomID).emit("receive-message", data);
    const currRoom = rooms.find((room) => {
      return room == data.roomID;
    });
    if (currRoom) currRoom.messages = [...currRoom.messages, data.message];
  });
});

server.listen(3001, () => {
  console.log("Running on port 3001");
});
