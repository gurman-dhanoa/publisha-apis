const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');

const errorHandler = (err, req, res, next) => {
  let error = err;

  // 1. Convert standard/unknown errors into our custom ApiError format
  if (!(error instanceof ApiError)) {
    // Fallback to 500 if no status code exists
    const statusCode = error.statusCode || error.status || 500;
    const message = error.message || 'Internal Server Error';
    
    // Check if it's a Yup validation error (Yup usually attaches an 'errors' or 'inner' array)
    const errors = error.errors || error.inner || [];
    
    error = new ApiError(statusCode, message, errors, err.stack);
  }

  // 2. Log the error for your internal debugging
  // If it's a 500 error, it's critical. If it's a 4xx, it's usually user error.
  if (error.statusCode >= 500) {
    logger.error(`[SERVER ERROR] ${error.message} \nStack: ${error.stack}`);
  } else {
    logger.warn(`[CLIENT ERROR] ${error.statusCode} - ${error.message}`);
  }

  // 3. Construct the standardized error payload for the frontend
  const response = {
    success: error.success, // This will always be false from ApiError
    message: error.message,
    errors: error.errors,   // Great for form validation issues
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  };

  // 4. Send the response
  res.status(error.statusCode).json(response);
};

module.exports = errorHandler;