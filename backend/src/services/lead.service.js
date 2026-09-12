const Lead = require("../models/lead.model");

const createLead = async (data) => {
  return await Lead.create(data);
};

const updateLeadStatus = async (leadId, status, dealValue, currency) => {
  const allowedStatus = [
    "NEW",
    "CONTACTED",
    "QUALIFIED",
    "SITE_VISIT_SCHEDULED",
    "SITE_VISITED",
    "NEGOTIATION",
    "CLOSED_WON",
    "CLOSED_LOST",
  ];

  if (!allowedStatus.includes(status)) {
    const error = new Error("Invalid lead Status");
    error.statusCode = 400;
    throw error;
  }

  // 1. Find the lead first so we can capture the old status
  const lead = await Lead.findById(leadId);

  if (!lead) {
    const error = new Error("Lead Not Found");
    error.statusCode = 400;
    throw error;
  }

  const oldStatus = lead.status;

  // 2. Apply the new status and deal value logic
  lead.status = status;

  if (status === "CLOSED_WON") {
    if (dealValue !== undefined) lead.dealValue = dealValue;
    if (currency !== undefined) lead.currency = currency;
  } else {
    lead.dealValue = null;
  }

  // 3. Initialize the array if it doesn't exist on older documents
  if (!lead.actionHistory) {
    lead.actionHistory = [];
  }

  // 4. Push the log entry only if the status actually changed
  if (oldStatus !== status) {
    lead.actionHistory.push({
      action: `Status changed from ${oldStatus} to ${status}`,
      timestamp: new Date(),
    });
  }

  // 5. Save the updated document to the database
  await lead.save();

  return lead;
};

const getAllLeads = async (metaUserId, pageObjectId) => {
  const query = { metaUserId: metaUserId };

  if (pageObjectId) {
    query.page = pageObjectId;
  }

  return await Lead.find(query)
    .populate("page", "name pageId forms")
    .sort({ metaCreatedAt: -1, createdAt: -1 });
};

const getLeadById = async (LeadId, metaUserId) => {
  return await Lead.findOne({ _id: LeadId, metaUserId: metaUserId });
};

const createLeadIfNotExists = async (leadData) => {
  const existingLead = await Lead.findOne({
    metaLeadId: leadData.metaLeadId,
  });

  if (existingLead) {
    return {
      created: false,
      lead: existingLead,
    };
  }

  const lead = await Lead.create(leadData);
  return {
    created: true,
    lead: lead,
  };
};

module.exports = {
  createLead,
  updateLeadStatus,
  getAllLeads,
  getLeadById,
  createLeadIfNotExists,
};
