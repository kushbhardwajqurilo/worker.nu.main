const {
  adminSignup,
  adminLogin,
  adminForgetPasswordController,
  refreshToken,
  generateForgetPasswordURL,
} = require("../controller/auth/auth.controller");

const authRouter = require("express").Router();
authRouter.post("/admin-signup", adminSignup);
authRouter.post("/admin-login", adminLogin);
authRouter.post("/refresh-token", refreshToken);
authRouter.get("/get-reset-url", generateForgetPasswordURL);
authRouter.patch("/forget-password", adminForgetPasswordController);
module.exports = authRouter;
