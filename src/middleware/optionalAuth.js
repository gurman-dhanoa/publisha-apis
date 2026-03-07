const jwt = require("jsonwebtoken");

const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    
    // If no header or wrong format, proceed as guest
    if (!authHeader?.startsWith("Bearer ")) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      req.user = null;
      return next();
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Ignore MFA temp tokens
    if (decoded.mfa_pending) {
      req.user = null;
      return next();
    }

    req.user = decoded;
    next();
  } catch (error) {
    // Silently fail for any JWT errors (expired, invalid, etc.) and treat as guest
    req.user = null;
    next();
  }
};

module.exports = optionalAuth;