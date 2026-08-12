const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectdb = require("./config/db");
const leadRoutes = require("./routes/lead.routes");
const metaAuthRoutes = require("./routes/meta.routes");


dotenv.config();
connectdb();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
	res.json("API working");
});

app.use("/api/leads", leadRoutes);
app.use('/api/auth/meta', metaAuthRoutes);


app.listen(process.env.PORT, () => {
	console.log(`server is running on port ${process.env.PORT}`);

	
});
