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
  process.env.FRONTEND_URL 
];

const corsOptions = {
  origin: function (origin, callback) {
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200 
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