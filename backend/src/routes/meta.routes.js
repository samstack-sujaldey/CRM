const express = require("express");
const router = express.Router();

// Import your auth middleware (verifies the app's own JWT / identifies req.user)
const authMiddleware = require("../middleware/auth.middleware");

// Import the controller that holds all the Meta OAuth logic
const {
  startMetaAuth,
  metaAuthCallback,
  getMetaStatus,
} = require("../controllers/meta.controller");

// ==========================================
// 1. Authorize the User
//    - authMiddleware confirms who the app user is
//    - startMetaAuth then checks meta.model.js for an existing,
//      still-valid connection before redirecting to Facebook
// ==========================================
router.get("/meta", authMiddleware, startMetaAuth);

// ==========================================
// 2 & 3. Retrieve Token and Store Meta Data
//    (Facebook redirects here directly, so no authMiddleware -
//    the user's identity comes from the signed `state` JWT instead)
// ==========================================
router.get("/meta/callback", metaAuthCallback);

// ==========================================
// 4. (Optional) Check connection status from the frontend
// ==========================================
router.get("/meta/status", authMiddleware, getMetaStatus);

module.exports = router;