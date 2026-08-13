const axios = require("axios");

const apiVersion = process.env.META_API_VERSION || "v26.0";

const getMetaUser = async (userAccessToken) => {
  if (!userAccessToken) {
    throw new Error("Missing required Meta API credentials");
  }

  try {
    const response = await axios.get(
      `https://graph.facebook.com/${apiVersion}/me`,
      {
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error?.message || "Meta API request failed");
  }
};

const getPages = async (userAccessToken) => {
  if (!userAccessToken) {
    throw new Error("Missing required Meta API credentials");
  }

  try {
    const response = await axios.get(
      `https://graph.facebook.com/${apiVersion}/me/accounts`,
      {
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
        },
      }
    );
    // This will return an array of pages, each containing its own 'access_token'
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error?.message || "Meta API request failed");
  }
};

const getPageForms = async (pageId, pageAccessToken) => {
  if (!pageAccessToken) {
    throw new Error("Missing required Meta Page Access Token");
  }

  try {
    const response = await axios.get(
      `https://graph.facebook.com/${apiVersion}/${pageId}/leadgen_forms`,
      {
        headers: {
          Authorization: `Bearer ${pageAccessToken}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error?.message || "Failed to fetch lead forms");
  }
};

const getFormLeads = async (formId, pageAccessToken) => {
  if (!pageAccessToken) {
    throw new Error("Meta Page Access Token is not configured");
  }
  if (!formId) {
    throw new Error("Form Id is required");
  }

  try {
    const response = await axios.get(
      `https://graph.facebook.com/${apiVersion}/${formId}/leads`,
      {
        headers: {
          Authorization: `Bearer ${pageAccessToken}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error?.message || "Failed to fetch leads");
  }
};

module.exports = {
	getMetaUser,
	getPages,
	getPageForms,
	getFormLeads,
};
