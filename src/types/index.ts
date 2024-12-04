import { Server } from "socket.io";

export type Env = {
  Variables: {
    io: Server;
  };
  Bindings: {};
};
