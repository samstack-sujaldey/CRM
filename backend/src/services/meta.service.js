const axios = require("axios");
const apiVersion = process.env.META_API_VERSION || "v26.0";

const getMetaUser = async (userAccessToken) => {
  if (!userAccessToken)
    throw new Error("Missing required Meta API credentials");
  try {
    const response = await axios.get(
      `https://graph.facebook.com/${apiVersion}/me`,
      {
        headers: { Authorization: `Bearer ${userAccessToken}` },
      },
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.error?.message || "Meta API request failed",
    );
  }
};

const getPages = async (userAccessToken) => {
  if (!userAccessToken)
    throw new Error("Missing required Meta API credentials");
  try {
    const response = await axios.get(
      `https://graph.facebook.com/${apiVersion}/me/accounts`,
      {
        headers: { Authorization: `Bearer ${userAccessToken}` },
      },
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.error?.message || "Meta API request failed",
    );
  }
};

const getPageForms = async (pageId, pageAccessToken) => {
  if (!pageAccessToken)
    throw new Error("Missing required Meta Page Access Token");
  try {
    const response = await axios.get(
      `https://graph.facebook.com/${apiVersion}/${pageId}/leadgen_forms`,
      { headers: { Authorization: `Bearer ${pageAccessToken}` } },
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.error?.message || "Failed to fetch lead forms",
    );
  }
};

const getFormLeads = async (formId, pageAccessToken) => {
  if (!pageAccessToken)
    throw new Error("Meta Page Access Token is not configured");
  if (!formId) throw new Error("Form Id is required");
  try {
    const response = await axios.get(
      `https://graph.facebook.com/${apiVersion}/${formId}/leads`,
      { headers: { Authorization: `Bearer ${pageAccessToken}` } },
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.error?.message || "Failed to fetch leads",
    );
  }
};

const exchangeLongLivedToken = async (shortLivedToken) => {
  try {
    const response = await axios.get(
      `https://graph.facebook.com/${apiVersion}/oauth/access_token`,
      {
        params: {
          grant_type: "fb_exchange_token",
          client_id: process.env.META_APP_ID,
          client_secret: process.env.META_APP_SECRET,
          fb_exchange_token: shortLivedToken,
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error(
      "Exchange token error:",
      error.response?.data || error.message,
    );
    throw new Error(
      error.response?.data?.error?.message ||
        "Failed to exchange long-lived token",
    );
  }
};

// Comprehensive Pixel & Dataset Scanner
const getAllUserPixelsAndDatasets = async (userAccessToken) => {
  const collectedPixels = [];
  const headers = { Authorization: `Bearer ${userAccessToken}` };

  // 1. Fetch from Ad Accounts
  try {
    const adAccResponse = await axios.get(
      `https://graph.facebook.com/${apiVersion}/me/adaccounts?fields=id,name`,
      { headers },
    );
    const adAccounts = adAccResponse.data?.data || [];
    //console.log(`[Meta Debug] Found ${adAccounts.length} Ad Accounts`);

    for (const acc of adAccounts) {
      
      // Check Pixels
      try {
        const pxRes = await axios.get(
          `https://graph.facebook.com/${apiVersion}/${acc.id}/adspixels?fields=id,name`,
          { headers },
        );
        (pxRes.data?.data || []).forEach((p) =>
          collectedPixels.push({
            id: p.id,
            name: p.name,
            source: "AdAccount Pixel",
            accountName: acc.name,
          }),
        );
      } catch (e) {
        console.log("Unable to fetch pixels ", e.response?.data?.error?.message);
      }
    }
  } catch (err) {
    console.warn(
      "[Meta Debug] Ad Accounts fetch note:",
      err.response?.data?.error?.message || err.message,
    );
  }

  // 2. Fetch from Business Portfolios / Business Managers
  try {
    const bizResponse = await axios.get(
      `https://graph.facebook.com/${apiVersion}/me/businesses?fields=id,name`,
      { headers },
    );
    const businesses = bizResponse.data?.data || [];
    // console.log(`[Meta Debug] Found ${businesses.length} Business Portfolios`);

    for (const biz of businesses) {

      // Check Business Owned Pixels
      try {
        const pxRes = await axios.get(
          `https://graph.facebook.com/${apiVersion}/${biz.id}/owned_pixels?fields=id,name`,
          { headers },
        );
        (pxRes.data?.data || []).forEach((p) =>
          collectedPixels.push({
            id: p.id,
            name: p.name,
            source: "Business Pixel",
            accountName: biz.name,
          }),
        );
      } catch (e) {
        console.log("No business owne pixels found ",e.response?.data?.error?.message);
      }
    }
  } catch (err) {
    console.warn(
      "[Meta Debug] Business Portfolios fetch note:",
      err.response?.data?.error?.message || err.message,
    );
  }

  // De-duplicate by ID
  const uniquePixels = Array.from(
    new Map(collectedPixels.map((p) => [p.id, p])).values(),
  );
  //console.log(`[Meta Debug] Total Unique Pixels/Datasets Resolved: ${uniquePixels.length}`,uniquePixels);
  return uniquePixels;
};

// Fetch individual lead details by leadgen_id
const getLeadDetails = async (leadId, pageAccessToken) => {
  if (!pageAccessToken || !leadId) {
    throw new Error("Lead ID and Page Access Token are required");
  }
  try {
    const response = await axios.get(
      `https://graph.facebook.com/${apiVersion}/${leadId}`,
      {
        headers: { Authorization: `Bearer ${pageAccessToken}` },
      },
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.error?.message || "Failed to fetch lead details",
    );
  }
};

// Subscribes a Facebook Page to your app's webhooks so Meta starts forwarding lead events
const subscribePageToApp = async (pageId, pageAccessToken) => {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/${apiVersion}/${pageId}/subscribed_apps`,
      null,
      {
        params: {
          subscribed_fields: "leadgen",
          access_token: pageAccessToken,
        },
      },
    );
    return response.data;
  } catch (error) {
    console.warn(
      `[Webhook Note] Could not subscribe page ${pageId}:`,
      error.response?.data?.error?.message || error.message,
    );
    return null;
  }
};

module.exports = {
  getMetaUser,
  getPages,
  getPageForms,
  getFormLeads,
  exchangeLongLivedToken,
  getAllUserPixelsAndDatasets,
  getLeadDetails,
  subscribePageToApp,
};
