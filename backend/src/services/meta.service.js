const getMetaUser = async () => {
	const accesstoken = process.env.META_ACCESS_TOKEN;
	const apiVersion = process.env.META_API_VERSION;

	if (!accesstoken || !apiVersion) {
		throw new Error("Missing required Meta API credentials");
	}

	const response = await fetch(
		`https://graph.facebook.com/${apiVersion}/me`,
		{
			headers: {
				Authorization: `Bearer ${accesstoken}`,
			},
		},
	);

	const data = await response.json();

	if (!response.ok) {
		throw new Error(data.error?.message || "Meta API request failed");
	}

	return data;
};

const getPages = async () => {
	const accesstoken = process.env.META_ACCESS_TOKEN;
	const apiVersion = process.env.META_API_VERSION;

	if (!accesstoken || !apiVersion) {
		throw new Error("Missing required Meta API credentials");
	}

	const response = await fetch(
		`https://graph.facebook.com/${apiVersion}/me/accounts`,
		{
			headers: {
				Authorization: `Bearer ${accesstoken}`,
			},
		},
	);

	const data = await response.json();

	if (!response.ok) {
		throw new Error(data.error?.message || "Meta API request failed");
	}

	return data;
};

const getPageForms = async (pageId) => {
	const accesstoken = process.env.META_PAGE_ACCESS_TOKEN;
	const apiVersion = process.env.META_API_VERSION;

	if (!accesstoken || !apiVersion) {
		throw new Error("Missing required Meta API credentials");
	}

	const response = await fetch(
		`https://graph.facebook.com/${apiVersion}/${pageId}/leadgen_forms`,
		{
			headers: {
				Authorization: `Bearer ${accesstoken}`,
			},
		},
	);

	const data = await response.json();

	if (!response.ok) {
		throw new Error(data.error?.message || "Failed to fetch lead forms");
	}

	return data;
};

const getFormLeads = async (formId) => {
	const accesstoken = process.env.META_ACCESS_TOKEN;
	const apiVersion = process.env.META_API_VERSION;

	const response = await fetch(
		`https://graph.facebook.com/${apiVersion}/${formId}/leads`,
		{
			headers: {
				Authorization: `Bearer ${accesstoken}`,
			},
		},
	);

	const data = await response.json();
	if (!response.ok) {
		throw new Error(data.error?.message || "Failed to fetch leads");
	}

	return data;
};

module.exports = {
	getMetaUser,
	getPages,
	getPageForms,
	getFormLeads
};
