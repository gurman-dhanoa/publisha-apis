const express = require('express');
const router = express.Router();
const authorController = require('../controllers/author.controller');
const validate = require('../middleware/validate');
const authorSchema = require('../validations/author.validation');
const authMiddleware = require('../middleware/auth');

// Public routes
router.post('/register', 
  validate(authorSchema.register), 
  authorController.register
);

router.post('/login', 
  validate(authorSchema.login), 
  authorController.login
);

router.get('/', 
  authorController.getAll
);

router.get('/trending', 
  validate(authorSchema.getTrending), 
  authorController.getTrending
);

router.get('/:id', 
  validate(authorSchema.getById), 
  authorController.getById
);

router.get('/:id/stats', 
  authorController.getStats
);

// Protected routes
router.use(authMiddleware); // All routes below require auth

router.get('/profile/me', 
  authorController.getProfile
);

router.put('/:id', 
  validate(authorSchema.update), 
  authorController.update
);

module.exports = router;