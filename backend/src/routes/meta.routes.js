const express = require("express");

const router = express.Router();

const metaController = require("../controllers/meta.controller");

router.get("/me", metaController.getMetaUser);
router.get("/pages", metaController.getPages);
router.get("/pages/:pageId/forms", metaController.getPageForms);
router.get("/forms/:formId/leads", metaController.getFormLeads);

module.exports = router;
