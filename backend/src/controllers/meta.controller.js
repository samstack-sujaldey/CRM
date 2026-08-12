const crypto = require("crypto");
const axios = require("axios");
const jwt = require("jsonwebtoken"); // <-- ADD THIS to sign tokens directly
const MetaConnection = require("../models/meta.model");

// 1. Start Meta OAuth (Remains exactly the same)
exports.startMetaAuth = async (req, res) => {
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
exports.metaAuthCallback = async (req, res) => {
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
exports.getMetaStatus = async (req, res) => {
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
};const metaService = require("../services/meta.service");
const leadService = require("../services/lead.service");

const getMetaUser = async (req, res, next) => {
	try {
		const user = await metaService.getMetaUser();
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
		const pages = await metaService.getPages();
		res.json({
			success: true,
			data: pages,
		});
	} catch (err) {
		next(err);
	}
};

const getPageForms = async (req, res, next) => {
	try {
		const { pageId } = req.params;
		const forms = await metaService.getPageForms(pageId);
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
		const leads = await metaService.getFormLeads(formId);
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
		const { formId } = req.body;

		if (!formId) {
			return res.status(400).json({
				success: false,
				message: "Form Id is required",
			});
		}

		const metaResponse = await metaService.getFormLeads(formId);

		const leads = metaResponse.data || [];

		const results = [];

		for (const metaLead of leads) {
			const fields = {};

			for (const field of metaLead.field_data || []) {
				fields[field.name] = field.values?.[0] || "";
			}

			const leadData = {
				metaLeadId: metaLead.id,
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
	getMetaUser,
	getPages,
	getPageForms,
	getFormLeads,
	syncLeads,
};
