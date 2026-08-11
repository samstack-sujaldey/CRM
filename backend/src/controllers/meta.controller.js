const jwt = require("jsonwebtoken");

// Adjust the path to wherever your Meta connection model is located
const MetaConnection = require("../models/meta.model");

// ==========================================
// Helper: is a stored Meta token still usable?
// ==========================================
const isTokenValid = (connection) => {
  if (!connection) return false;
  if (!connection.expiresAt) return true; // no expiry stored -> treat as long-lived
  return new Date(connection.expiresAt).getTime() > Date.now();
};

// ==========================================
// 1. Start Meta OAuth (skips re-auth if already connected)
// ==========================================
exports.startMetaAuth = async (req, res) => {
  try {
    const existingConnection = await MetaConnection.findOne({ userId: req.user._id });

    // If this user already has a valid, non-expired connection, there's no
    // need to send them through the Facebook OAuth dialog again.
    // Add ?force=true to the request if you ever want to force a re-auth
    // (e.g. to grant new permissions/scopes).
    if (isTokenValid(existingConnection) && req.query.force !== "true") {
      return res.status(200).json({
        success: true,
        alreadyConnected: true,
        message: "Meta account is already connected.",
        metaUserId: existingConnection.metaUserId,
      });
    }

    // Pack the user's database ID into a secure, short-lived JWT
    const state = jwt.sign(
      { userId: req.user._id },
      process.env.JWT_SECRET,
      { expiresIn: "10m" } // State is only valid for 10 minutes
    );

    const params = new URLSearchParams({
      client_id: process.env.META_APP_ID,
      redirect_uri: process.env.META_REDIRECT_URI,
      config_id: process.env.META_CONFIG_ID,
      response_type: "code",
      state, // Securely pass the JWT
    });

    const authUrl = `https://www.facebook.com/v26.0/dialog/oauth?${params.toString()}`;

    console.log("Redirecting to Meta OAuth:", authUrl);
    res.redirect(authUrl);
  } catch (error) {
    console.error("Meta OAuth start error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to start Meta OAuth",
    });
  }
};

// ==========================================
// 2 & 3. Retrieve Token and Store Meta Data (upsert, no duplicates)
// ==========================================
exports.metaAuthCallback = async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;

    // Handle Meta-side errors or missing parameters
    if (error) {
      return res.status(400).json({ success: false, error, error_description });
    }
    if (!code) {
      return res.status(400).json({ success: false, message: "Authorization code not received" });
    }
    if (!state) {
      return res.status(400).json({ success: false, message: "OAuth state not received" });
    }

    // Verify the state token to ensure the request wasn't tampered with
    let decodedState;
    try {
      decodedState = jwt.verify(state, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ success: false, message: "Invalid or expired OAuth state" });
    }

    const userId = decodedState.userId;

    // Step 2: Exchange authorization code for the access token
    const tokenParams = new URLSearchParams({
      client_id: process.env.META_APP_ID,
      client_secret: process.env.META_APP_SECRET,
      redirect_uri: process.env.META_REDIRECT_URI,
      code,
    });

    const tokenResponse = await fetch(
      `https://graph.facebook.com/v26.0/oauth/access_token?${tokenParams.toString()}`
    );
    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error || !tokenData.access_token) {
      return res.status(400).json({
        success: false,
        message: "Failed to exchange authorization code",
        error: tokenData.error || tokenData,
      });
    }

    // Step 3: Fetch the Meta User Profile to get the exact metaUserId
    const meResponse = await fetch(
      `https://graph.facebook.com/v26.0/me?access_token=${tokenData.access_token}`
    );
    const meData = await meResponse.json();

    if (!meResponse.ok || meData.error || !meData.id) {
      return res.status(400).json({
        success: false,
        message: "Failed to fetch Meta user profile",
        error: meData.error || meData,
      });
    }

    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : null;

    // Save or update the user's Meta connection in the database.
    // Because `userId` is unique in the schema, this upsert can never create
    // a second document for the same app user - a reconnect just overwrites
    // the existing accessToken/metaUserId/expiresAt in place.
    await MetaConnection.findOneAndUpdate(
      { userId },
      {
        userId,
        metaUserId: meData.id,
        accessToken: tokenData.access_token,
        tokenType: tokenData.token_type || "bearer",
        expiresAt,
        configurationId: process.env.META_CONFIG_ID,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Redirect the user back to your frontend dashboard
    return res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
  } catch (error) {
    console.error("Meta OAuth callback error:", error);
    return res.status(500).json({ success: false, message: "Meta OAuth callback failed" });
  }
};

// ==========================================
// 4. (Optional) Let the frontend check connection status
//    without triggering any redirect - handy for showing a
//    "Connect Meta" vs "Connected" button.
// ==========================================
exports.getMetaStatus = async (req, res) => {
  try {
    const connection = await MetaConnection.findOne({ userId: req.user._id });

    return res.status(200).json({
      success: true,
      connected: isTokenValid(connection),
      metaUserId: connection ? connection.metaUserId : null,
      expiresAt: connection ? connection.expiresAt : null,
    });
  } catch (error) {
    console.error("Meta status check error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check Meta connection status",
    });
  }
};