const express = require('express');
const router = express.Router();
const articleController = require('../controllers/article.controller');
const validate = require('../middleware/validate');
const articleSchema = require('../validations/article.validation');
const authMiddleware = require('../middleware/auth');

// Public routes
router.get(
  '/search', 
  validate(articleSchema.globalSearch), 
  articleController.globalSearch
);

router.get('/', 
  validate(articleSchema.getAll), 
  articleController.getAll
);

router.get('/slug/:slug', 
  validate(articleSchema.getBySlug), 
  articleController.getBySlug
);

router.get('/author/:id', 
  articleController.getByAuthor
);

router.get('/:id', 
  validate(articleSchema.getById), 
  articleController.getById
);

// Protected routes
router.use(authMiddleware);

router.post('/', 
  validate(articleSchema.create), 
  articleController.create
);

router.put('/:id', 
  validate(articleSchema.update), 
  articleController.update
);

router.delete('/:id', 
  validate(articleSchema.getById), 
  articleController.delete
);

module.exports = router;