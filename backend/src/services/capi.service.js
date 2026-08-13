const axios = require("axios");
const axiosRetry=require('axios-retry').default
const SHA256 = require("crypto-js/sha256"); 

const capiClient = axios.create();

axiosRetry(capiClient, {
  retries: 3, 
  retryDelay: axiosRetry.exponentialDelay, 
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status >= 500;
  }
});

// Helper function to format and hash data for Meta
const hashData = (data) => {
  if (!data) return undefined;
  return  crypto.createHash("sha256").update(data.trim().toLowerCase()).digest("hex");
};

const sendConversionEvent = async (accessToken, metaLeadId, newStatus,email,phone,dealValue,currency) => {
  try {
    const pixelId = process.env.META_PIXEL_ID;
    const capiToken = process.env.META_CAPI_TOKEN;
    if (!pixelId || !capiToken) {
      return;
    }

    if (newStatus === "CLOSED_LOST") {
        return; 
    }

    // 🎯 Map Real Estate CRM Statuses to Meta Standard Events
    let eventName = "Lead"; 
    if (newStatus === "CONTACTED") eventName = "Contact";
    if (newStatus === "SITE_VISIT_SCHEDULED") eventName = "Schedule";
    if (newStatus === "SITE_VISITED") eventName = "FindLocation";
    if (newStatus === "NEGOTIATION") eventName = "SubmitApplication";
    if (newStatus === "CLOSED_WON") eventName = "Purchase"; 

    const customData = {
      crm_status: newStatus 
    };

    // Inject the required parameters if it's a Purchase
    if (eventName === "Purchase") {
      customData.currency = currency || "INR"; 
      customData.value = Number(dealValue) || 1;
    }
    const payload = {
      data: [
        {
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000), 
          action_source: "other",
          user_data: {
            lead_id: metaLeadId ,
            em: hashData(email), 
            ph: hashData(phone)
          },
          custom_data: customData
        }
      ] 
    };

    const url = `https://graph.facebook.com/${process.env.META_API_VERSION}/${pixelId}/events`;
    await capiClient.post(url, payload, {
      params: { access_token: capiToken }
    });

    console.log(`✅ CAPI Success: Sent '${eventName}' event for lead ${metaLeadId}`);
  } catch (error) {
    console.error("❌ CAPI Error:", error.response?.data || error.message);
  }
};

module.exports = {
  sendConversionEvent
};