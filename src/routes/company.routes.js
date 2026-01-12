const {
  addCompanyController,
  updateCompanyController,
  getCompanyDetailController,
  addCompanyAlias,
  getSingleCompanyAliasController,
  getAllCompanyAliasController,
  updateCompanyAliasController,
  deleteCompanyAliasController,
  deleteMultipleCompanyAliasController,
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
  addCompanyController
);
companyRouter.put(
  "/update-company",
  authMiddeware,
  accessMiddleware("admin"),
  uploadDocuments,
  updateCompanyController
);
companyRouter.get("/get-company", getCompanyDetailController);

// compay alias routes
companyRouter.post(
  "/add-company-alias",
  authMiddeware,
  accessMiddleware("admin"),
  uploadDocuments,
  addCompanyAlias
);
companyRouter.get("/get-single-alias", getSingleCompanyAliasController);
companyRouter.get("/get-all-alias", getAllCompanyAliasController);
companyRouter.put("/update-alias", updateCompanyAliasController);
companyRouter.delete("/delete-single_alias", deleteCompanyAliasController);
companyRouter.delete("/multiple-alias", deleteMultipleCompanyAliasController);
module.exports = companyRouter;
