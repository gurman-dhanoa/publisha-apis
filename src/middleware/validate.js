const ApiError = require('../utils/ApiError');

const validate = (schema) => async (req, res, next) => {
  try {
    // Validate and capture the casted/cleaned data
    const validatedData = await schema.validate({
      body: req.body,
      query: req.query,
      params: req.params
    }, { 
      abortEarly: false, 
      stripUnknown: true // Removes any extra fields not defined in the schema
    });

    // Re-assign the cleaned data back to the request object
    req.body = validatedData.body;
    req.query = validatedData.query;
    req.params = validatedData.params;

    next();
  } catch (error) {
    // Format the Yup errors into a clean array
    const extractedErrors = error.inner.map(e => ({
      field: e.path.replace('body.', '').replace('query.', '').replace('params.', ''),
      message: e.message
    }));

    // Pass the error to the global error handler
    next(new ApiError(400, "Validation Error", extractedErrors));
  }
};

module.exports = validate;