const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const generateTimesheetPDF = async (html) => {
  const uploadDir = path.join(process.cwd(), "public/upload");

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const fileName = `weekly_timesheet_${Date.now()}.pdf`;
  const filePath = path.join(uploadDir, fileName);

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });

  await page.pdf({
    path: filePath, // 🔥 SAVE TO DISK
    format: "A4",
    printBackground: true,
  });

  await browser.close();

  // 🔥 return PUBLIC DOWNLOAD URL
  return `/upload/${fileName}`;
};

module.exports = generateTimesheetPDF;
