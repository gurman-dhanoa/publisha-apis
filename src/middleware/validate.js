const validate = (schema) => async (req, res, next) => {
  try {
    await schema.validate({
      body: req.body,
      query: req.query,
      params: req.params
    }, { abortEarly: false });
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      errors: error.inner.map(e => ({
        path: e.path,
        message: e.message
      }))
    });
  }
};

module.exports = validate;