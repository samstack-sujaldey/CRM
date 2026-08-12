const jwt = require("jsonwebtoken");
const MetaConnection = require("../models/meta.model"); // Changed from User

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "No token provided." });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find the MetaConnection using the ID packed inside the token
    const connection = await MetaConnection.findById(decoded.id);

    if (!connection) {
      return res.status(401).json({ success: false, message: "Invalid token or connection removed." });
    }

    // Attach the connection directly to req.user for downstream routes
    req.user = connection; 
    next();
    
  } catch (error) {
    return res.status(401).json({ success: false, message: "Authentication failed." });
  }
};

module.exports = authMiddleware;