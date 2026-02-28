require("dotenv").config({});
const cluster = require("cluster");
const os = require("os");
const http = require("http");
const { initSocket } = require("./src/socket/socket");

const PORT = process.env.PORT || 8002;
const numCPUs = os.cpus().length;

if (cluster.isPrimary) {
  console.log(`Primary process ${process.pid} running`);

  const connectDB = require("./src/confing/DB");

  // 🔑 FIRST connect DB, THEN start cron
  connectDB()
    .then(() => {
      console.log("DB connected | PRIMARY");

      const startReminder = require("./src/confing/crons/projectReminder");
      startReminder.start(); // agar scheduled:false hai
    })
    .catch((err) => {
      console.error("Primary DB connection failed:", err.message);
      process.exit(1);
    });

  // 🚀 Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on("exit", () => {
    cluster.fork();
  });
} else {
  // ================= WORKERS =================
  const app = require("./app");
  const connectDB = require("./src/confing/DB");
  const server = http.createServer(app);

  const io = initSocket(server);
  app.set("io", io);
  connectDB()
    .then(() => {
      console.log(`DB connected | Worker ${process.pid}`);
      server.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on PORT: ${PORT} | Worker ${process.pid}`);
      });
    })
    .catch((err) => {
      console.error("Worker DB connection failed:", err.message);
      process.exit(1);
    });
}
