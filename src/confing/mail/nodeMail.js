const nodemailder = require("nodemailer");
const mailTransport = nodemailder.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.AppMail,
    pass: process.env.AppPassword,
  },
});
async function SentMail(to, subject, text, html) {
  const mailInformation = await mailTransport.sendMail({
    from: process.env.AppMail,
    to: to,
    subject: subject,
    text,
    html,
  });

  if (mailInformation.accepted.length !== 0) {
    return true;
  } else return false;
}

module.exports = SentMail;
