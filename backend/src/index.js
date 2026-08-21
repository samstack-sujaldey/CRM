if (typeof globalThis.crypto === "undefined") {
	globalThis.crypto = require("node:crypto").webcrypto;
}

const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const mongoose = require("mongoose");
const connectdb = require("./config/db");
const leadRoutes = require("./routes/lead.routes");
const metaRoutes = require("./routes/meta.routes");
const axios = require("axios");

dotenv.config();
connectdb();

const app = express();

const allowedOrigins = [
	process.env.FRONTEND_URL,
	"http://localhost:4200",
	"http://127.0.0.1:4200",
].filter(Boolean);

const corsOptions = {
	origin: function (origin, callback) {
		if (!origin) {
			return callback(null, true);
		}

		if (allowedOrigins.includes(origin)) {
			return callback(null, true);
		}

		console.log("Blocked CORS origin:", origin);
		console.log("Allowed origins:", allowedOrigins);

		return callback(new Error("Not allowed by CORS"));
	},

	credentials: true,
	optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(
	express.json({
		verify: (req, res, buf) => {
			req.rawBody = buf;
		},
	})
);

app.get("/", (req, res) => {
	res.json("API working");
});

app.use("/api/leads", leadRoutes);
app.use("/api/meta", metaRoutes);

// Helper function: Prevents the health check from hanging if a service is unresponsive
const withTimeout = (promise, ms) => {
	let timeoutId;
	const timeoutPromise = new Promise((_, reject) => {
		timeoutId = setTimeout(() => {
			reject(new Error(`Timeout after ${ms}ms`));
		}, ms);
	});
	return Promise.race([promise, timeoutPromise]).finally(() =>
		clearTimeout(timeoutId),
	);
};

// Helper function: Formats raw seconds into HH:MM:SS
const formatUptime = (seconds) => {
	const pad = (s) => (s < 10 ? "0" : "") + s;
	const hours = Math.floor(seconds / (60 * 60));
	const minutes = Math.floor((seconds % (60 * 60)) / 60);
	const secs = Math.floor(seconds % 60);
	return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
};

app.get("/health", async (req, res) => {
	const healthcheck = {
		status: "OK",
		uptime: formatUptime(process.uptime()),
		timestamp: new Date().toISOString(),
		memory: {
			rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
			heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB`,
			heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
		},
		dependencies: {
			database: { status: "unknown", latency: null },
			metaAPI: { status: "unknown", latency: null },
		},
	};

	let isHealthy = true;

	try {
		const dbStart = Date.now();
		// 1 = Connected. We check state first, then force a ping command to verify I/O.
		if (mongoose.connection.readyState === 1) {
			await withTimeout(mongoose.connection.db.admin().ping(), 2000);
			healthcheck.dependencies.database.status = "healthy";
			healthcheck.dependencies.database.latency = `${Date.now() - dbStart}ms`;
		} else {
			healthcheck.dependencies.database.status = "disconnected";
			isHealthy = false;
		}
	} catch (error) {
		healthcheck.dependencies.database.status = "unhealthy";
		healthcheck.dependencies.database.error = error.message;
		isHealthy = false;
	}

	try {
		const metaStart = Date.now();
		const apiVersion = process.env.META_API_VERSION || "v26.0";

		// A simple GET request to check outbound network connectivity to Meta.
		// We treat 4xx status codes as "healthy" because it proves Meta is actively responding.
		await withTimeout(
			axios.get(`https://graph.facebook.com/${apiVersion}`, {
				validateStatus: (status) => status < 500,
			}),
			2000,
		);
		healthcheck.dependencies.metaAPI.status = "healthy";
		healthcheck.dependencies.metaAPI.latency = `${Date.now() - metaStart}ms`;
	} catch (error) {
		healthcheck.dependencies.metaAPI.status = "unhealthy";
		healthcheck.dependencies.metaAPI.error = error.message;
		isHealthy = false;
	}

	if (!isHealthy) {
		healthcheck.status = "DEGRADED";
		// 503 Service Unavailable explicitly tells Load Balancers to stop routing traffic here
		return res.status(503).json(healthcheck);
	}

	return res.status(200).json(healthcheck);
});

app.listen(process.env.PORT, () => {
	console.log(`server is running on port ${process.env.PORT}`);
});
