if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = require('node:crypto').webcrypto;
}

const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectdb = require("./config/db");
const leadRoutes = require("./routes/lead.routes");
const metaRoutes = require("./routes/meta.routes");

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
		// Allow requests with no origin
		// (Postman, curl, server-to-server requests)
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
app.use(express.json());

app.get("/", (req, res) => {
	res.json("API working");
});

app.use("/api/leads", leadRoutes);
app.use("/api/meta", metaRoutes);

app.listen(process.env.PORT, () => {
	console.log(`server is running on port ${process.env.PORT}`);
});
