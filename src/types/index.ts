import { Server } from "socket.io";

export type Session = {
  id: string;
  name: string;
  username: string;
  image: string;
};

export type Env = {
  Variables: {
    io: Server;
    user: Session;
  };
  Bindings: {
    JWT_SECRET: string;
  };
};
