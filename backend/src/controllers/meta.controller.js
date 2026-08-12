const Page = require("../models/page.model"); // Make sure this is imported at the top!
const crypto = require("crypto");
const axios = require("axios");
const jwt = require("jsonwebtoken"); // <-- ADD THIS to sign tokens directly
const MetaConnection = require("../models/meta.model");
const metaService = require("../services/meta.service");
const leadService = require("../services/lead.service");

// 1. Start Meta OAuth (Remains exactly the same)
const startMetaAuth = async (req, res) => {
  try {
    const state = crypto.randomBytes(16).toString("hex");
    const authUrl = axios.getUri({
      url: "https://www.facebook.com/v26.0/dialog/oauth",
      params: {
        client_id: process.env.META_APP_ID,
        redirect_uri: process.env.META_REDIRECT_URI,
        config_id: process.env.META_CONFIG_ID,
        response_type: "code",
        state,
      },
    });
    return res.status(200).json({ success: true, authUrl });
  } catch (error) {
    console.error("Meta OAuth start error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to start Meta OAuth" });
  }
};

// 2. Callback (Streamlined!)
const metaAuthCallback = async (req, res) => {
  try {
    const { code, error } = req.query;

    if (error || !code) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/login?error=oauth_failed`,
      );
    }

    // Step 1: Exchange code for access token
    const tokenResponse = await axios.get(
      "https://graph.facebook.com/v26.0/oauth/access_token",
      {
        params: {
          client_id: process.env.META_APP_ID,
          client_secret: process.env.META_APP_SECRET,
          redirect_uri: process.env.META_REDIRECT_URI,
          code,
        },
      },
    );
    const tokenData = tokenResponse.data;

    // Step 2: Fetch Meta User Profile (Just need ID and Name now!)
    const meResponse = await axios.get("https://graph.facebook.com/v26.0/me", {
      params: {
        fields: "id,name",
        access_token: tokenData.access_token,
      },
    });
    const meData = meResponse.data;

    let grantedPermissions = [];
    try {
      const permResponse = await axios.get(
        "https://graph.facebook.com/v26.0/me/permissions",
        {
          params: { access_token: tokenData.access_token },
        },
      );

      // Meta returns an array of objects: { permission: "email", status: "granted" }
      if (permResponse.data && permResponse.data.data) {
        grantedPermissions = permResponse.data.data
          .filter((p) => p.status === "granted")
          .map((p) => p.permission);
      }
    } catch (permError) {
      console.error("Failed to fetch permissions:", permError.message);
    }

    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : null;

    // Step 3: Upsert the MetaConnection (This IS the user now)
    const connection = await MetaConnection.findOneAndUpdate(
      { metaUserId: meData.id },
      {
        metaUserId: meData.id,
        name: meData.name,
        accessToken: tokenData.access_token,
        tokenType: tokenData.token_type || "bearer",
        permissions: grantedPermissions,
        expiresAt,
        configurationId: process.env.META_CONFIG_ID,
      },
      { upsert: true, new: true },
    );

    // Step 4: Sign a JWT using the MetaConnection's MongoDB _id
    const appToken = jwt.sign({ id: connection._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // Step 5: Redirect to frontend with the token
    return res.redirect(`${process.env.FRONTEND_URL}/login?token=${appToken}`);
  } catch (error) {
    console.error(
      "Meta OAuth callback error:",
      error.response?.data || error.message,
    );
   return res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
  }
};

// 3. Status Check (Streamlined!)
const getMetaStatus = async (req, res) => {
  try {
    // req.user is now the MetaConnection document itself
    const connection = req.user;

    const isConnected =
      connection &&
      (!connection.expiresAt ||
        new Date(connection.expiresAt).getTime() > Date.now());

    return res.status(200).json({
      success: true,
      connected: !!isConnected,
      metaUserId: connection.metaUserId,
      name: connection.name,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to check status" });
  }
};

const getMetaUser = async (req, res, next) => {
  try {
    // req.user is populated by your authMiddleware
    const userAccessToken = req.user.accessToken;

    const user = await metaService.getMetaUser(userAccessToken);
    res.json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};


const getPages = async (req, res, next) => {
  try {
    if (!req.user || !req.user.accessToken) {
      return res
        .status(401)
        .json({
          success: false,
          message: "Unauthorized or missing Meta token.",
        });
    }
    const userAccessToken = req.user.accessToken;
    const metaUserId = req.user.metaUserId;

    // 1. Fetch the pages from Meta
    const pagesResponse = await metaService.getPages(userAccessToken);
    const fbPages = pagesResponse.data || [];

    const savedPages = [];

    // 2. Save or update each page in your database
    for (const fbPage of fbPages) {
      const page = await Page.findOneAndUpdate(
        { pageId: fbPage.id },
        {
          metaUserId: metaUserId,
          pageId: fbPage.id,
          name: fbPage.name,
          accessToken: fbPage.access_token, // Save the Page Token securely!
        },
        { upsert: true, new: true },
      );
      savedPages.push(page);
    }

    // 3. Strip the access tokens before sending to the frontend for security
    const safePagesForFrontend = savedPages.map((page) => ({
      pageId: page.pageId,
      name: page.name,
    }));

    res.json({
      success: true,
      data: safePagesForFrontend,
    });
  } catch (err) {
    next(err);
  }
};

const getPageForms = async (req, res, next) => {
  try {
    const { pageId } = req.params;

    const pageRecord = await Page.findOne({ pageId: pageId });
    if (!pageRecord || !pageRecord.accessToken) {
      return res.status(404).json({ success: false, message: "Page not found." });
    }

    // 1. Fetch live forms from Meta
    const formsData = await metaService.getPageForms(pageId, pageRecord.accessToken);
    
    const extractedForms = formsData.data.map(form => ({
      formId: form.id,
      name: form.name
    }));

    // ✅ THE FIX: If the page is somehow missing the user ID, inject it before saving!
    if (!pageRecord.user) {
      pageRecord.user = req.user.id; 
    }

    // Update forms and save safely
    pageRecord.forms = extractedForms;
    await pageRecord.save();

    res.json({
      success: true,
      data: extractedForms,
    });
  } catch (err) {
    next(err);
  }
};

const getFormLeads = async (req, res, next) => {
  try {
    const { formId } = req.params;
    // Extract page token from query string
    const pageToken = req.query.pageToken || req.user.accessToken;

    const leads = await metaService.getFormLeads(formId, pageToken);
    res.json({
      success: true,
      data: leads,
    });
  } catch (err) {
    next(err);
  }
};

const syncLeads = async (req, res, next) => {
  try {
    // 1. Extract the IDs sent from the Angular frontend payload
    const { pageId, formId } = req.body;

    // 2. If they are missing, throw a 400 Bad Request (this is what you just experienced!)
    if (!pageId || !formId) {
      return res.status(400).json({ 
        success: false, 
        message: "Both pageId and formId are required to sync leads." 
      });
    }

    // 3. Find the specific page in your DB to get its secure access token
    const pageRecord = await Page.findOne({ pageId: pageId });
    if (!pageRecord || !pageRecord.accessToken) {
      return res.status(404).json({ success: false, message: "Page token not found. Sync pages first." });
    }

    // 4. Fetch the live leads from Meta using the correct Page Token
    const leadsFromMeta = await metaService.getFormLeads(formId, pageRecord.accessToken);

    if (!leadsFromMeta || !leadsFromMeta.data) {
      return res.status(400).json({ success: false, message: "No leads returned from Meta." });
    }

    // 5. Loop through Meta's response and save each lead to your database
    let newLeadsCount = 0;
    for (const fbLead of leadsFromMeta.data) {
      
      // Helper function to extract specific fields from Meta's field_data array
      const getFieldValue = (fieldName) => {
        const field = fbLead.field_data.find(f => f.name === fieldName);
        return field ? field.values[0] : "";
      };

      const extractedName = getFieldValue("full_name") || getFieldValue("first_name") || "Unknown";
      const extractedEmail = getFieldValue("email") || "no-email@provided.com";
      const extractedPhone = getFieldValue("phone_number") || "";

      // Format the data to match your Lead model exactly
      const leadData = {
        metaUserId: req.user.metaUserId,
        page: pageRecord._id, // The Mongo ObjectId we added earlier!
        formId: formId,
        metaLeadId: fbLead.id,
        name: extractedName,
        email: extractedEmail,
        phone: extractedPhone,
        source: "META",
        status: "NEW"
      };

      // Upsert the lead using your lead service
      const result = await leadService.createLeadIfNotExists(leadData);
      if (result.created) {
        newLeadsCount++;
      }
    }

    // 6. Send the success response back to Angular
    res.status(200).json({
      success: true,
      message: "Sync completed successfully",
      totalFormMeta: newLeadsCount
    });

  } catch (err) {
    console.error("Error in syncLeads:", err);
    next(err);
  }
};

module.exports = {
  startMetaAuth,
  metaAuthCallback,
  getMetaStatus,
  getMetaUser,
  getPages,
  getPageForms,
  getFormLeads,
  syncLeads,
};
