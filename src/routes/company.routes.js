const {
  addCompanyAlias,
  getSingleCompanyAliasController,
  getAllCompanyAliasController,
  updateCompanyAliasController,
  deleteCompanyAliasController,
  deleteMultipleCompanyAliasController,
  addCompanyController,
  getCompanyDetailController,
} = require("../controller/company/company.controller");
const {
  authMiddeware,
  accessMiddleware,
} = require("../middleware/authMiddleware");
const { uploadDocuments } = require("../middleware/upload.middleware");

const companyRouter = require("express").Router();

companyRouter.post(
  "/add-company",
  authMiddeware,
  accessMiddleware("admin"),
  uploadDocuments,
  addCompanyController,
);
companyRouter.get(
  "/get-company",
  authMiddeware,
  accessMiddleware("admin"),
  getCompanyDetailController,
);

// compay alias routes
companyRouter.post(
  "/add-company-alias",
  authMiddeware,
  accessMiddleware("admin"),
  uploadDocuments,
  addCompanyAlias,
);
companyRouter.get(
  "/get-single-alias",
  authMiddeware,
  accessMiddleware("admin"),
  getSingleCompanyAliasController,
);
companyRouter.get(
  "/get-all-alias",
  authMiddeware,
  accessMiddleware("admin"),
  getAllCompanyAliasController,
);
companyRouter.put(
  "/update-alias",
  authMiddeware,
  accessMiddleware("admin"),
  uploadDocuments,
  updateCompanyAliasController,
);
companyRouter.delete(
  "/delete-single_alias",
  authMiddeware,
  accessMiddleware("admin"),
  deleteCompanyAliasController,
);
companyRouter.delete(
  "/multiple-alias",
  authMiddeware,
  accessMiddleware("admin"),
  deleteMultipleCompanyAliasController,
);
module.exports = companyRouter;
