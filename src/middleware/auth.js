const jwt = require("jsonwebtoken");
const ApiError = require("../utils/ApiError");

const authMiddleware = (req, res, next) => {
  try {
    // Standardize header extraction (handles different casing)
    const authHeader = req.headers.authorization || req.headers.Authorization;
    
    if (!authHeader?.startsWith("Bearer ")) {
      throw new ApiError(401, "Unauthorized request: No token provided");
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      throw new ApiError(401, "Unauthorized request: Token missing");
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // SECURITY CATCH: Prevent MFA Temp Tokens from accessing protected routes
    if (decoded.mfa_pending) {
      throw new ApiError(403, "MFA verification pending");
    }

    // Assign to req.user (works for both authors and admins)
    req.user = decoded;
    next();
  } catch (error) {
    // Provide specific, helpful error messages to the frontend
    if (error.name === "TokenExpiredError") {
      next(new ApiError(401, "Session expired. Please log in again."));
    } else if (error.name === "JsonWebTokenError") {
      next(new ApiError(401, "Invalid authentication token."));
    } else {
      // Pass our custom ApiError directly to the global handler
      next(error instanceof ApiError ? error : new ApiError(401, "Authentication failed"));
    }
  }
};

module.exports = authMiddleware;