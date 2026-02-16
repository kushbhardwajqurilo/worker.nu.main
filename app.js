require("dotenv").config({});
const express = require("express");
const app = express();
const cors = require("cors");
const { errorHandle } = require("./src/utils/errorHandler");
const authRouter = require("./src/routes/auth.routes");
const workerRouter = require("./src/routes/worker.routes");
const clientRouter = require("./src/routes/client.routes");
const path = require("path");
const fs = require("fs");
const morgan = require("morgan");
const jwt = require("jsonwebtoken");
const {
  authMiddeware,
  accessMiddleware,
} = require("./src/middleware/authMiddleware");
const { getPresignedUrl } = require("./src/confing/cloudinaryConfig");
const hoursRouter = require("./src/routes/hours.routes");
const projectRouter = require("./src/routes/project.routes");
const companyRouter = require("./src/routes/company.routes");
const settingsRouter = require("./src/routes/settings.routes");

const ExcelJS = require("exceljs");
const adminRouter = require("./src/routes/admin.route");
const clientDashboardRouter = require("./src/routes/client.dashboard.route");
const notificationRouter = require("./src/routes/notification.route");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://ql3cm80q-3000.inc1.devtunnels.ms",
  "http://localhost:8002",
  "https://4frnn03l-8002.inc1.devtunnels.ms",
  "https://worker-mawz.vercel.app",
  "https://api.project1222.com",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "Tenant-Id"],
  }),
);
const logDirectory = path.join(__dirname, "public");

// ensure public folder exists
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory);
}

// create write stream
const accessLogStream = fs.createWriteStream(
  path.join(logDirectory, "access.log"),
  { flags: "a" }, // append mode
);

// use morgan middleware
app.use(
  morgan(":remote-addr :method :url :status :response-time ms :date[iso]", {
    stream: accessLogStream,
  }),
);

// Test route
app.use("/public", express.static(path.join(__dirname, "../public")));
app.use("/uploads", express.static(path.join(__dirname, "public/upload")));
const baseUrl = "/api/v1/";
app.get("/", (req, res) => {
  res.send("<h1>Server running</h1>");
});
// Global error handler
app.get("/reset-password", (req, res) => {
  const token = req.query.q;

  if (!token) return res.status(400).send("<h2>Invalid reset link</h2>");
  try {
    // Verify token
    jwt.verify(token, process.env.RESET_PASS_KEY);

    // Valid → Serve HTML page
    return res.sendFile(
      path.join(__dirname, "src/templates", "forgetPassword.html"),
    );
  } catch (err) {
    // Expired → Show error
    return res.sendFile(
      path.join(__dirname, "src/templates", "resetExpired.html"),
    );
  }
});

app.use(`${baseUrl}admin`, adminRouter);
app.use(`${baseUrl}auth`, authRouter); //auth route
app.use(`${baseUrl}worker`, workerRouter); // worker route
app.use(`${baseUrl}client`, clientRouter); // client route
app.use(`${baseUrl}client-dashboard`, clientDashboardRouter);
app.use(`${baseUrl}hours`, hoursRouter); // hours route
app.use(`${baseUrl}project`, projectRouter); // project route
app.use(`${baseUrl}company`, companyRouter); // company router
app.use(`${baseUrl}settings`, settingsRouter); // company router
app.use(`${baseUrl}notification`, notificationRouter); // notifcation router

app.use(errorHandle);
module.exports = app;
