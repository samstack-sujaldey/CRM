const express = require("express");
const router = express.Router();

const {
  startMetaAuth,
  metaAuthCallback,
  getMetaStatus,
} = require("../controllers/meta.controller");
const authMiddleware = require("../middleware/auth.middleware");

// 1. Start OAuth (No authMiddleware because they are logging in!)
router.get("/", startMetaAuth);

// 2. Callback (Where we create the user and save the token)
router.get("/callback", metaAuthCallback);

// 3. Check status (Requires authMiddleware because the user is logged in by this point)
router.get("/status", authMiddleware, getMetaStatus);

module.exports = router;

const router = express.Router();

const metaController = require("../controllers/meta.controller");

router.get("/me", metaController.getMetaUser);
router.get("/pages", metaController.getPages);
router.get("/pages/:pageId/forms", metaController.getPageForms);
router.get("/forms/:formId/leads", metaController.getFormLeads);
router.patch("/sync", metaController.syncLeads);

module.exports = router;

