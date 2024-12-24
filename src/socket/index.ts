// message.ts
import { Server as HttpServer } from "http";
import { Server } from "socket.io";

import { createMiddleware } from "hono/factory";
import { RemoveMessInput, SendMessage } from "@/routes/chat/chat.input";
import { removeMessage, sendMessage } from "@/routes/chat/chat.service";
import { updateLastSeen, updateUser } from "@/routes/user/user.service";
import { DmInput } from "@/routes/dm/dm.input";
import { createChatPersonal } from "@/routes/dm/dm.service";

let io: Server;
const online: string[] = [];
export function initWebsocket(server: any) {
  io = new Server(server as HttpServer, {
    serveClient: false,
    cors: {
      origin: "*",
    },
  });

  io.on("error", (err) => {
    console.log(err);
  });

  io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId as string;
    if (!online.includes(userId)) {
      online.push(userId);
    }

    console.log({
      message: userId + "has log in",
      online,
    });

    socket.on("chat message", (msg) => {
      console.log(msg);
      io.emit("chat message", msg);
    });

    io.emit("getOnlineUsers", online);

    socket.on("join group", (chatId) => {
      socket.join(chatId);
      console.log(`${userId} has joined the group ${chatId}`);
    });

    socket.on("typing", (message) => {
      console.log(message);
    });

    socket.on("sendMessage", async (message: SendMessage) => {
      const result = await sendMessage(message);
      io.to(message.chatId).emit("sendMessage", result);
    });

    socket.on("remove-message", async (message: RemoveMessInput) => {
      const result = await removeMessage(message);
      io.to(message.chatId).emit("remove-message", result);
    });

    socket.join(userId);
    socket.on("sendDm", async (message: DmInput) => {
      const result = await createChatPersonal(message);
      io.emit("sendDm", result);
    });

    socket.on("disconnect", async () => {
      await updateLastSeen({ id: userId });
      const index = online.indexOf(userId);
      if (index !== -1) {
        online.splice(index, 1);
      }

      io.emit("getOnlineUsers", online);

      console.log(`${userId} has logout ,online : ${online}`);
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
