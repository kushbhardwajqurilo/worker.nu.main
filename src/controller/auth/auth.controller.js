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
    { expiresIn: "15m" }
  );
};

const generateRefreshToken = async (user, expire) => {
  console.log("expire", expire);
  const refreshToken = jwt.sign(
    { id: user.admin_id, role: user.role, tenant: user.tenant },
    process.env.SECRET_KEY,
    { expiresIn: expire || "15m" }
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
    }
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
  console.log("pss", hashPass);
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
  sendSuccess(res, "admin add successfully", {}, 200);
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
      expire
    );
    return sendSuccess(
      res,
      "login successfull",
      { accessToken, refreshToken },
      200,
      true
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
      { expiresIn: "15m" } // 15 min
    );

    const newRefreshToken = await generateRefreshToken(
      {
        admin_id: payload.id,
        role: payload.role,
      },
      saved.expireIn
    );

    return sendSuccess(
      res,
      "Token refreshed",
      {
        accessToken,
        refreshToken: newRefreshToken,
      },
      200,
      true
    );
  });
});

// generate forget password URL

exports.generateForgetPasswordURL = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  if (!email || email.trim().length === 0) {
    return next(new AppError("Email required", 400));
  }

  const isEmail = await adminModel.findOne({ email });
  if (!isEmail) {
    return next(new AppError("Email not registered", 400));
  }

  const resetToken = jwt.sign({ id: isEmail._id }, process.env.RESET_PASS_KEY, {
    expiresIn: "5m",
  });

  // FINAL RESET URL (frontend or backend UI)
  const fullURL = `${process.env.BASE_URL}/reset-password?q=${resetToken}`;

  return sendSuccess(res, "URL Sent To Mail", { resetUrl: fullURL }, 200, true);
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
  const { refresh_token } = req.headers;

  // 1. Check refresh token
  if (!refresh_token || refresh_token.trim().length === 0) {
    return next(new AppError("Refresh Token Missing", 400));
  }

  // 2. Check token exists in DB
  const tokenExists = await tokenMode.findOne({ token: refresh_token });

  if (!tokenExists) {
    // Already logged out OR invalid token
    return sendSuccess(res, "Already Logged Out", {}, 200, true);
  }
  // 3. Delete refresh token (invalidate session)
  await tokenMode.deleteOne({ token: refresh_token });
  return sendSuccess(res, "Logout Successfully", {}, 200, true);
});
