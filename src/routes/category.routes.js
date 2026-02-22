const express = require('express');
const router = express.Router();
const Category = require('../models/Category.model');

router.get('/', async (req, res, next) => {
  try {
    const categories = await Category.findAll();
    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
});

router.get('/trending', async (req, res, next) => {
  try {
    const limit = req.query.limit || 10;
    const categories = await Category.getPopular(limit);
    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
});

router.get('/:slug', async (req, res, next) => {
  try {
    const category = await Category.findBySlug(req.params.slug);
    if (!category) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }
    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
});

module.exports = router;