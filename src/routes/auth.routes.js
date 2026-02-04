const {
  adminSignup,
  adminLogin,
  adminForgetPasswordController,
  refreshToken,
  generateForgetPasswordURL,
  adminLogoutController,
  adminForgetPasswordManual,
} = require("../controller/auth/auth.controller");
const {
  authMiddeware,
  accessMiddleware,
} = require("../middleware/authMiddleware");

const authRouter = require("express").Router();
authRouter.post("/admin-signup", adminSignup);
authRouter.post("/login", adminLogin);
authRouter.post("/refresh-token", refreshToken);
authRouter.get(
  "/get-reset-url",
  authMiddeware,
  accessMiddleware("admin"),
  generateForgetPasswordURL,
);
authRouter.patch("/forget-password", adminForgetPasswordController);
authRouter.get(
  "/logout",
  authMiddeware,
  accessMiddleware("admin"),
  adminLogoutController,
);

authRouter.post("/reset-manual", adminForgetPasswordManual);
module.exports = authRouter;
