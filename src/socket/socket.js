require("dotenv").config();
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: [
        "https://ql3cm80q-3000.inc1.devtunnels.ms",
        "http://localhost:3000",
        "https://worker.mawz.vercel.app",
      ],
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Authentication
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Token Missing"));
    }

    try {
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_KEY);

      socket.user = {
        id: decoded.id || decoded.admin_id,
        role: decoded.role,
      };

      return next();
    } catch (err) {
      try {
        const workerDecoded = jwt.verify(token, process.env.WORKER_KEY);

        socket.user = {
          id: workerDecoded.worker_id,
          role: workerDecoded.role,
        };

        return next();
      } catch (err2) {
        return next(new Error("Invalid Signature"));
      }
    }
  });

  io.on("connection", (socket) => {
    if (!socket.user) return;
    const userId = socket.user.id;
    const role = socket.user.role;
    socket.join(`user_${userId}`);
    socket.on("disconnect", (reason) => {
      if (socket.user.role === "admin") {
        console.log("Admin disconnected:", socket.userId);
      }

      if (socket.user.role === "worker") {
        console.log("Worker disconnected:", socket.userId);
      }
    });
  });

  return io;
};

module.exports = initSocket;
