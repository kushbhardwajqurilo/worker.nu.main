require("dotenv").config({});
const express = require("express");
const app = express();
const cors = require("cors");
const { errorHandle } = require("./src/utils/errorHandler");
const authRouter = require("./src/routes/authRoutes");
const workerRouter = require("./src/routes/workerRoutes");
const clientRouter = require("./src/routes/clientRouter");
const path = require("path");
const jwt = require("jsonwebtoken");
const {
  authMiddeware,
  accessMiddleware,
} = require("./src/middleware/authMiddleware");
const { getPresignedUrl } = require("./src/confing/cloudinaryConfig");
const hoursRouter = require("./src/routes/hoursRouter");
const projectRouter = require("./src/routes/project.routes");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors("*"));
// console.log(
//   "paht",
//   path.join(__dirname, "src/templates", "forgetPassword.html")
// );
// Test route
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
      path.join(__dirname, "src/templates", "forgetPassword.html")
    );
  } catch (err) {
    // Expired → Show error
    return res.sendFile(
      path.join(__dirname, "src/templates", "resetExpired.html")
    );
  }
});
app.get("/worker", (req, res) => {
  const { w_id } = req.query;

  if (!w_id) {
    return res.status(400).send("Worker ID missing");
  }

  res.sendFile(path.join(__dirname, "src/templates", "worker.html"));
});

app.use(`${baseUrl}auth`, authRouter); //auth route
app.use(`${baseUrl}worker`, workerRouter); // worker route
app.use(`${baseUrl}client`, clientRouter); // client route
app.use(`${baseUrl}hours`, hoursRouter); // hours route
app.use(`${baseUrl}project`, projectRouter); // project route

app.use(errorHandle);
module.exports = app;
