// message.ts
import { Server as HttpServer } from "http";
import { Server } from "socket.io";

import { createMiddleware } from "hono/factory";

let io: Server;

export function initWebsocket(server: any) {
  io = new Server(server as HttpServer, {
    serveClient: false,
  });

  io.on("error", (err) => {
    console.log(err);
  });

  io.on("connection", (socket) => {
    console.log(`${socket.id}: connected`);
    socket.on("chat message", (msg) => {
      io.emit("chat message", msg);
    });
  });
}

const ioMiddleware = createMiddleware<{
  Variables: {
    io: Server;
  };
}>(async (c, next) => {
  if (!c.var.io && io) {
    c.set("io", io);
  }
  await next();
});

export default ioMiddleware;
