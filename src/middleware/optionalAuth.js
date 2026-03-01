const jwt = require("jsonwebtoken");

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      req.user = null;
      return next();
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // You can also fetch fresh user data from DB here if needed
    req.user = decoded;
    next();
  } catch (error) {
    // In optional auth, we don't throw an error, just proceed as guest
    req.user = null;
    next();
  }
};

module.exports = optionalAuth;