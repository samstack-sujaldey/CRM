const jwt = require("jsonwebtoken");
// Adjust the path to wherever your User model is located
const User = require("../models/user.model"); 

const authMiddleware = async (req, res, next) => {
  try {
    // 1. Extract the token from the Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No authentication token provided.",
      });
    }

    // Isolate the actual token string (removing "Bearer ")
    const token = authHeader.split(" ")[1];

    // 2. Verify the token using your secret key
    // Make sure JWT_SECRET is defined in your .env file
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Find the user in the database
    // Depending on how you generate your JWT, the payload might use 'id' or '_id'
    const user = await User.findById(decoded.id || decoded._id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid token. User no longer exists.",
      });
    }

    // 4. Attach the user object to the request
    req.user = user;
    
    // 5. Move to the next middleware or route handler
    next();
    
  } catch (error) {
    console.error("Auth Middleware Error:", error.message);

    // Provide specific error messages for standard JWT errors
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Authentication token has expired. Please log in again.",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Malformed or invalid token.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error during authentication.",
    });
  }
};

module.exports = authMiddleware;