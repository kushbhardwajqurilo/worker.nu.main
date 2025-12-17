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

const companyRouter = require("express").Router();

companyRouter.post("/add-company", addCompanyController);
companyRouter.put("/update-company", updateCompanyController);
companyRouter.get("/get-company", getCompanyDetailController);

// compay alias routes
companyRouter.post("/add-company-alias", addCompanyAlias);
companyRouter.get('/get-single-alias', getSingleCompanyAliasController)
companyRouter.get('/get-all-alias', getAllCompanyAliasController);
companyRouter.put('/update-alias', updateCompanyAliasController)
companyRouter.delete('/delete-single_alias', deleteCompanyAliasController)
companyRouter.delete('/multiple-alias', deleteMultipleCompanyAliasController)
module.exports = companyRouter;
