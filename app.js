require("dotenv").config({});
const express = require("express");
const app = express();
const cors = require("cors");
const { errorHandle } = require("./src/utils/errorHandler");
const authRouter = require("./src/routes/auth.routes");
const workerRouter = require("./src/routes/worker.routes");
const clientRouter = require("./src/routes/client.routes");
const path = require("path");
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
  "https://yourdomain.com",
  "https://admin.yourdomain.com",
  "https://ql3cm80q-3000.inc1.devtunnels.ms",
  "http://localhost:8002",
  "https://4frnn03l-8002.inc1.devtunnels.ms",
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
// console.log(
//   "paht",
//   path.join(__dirname, "src/templates", "forgetPassword.html")
// );
// Test route
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
app.get("/worker", (req, res) => {
  const { w_id } = req.query;

  if (!w_id) {
    return res.status(400).send("Worker ID missing");
  }

  res.sendFile(path.join(__dirname, "src/templates", "worker.html"));
});
app.get("/file", (req, res) => {
  res.sendFile(path.join(__dirname, "src/templates", "fileUploadTest.html"));
});
app.get("/client", (req, res) => {
  res.sendFile(path.join(__dirname, "src/templates", "signature-ui.html"));
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

app.get("/download-hours-report", async (req, res) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Hours");

  // -----------------------------
  // HEADER TOP BLUE SECTION
  // -----------------------------
  sheet.mergeCells("A1:U2");
  const header = sheet.getCell("A1");
  header.value =
    "HERE IS HOURS FOR EACH EMPLOYEE FOR EVERY DAY THAT THEY WORKED \n WITH THIS PROJECT (NO SIGNATURE) ";
  header.alignment = {
    vertical: "middle",
    horizontal: "center",
    wrapText: true,
  };
  header.font = { bold: true, color: { argb: "FFFF0000" }, size: 16 };
  header.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1F4E78" },
  };

  // -----------------------------
  // DATE ROW (16,17,18,...)
  // -----------------------------
  const dates = [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 1];
  sheet.addRow(["", "", ...dates]);

  // -----------------------------
  // DAY ROW (T, W, T,...)
  // -----------------------------
  const days = [
    "T",
    "W",
    "T",
    "F",
    "S",
    "S",
    "M",
    "T",
    "W",
    "T",
    "F",
    "S",
    "S",
    "M",
    "T",
    "W",
  ];
  sheet.addRow(["", "", ...days]);

  // -----------------------------
  // EMPLOYEE HOURS (DYNAMIC)
  // -----------------------------
  const employees = [
    {
      name: "Employee 1",
      hours: [
        10,
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "10.02",
        "",
        "",
        "",
        "",
        "",
        "",
      ],
      total: 10,
    },
    {
      name: "Employee 2",
      hours: ["", "", "", "", "", "", 10, 10, 10, 10, "", "", "", "", "", ""],
      total: 40,
    },
  ];

  employees.forEach((emp) => {
    sheet.addRow([emp.name, "", ...emp.hours, emp.total]);
  });

  // Styling borders for all cells
  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      cell.alignment = { horizontal: "center" };
    });
  });

  // Send file
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=hours_report.xlsx",
  );

  await workbook.xlsx.write(res);
  res.end();
});
app.get("/excel", (req, res) => {
  res.sendFile(path.join(__dirname, "/src/templates", "excel.html"));
});

app.get("/time-sheet", (req, res) => {
  res.sendFile(path.join(__dirname, "/src/templates", "weeklyTimeSheet.html"));
});
app.use(errorHandle);
module.exports = app;
