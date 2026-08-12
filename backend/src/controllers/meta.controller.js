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
      }
    });
    return res.status(200).json({ success: true, authUrl });
  } catch (error) {
    console.error("Meta OAuth start error:", error);
    res.status(500).json({ success: false, message: "Failed to start Meta OAuth" });
  }
};

// 2. Callback (Streamlined!)
const metaAuthCallback = async (req, res) => {
  try {
    const { code, error } = req.query;

    if (error || !code) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
    }

    // Step 1: Exchange code for access token
    const tokenResponse = await axios.get("https://graph.facebook.com/v26.0/oauth/access_token", {
      params: {
        client_id: process.env.META_APP_ID,
        client_secret: process.env.META_APP_SECRET,
        redirect_uri: process.env.META_REDIRECT_URI,
        code,
      }
    });
    const tokenData = tokenResponse.data;

    // Step 2: Fetch Meta User Profile (Just need ID and Name now!)
  const meResponse = await axios.get("https://graph.facebook.com/v26.0/me", {
      params: {
        fields: "id,name",
        access_token: tokenData.access_token
      }
    });
    const meData = meResponse.data;

    let grantedPermissions = [];
    try {
      const permResponse = await axios.get("https://graph.facebook.com/v26.0/me/permissions", {
        params: { access_token: tokenData.access_token }
      });
      
      // Meta returns an array of objects: { permission: "email", status: "granted" }
      if (permResponse.data && permResponse.data.data) {
        grantedPermissions = permResponse.data.data
          .filter(p => p.status === "granted")
          .map(p => p.permission);
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
        permissions:grantedPermissions,
        expiresAt,
        configurationId: process.env.META_CONFIG_ID,
      },
      { upsert: true, new: true }
    );

    // Step 4: Sign a JWT using the MetaConnection's MongoDB _id
    const appToken = jwt.sign(
      { id: connection._id }, 
      process.env.JWT_SECRET, 
      { expiresIn: "7d" }
    );

    // Step 5: Redirect to frontend with the token
    return res.redirect(`${process.env.FRONTEND_URL}/facebook-leads?token=${appToken}`);
    
  } catch (error) {
    console.error("Meta OAuth callback error:", error.response?.data || error.message);
    return res.redirect(`${process.env.FRONTEND_URL}/login?error=server_error`);
  }
};

// 3. Status Check (Streamlined!)
const getMetaStatus = async (req, res) => {
  try {
    // req.user is now the MetaConnection document itself
    const connection = req.user; 
    
    const isConnected = connection && 
      (!connection.expiresAt || new Date(connection.expiresAt).getTime() > Date.now());

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

const Page = require("../models/page.model"); // Import the new model

const getPages = async (req, res, next) => {
  try {
    if (!req.user || !req.user.accessToken) {
      return res.status(401).json({ success: false, message: "Unauthorized or missing Meta token." });
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
        { upsert: true, new: true }
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
    // The frontend should pass the page-specific token in the query string: ?pageToken=xxx
    // Fallback to user token just in case the user has sweeping admin privileges
    const pageToken = req.query.pageToken || req.user.accessToken;

    const forms = await metaService.getPageForms(pageId, pageToken);
    res.json({
      success: true,
      data: forms,
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
    // Frontend only needs to provide the pageId and formId
    const { pageId, formId } = req.body;

    if (!formId || !pageId) {
      return res.status(400).json({
        success: false,
        message: "Both pageId and formId are required",
      });
    }

    // 1. Retrieve the secure Page Token directly from your database
    const pageRecord = await Page.findOne({ pageId: pageId });
    if (!pageRecord || !pageRecord.accessToken) {
      return res.status(404).json({ success: false, message: "Page token not found in database. Please resync pages." });
    }

    // 2. Fetch leads using the secure database token
    const metaResponse = await metaService.getFormLeads(formId, pageRecord.accessToken);
    const leads = metaResponse.data || [];
    const results = [];

    for (const metaLead of leads) {
      const fields = {};

      for (const field of metaLead.field_data || []) {
        fields[field.name] = field.values?.[0] || "";
      }

      const leadData = {
        metaLeadId: metaLead.id,
        pageId: pageId, // Reference the page ID in your Lead model as you suggested
        name: fields.full_name || "",
        email: fields.email || "",
        phone: fields.phone_number || "",
        source: "META",
        status: "NEW",
      };

      const result = await leadService.createLeadIfNotExists(leadData);
      results.push(result);
    }

    res.json({
      success: true,
      totalFormMeta: leads.length,
      results,
    });
  } catch (err) {
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
