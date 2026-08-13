const axios = require("axios");
const crypto = require("crypto"); // 👈 ADD THIS

// Helper function to format and hash data for Meta
const hashData = (data) => {
  if (!data) return undefined;
  return crypto.createHash("sha256").update(data.trim().toLowerCase()).digest("hex");
};

const sendConversionEvent = async (accessToken, metaLeadId, newStatus,email,phone) => {
  try {
    const pixelId = process.env.META_PIXEL_ID;
    const capiToken = process.env.META_CAPI_TOKEN;
    if (!pixelId || !capiToken) {
        console.log("Missing Pixel ID or CAPI Token. Skipping CAPI event.");
      return;
    }

    // 🛑 CRITICAL: Do NOT send junk/lost leads back to Meta. 
    // If you do, Meta will optimize to find you MORE junk leads!
    if (newStatus === "CLOSED_LOST") {
        console.log("Ignored CLOSED_LOST lead to protect Meta algorithm.");
        return; 
    }

    // 🎯 Map Real Estate CRM Statuses to Meta Standard Events
    let eventName = "Lead"; // Default fallback
    
    if (newStatus === "CONTACTED") eventName = "Contact";
    if (newStatus === "SITE_VISIT_SCHEDULED") eventName = "Schedule";
    if (newStatus === "SITE_VISITED") eventName = "FindLocation";
    if (newStatus === "NEGOTIATION") eventName = "SubmitApplication";
    
    // A Closed Won property is the ultimate conversion value
    if (newStatus === "CLOSED_WON") eventName = "Purchase"; 

    const payload = {
      data: [
        {
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000), 
          action_source: "other",
          user_data: {
            lead_id: metaLeadId ,
            em: hashData(email), // 👈 Send hashed email
            ph: hashData(phone)
          },
          custom_data: {
            crm_status: newStatus 
          }
        }
      ] 
    };

    console.log("SENDING TO META:", JSON.stringify(payload, null, 2));

    const url = `https://graph.facebook.com/v18.0/${pixelId}/events`;
    
    await axios.post(url, payload, {
      params: { access_token: capiToken }
    });

    console.log(`✅ CAPI Success: Sent '${eventName}' event for lead ${metaLeadId}`);

  } catch (error) {
    console.error("❌ CAPI Error:", error.response?.data || error.message);
  }
};

module.exports = {
  // ... your other exports like getPages, etc.
  sendConversionEvent
};