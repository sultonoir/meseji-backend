import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { dino } from "./routes/dino/dino.route";
import { Env } from "./types";
import { html } from "hono/html";

import ioMiddleware, { initWebsocket } from "./socket";

const app = new Hono<Env>();

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
export const server = serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`Server is running: http://localhost:${info.port}`);
  }
);

initWebsocket(server);

app.use(cors()).use(logger()).use(ioMiddleware);
app
  .get("/", (c) => {
    return c.html(
      html`<html>
        <head>
          <title>Socket.IO chat</title>
          <style>
            body {
              margin: 0;
              padding-bottom: 3rem;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
                Helvetica, Arial, sans-serif;
            }
            #form {
              background: rgba(0, 0, 0, 0.15);
              padding: 0.25rem;
              position: fixed;
              bottom: 0;
              left: 0;
              right: 0;
              display: flex;
              height: 3rem;
              box-sizing: border-box;
              backdrop-filter: blur(10px);
            }
            #input {
              border: none;
              padding: 0 1rem;
              flex-grow: 1;
              border-radius: 2rem;
              margin: 0.25rem;
            }
            #input:focus {
              outline: none;
            }
            #form > button {
              background: #333;
              border: none;
              padding: 0 1rem;
              margin: 0.25rem;
              border-radius: 3px;
              outline: none;
              color: #fff;
            }
            #messages {
              list-style-type: none;
              margin: 0;
              padding: 0;
            }
            #messages > li {
              padding: 0.5rem 1rem;
            }
            #messages > li:nth-child(odd) {
              background: #efefef;
            }
          </style>
        </head>
        <body>
          <ul id="messages"></ul>
          <form
            id="form"
            action="">
            <input
              id="input"
              autocomplete="off" /><button>Send</button>
          </form>
          <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
          <script>
            var socket = io();
            var messages = document.getElementById("messages");
            var form = document.getElementById("form");
            var input = document.getElementById("input");
            form.addEventListener("submit", function (e) {
              e.preventDefault();
              if (input.value) {
                socket.emit("chat message", input.value);
                input.value = "";
              }
            });
            socket.on("chat message", function (msg) {
              var item = document.createElement("li");
              item.textContent = msg;
              messages.appendChild(item);
              window.scrollTo(0, document.body.scrollHeight);
            });
          </script>
        </body>
      </html>`
    );
  })
  .route("/", dino);
