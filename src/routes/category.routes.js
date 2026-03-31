const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const validate = require('../middleware/validate');
const categorySchema = require('../validations/category.validation');
const { authMiddleware } = require('../middleware/auth');

// ==========================================
// PUBLIC ROUTES: Category Discovery
// ==========================================
router.get('/', 
  validate(categorySchema.getAll),
  categoryController.getAll
);

router.get('/trending', 
  categoryController.getPopular
);

router.get('/:slug', 
  categoryController.getBySlug
);

// ==========================================
// PROTECTED ROUTES: Content Creation
// ==========================================
router.use(authMiddleware);

// Authors hitting this endpoint when adding a custom category in the editor
router.post('/', 
  validate(categorySchema.create),
  categoryController.create
);

module.exports = router;