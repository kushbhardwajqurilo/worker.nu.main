const jwt = require("jsonwebtoken");
const adminModel = require("../../models/authmodel/adminModel");
const { hashPassword, comaparePassword } = require("../../utils/encryptPass");
const {
  catchAsync,
  AppError,
  errorHandle,
  sendSuccess,
} = require("../../utils/errorHandler");
const tokenMode = require("../../models/authmodel/tokenMode");
const { generateCustomUUID } = require("custom-uuid-generator");
const SentMail = require("../../confing/mail/nodeMail");

// access and referesh tokens
const generateAcessToken = (data) => {
  return jwt.sign(
    {
      id: data.admin_id,
      role: data.role,
      name: data.name,
      tenant: data.tenant,
    },
    process.env.ACCESS_TOKEN_KEY,
    { expiresIn: "30min" },
  );
};

const generateRefreshToken = async (user, expire) => {
  const refreshToken = jwt.sign(
    { id: user.admin_id, role: user.role, tenant: user.tenant },
    process.env.SECRET_KEY,
    { expiresIn: expire || "30m" },
  );

  // 🔥 One user = one document (UPSERT)
  await tokenMode.findOneAndUpdate(
    { userId: user.admin_id },
    {
      token: refreshToken,
      expireIn: expire,
    },
    {
      upsert: true, // create if not exists
      new: true,
      setDefaultsOnInsert: true,
    },
  );

  return refreshToken;
};

// admin signup

exports.adminSignup = catchAsync(async (req, res, next) => {
  const {
    company_name,
    phone,
    company_people,
    email,
    password,
    name,
    language,
  } = req.body;
  if (!email || email.trim().length === 0) {
    return next(new AppError("Email Required", 400));
  }
  if (!password || password.trim().length === 0) {
    return next(new AppError("Password Required", 400));
  }
  if (!name || name.length === 0) {
    return next(new AppError("name Required", 400));
  }
  const hashPass = await hashPassword(password);
  const payload = {
    email: email.trim().toLowerCase(),
    tenantId: generateCustomUUID(),
    password: hashPass.trim(),
    name: name.trim().toLowerCase(),
    company_name: company_name.trim(),
    phone: phone.trim(),
    company_people: company_people.trim(),
    language: language.trim(),
    role: "admin",
  };
  const admin = await adminModel.create(payload);
  if (!admin) {
    return next(new AppError("Failed to add admin", 400));
  }
  const rememberme = true;
  const expire = rememberme ? "30d" : "7d";
  const accessToken = generateAcessToken({
    admin_id: admin._id,
    tenant: admin.tenantId,
    role: "admin",
    name: admin.name,
  });
  const refreshToken = await generateRefreshToken(
    {
      admin_id: admin._id,
      tenant: admin.tenantId,
      role: "admin",
    },
    expire,
  );
  sendSuccess(
    res,
    "admin add successfully",
    { accessToken, refreshToken },
    200,
  );
});

// admin signup end

// admin login start

exports.adminLogin = catchAsync(async (req, res, next) => {
  if (!req.body || req.body.toString().trim().length === 0) {
    return next(new AppError("login credentials require"));
  }
  const { email, password, rememberme } = req.body;
  if (!email || email.trim().length === 0) {
    return next(new AppError("Email required", 400));
  }
  // email validation formate
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return next(new AppError("Invalid Email Formate", 400));
  }
  if (!password || password.trim().length === 0) {
    return next(new AppError("Password Required", 400));
  }

  const isAdmin = await adminModel.findOne({ email });
  if (!isAdmin) {
    return next(new AppError("Invalid Admin Email"));
  }
  if (await comaparePassword(password, isAdmin.password)) {
    // const token = await jwt.sign(
    //   { id: isAdmin._id, role: "admin" },
    //   process.env.SECRET_KEY,
    //   { expiresIn: "7d" }
    // );
    // console.log("resone", isAdmin);
    const expire = rememberme ? "30d" : "7d";
    const accessToken = generateAcessToken({
      admin_id: isAdmin._id,
      tenant: isAdmin.tenantId,
      role: "admin",
      name: isAdmin.name,
    });
    const refreshToken = await generateRefreshToken(
      {
        admin_id: isAdmin._id,
        tenant: isAdmin.tenantId,
        role: "admin",
      },
      expire,
    );
    return sendSuccess(
      res,
      "login successfull",
      { accessToken, refreshToken },
      200,
      true,
    );
  } else {
    return next(new AppError("Invalid password", 400));
  }
});

// admin login end here

// get refresh token
exports.refreshToken = catchAsync(async (req, res, next) => {
  const { refresh_token } = req.body;
  if (!refresh_token) {
    return next(new AppError("Refresh Token Missing", 400));
  }
  const tenant = jwt.decode(refresh_token);

  const saved = await tokenMode.findOne({ userId: tenant.id });

  // console.log("saved", saved);
  if (!saved) {
    return next(new AppError("Invalid Refresh Token", 403));
  }

  jwt.verify(refresh_token, process.env.SECRET_KEY, async (err, payload) => {
    const tenantData = await adminModel.findOne({ _id: payload.id });
    const accessToken = jwt.sign(
      { id: payload.id, role: payload.role, tenant: tenantData.tenantId },
      process.env.ACCESS_TOKEN_KEY,
      { expiresIn: "15m" }, // 15 min
    );

    const newRefreshToken = await generateRefreshToken(
      {
        admin_id: payload.id,
        role: payload.role,
      },
      saved.expireIn,
    );

    return sendSuccess(
      res,
      "Token refreshed",
      {
        accessToken,
        refreshToken: newRefreshToken,
      },
      200,
      true,
    );
  });
});

// generate forget password URL

exports.generateForgetPasswordURL = catchAsync(async (req, res, next) => {
  const { tenantId } = req;
  if (!tenantId || tenantId.trim().length === 0) {
    return next(new AppError("Email required", 400));
  }

  const isEmail = await adminModel.findOne({ tenantId });
  if (!isEmail) {
    return next(new AppError("Invalid Tenant", 400));
  }

  const resetToken = jwt.sign({ id: isEmail._id }, process.env.RESET_PASS_KEY, {
    expiresIn: "5m",
  });

  // FINAL RESET URL (frontend or backend UI)
  const fullURL = `https://4frnn03l-8002.inc1.devtunnels.ms/reset-password?q=${resetToken}`;
  const sent = await SentMail(
    isEmail.email,
    "Reset Password",
    "Worker.nu",
    ` <html>
  <head>
    <style>
      body {
        margin: 0;
        padding: 0;
        background-color: #f4f6f8;
        font-family: Arial, Helvetica, sans-serif;
      }
      .container {
        max-width: 600px;
        margin: 40px auto;
        background: #ffffff;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
      }
      .header {
        background: #2563eb;
        color: #ffffff;
        padding: 20px;
        text-align: center;
        font-size: 22px;
        font-weight: bold;
      }
      .content {
        padding: 30px;
        color: #333333;
        font-size: 15px;
        line-height: 1.6;
      }
      .btn {
        display: inline-block;
        margin: 25px 0;
        padding: 12px 28px;
        background: #2563eb;
        color: #ffffff !important;
        text-decoration: none;
        border-radius: 6px;
        font-size: 16px;
        font-weight: bold;
      }
      .footer {
        background: #f1f5f9;
        padding: 15px;
        text-align: center;
        font-size: 13px;
        color: #666666;
      }
      .note {
        font-size: 13px;
        color: #777777;
        margin-top: 15px;
      }
    </style>
  </head>

  <body>
    <div class="container">
      <div class="header">
        Reset Your Password
      </div>

      <div class="content">
        <p>Hello,</p>

        <p>
          Hi ${isEmail.name}, We received a request to reset the password for your account.
          If you made this request, please click the button below to set a new password.
        </p>

        <p style="text-align: center;">
          <a href=${fullURL} class="btn">
            Reset Password
          </a>
        </p>

        <p class="note">
          This password reset link is valid for the next <strong>5 minutes</strong>.
          If you did not request a password reset, please ignore this email.
        </p>

        <p>
          Best regards,<br />
          <strong>Worker.nu Team</strong>
        </p>
      </div>

      <div class="footer">
        © Worker.nu. All rights reserved.
      </div>
    </div>
  </body>
</html>

    `,
  );
  return sendSuccess(
    res,
    "URL Sent To Mail",
    `A password reset link has been sent to ${isEmail.email}`,
    200,
    true,
  );
});

// end generate forget passowrd url

// forget password

exports.adminForgetPasswordController = catchAsync(async (req, res, next) => {
  if (!req.body || req.body.toString().trim().length === 0) {
    return next(new AppError("Admin  Credentials Missing"));
  }
  const { email, password } = req.body;
  if (!email || email.toString().trim().length === 0) {
    return next(new AppError("email required", 400));
  }
  if (!password || password.trim().length === 0) {
    return next(new AppError("password missing", 400));
  }

  const isAdmin = await adminModel.findOne({ email });
  if (!isAdmin) {
    return next(new AppError("Invalid Email"));
  }
  isAdmin.password = await hashPassword(password);
  isAdmin.name = isAdmin.name;
  isAdmin.email = email;
  isAdmin.company_name = isAdmin.company_name;
  isAdmin.company_people = isAdmin.company_people;
  isAdmin.language = isAdmin.language;
  isAdmin.phone = isAdmin.phone;
  const x = await isAdmin.save();
  return sendSuccess(res, "Password Update", {}, 201, true);
});

// forget password end

// admin logout

exports.adminLogoutController = catchAsync(async (req, res, next) => {
  const { admin_id } = req;

  // 1. Check refresh token
  if (!admin_id || admin_id.trim().length === 0) {
    return next(new AppError("Refresh Token Missing", 400));
  }

  // 2. Check token exists in DB
  const tokenExists = await tokenMode.findOne({ userId: admin_id });

  if (!tokenExists) {
    // Already logged out OR invalid token
    return sendSuccess(res, "Already Logged Out", {}, 200, true);
  }
  // 3. Delete refresh token (invalidate session)
  await tokenMode.deleteOne({ userId: admin_id });
  return sendSuccess(res, "Logout Successfully", {}, 200, true);
});

exports.adminForgetPasswordManual = catchAsync(async (req, res, nexg) => {
  let { email } = req.body;

  if (!email) {
    return next(new AppError("Email Required", 400));
  }
  email = email.trim();
  const isEmail = await adminModel.findOne({ email });
  const resetToken = jwt.sign({ id: isEmail._id }, process.env.RESET_PASS_KEY, {
    expiresIn: "5m",
  });

  // FINAL RESET URL (frontend or backend UI)
  const fullURL = `https://4frnn03l-8002.inc1.devtunnels.ms/reset-password?q=${resetToken}`;
  const sent = await SentMail(
    isEmail.email,
    "Reset Password",
    "Worker.nu",
    ` <html>
  <head>
    <style>
      body {
        margin: 0;
        padding: 0;
        background-color: #f4f6f8;
        font-family: Arial, Helvetica, sans-serif;
      }
      .container {
        max-width: 600px;
        margin: 40px auto;
        background: #ffffff;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
      }
      .header {
        background: #2563eb;
        color: #ffffff;
        padding: 20px;
        text-align: center;
        font-size: 22px;
        font-weight: bold;
      }
      .content {
        padding: 30px;
        color: #333333;
        font-size: 15px;
        line-height: 1.6;
      }
      .btn {
        display: inline-block;
        margin: 25px 0;
        padding: 12px 28px;
        background: #2563eb;
        color: #ffffff !important;
        text-decoration: none;
        border-radius: 6px;
        font-size: 16px;
        font-weight: bold;
      }
      .footer {
        background: #f1f5f9;
        padding: 15px;
        text-align: center;
        font-size: 13px;
        color: #666666;
      }
      .note {
        font-size: 13px;
        color: #777777;
        margin-top: 15px;
      }
    </style>
  </head>

  <body>
    <div class="container">
      <div class="header">
        Reset Your Password
      </div>

      <div class="content">
        <p>Hello,</p>

        <p>
          Hi ${isEmail.name} We received a request to reset the password for your account.
          If you made this request, please click the button below to set a new password.
        </p>

        <p style="text-align: center;">
          <a href=${fullURL} class="btn">
            Reset Password
          </a>
        </p>

        <p class="note">
          This password reset link is valid for the next <strong>5 minutes</strong>.
          If you did not request a password reset, please ignore this email.
        </p>

        <p>
          Best regards,<br />
          <strong>Worker.nu Team</strong>
        </p>
      </div>

      <div class="footer">
        © Worker.nu. All rights reserved.
      </div>
    </div>
  </body>
</html>

    `,
  );
  console.log("se", sent);
  return sendSuccess(
    res,
    "URL Sent To Mail",
    `A password reset link has been sent to ${isEmail.email}`,
    200,
    true,
  );
});
