const express = require("express");
const router = express.Router();


const metaController = require("../controllers/meta.controller");
const authMiddleware = require("../middleware/auth.middleware");

// 1. Start OAuth (No authMiddleware because they are logging in!)
router.get("/", metaController.startMetaAuth);
router.get("/callback", metaController.metaAuthCallback);

// 3. Check status (Requires authMiddleware because the user is logged in by this point)
router.get("/status", authMiddleware, metaController.getMetaStatus);
router.get("/me", authMiddleware, metaController.getMetaUser);
router.get("/pages", authMiddleware, metaController.getPages);
router.get("/pages/:pageId/forms", authMiddleware, metaController.getPageForms);
router.get("/forms/:formId/leads", authMiddleware, metaController.getFormLeads);
router.patch("/sync", authMiddleware, metaController.syncLeads);

module.exports = router;

