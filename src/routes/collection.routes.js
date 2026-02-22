const express = require('express');
const router = express.Router();
const collectionController = require('../controllers/collection.controller');
const validate = require('../middleware/validate');
const collectionSchema = require('../validations/collection.validation');
const authMiddleware = require('../middleware/auth');

// Public routes
router.get('/author/:authorId', 
  collectionController.getByAuthor
);

router.get('/popular', 
  collectionController.getPopular
);

router.get('/slug/:slug', 
  collectionController.getBySlug
);

router.get('/:id', 
  collectionController.getById
);

router.get('/:collectionId/article/:articleId/check',
  collectionController.checkArticle
);

// Protected routes
router.use(authMiddleware);

router.post('/', 
  validate(collectionSchema.create), 
  collectionController.create
);

router.put('/:id', 
  validate(collectionSchema.update), 
  collectionController.update
);

router.delete('/:id', 
  collectionController.delete
);

router.post('/:id/articles', 
  validate(collectionSchema.addArticles), 
  collectionController.addArticles
);

router.delete('/:collectionId/articles/:articleId', 
  validate(collectionSchema.removeArticle), 
  collectionController.removeArticle
);

module.exports = router;