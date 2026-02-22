const Review = require('../models/Review.model');
const Article = require('../models/Article.model');
const logger = require('../utils/logger');

const reviewController = {
  // Create review
  async create(req, res, next) {
    try {
      const { article_id } = req.body;
      
      // Check if article exists and is published
      const article = await Article.findById(article_id);
      if (!article) {
        return res.status(404).json({
          success: false,
          error: 'Article not found'
        });
      }

      if (article.status !== 'published') {
        return res.status(400).json({
          success: false,
          error: 'Cannot review unpublished article'
        });
      }

      // Prevent self-review
      if (article.author_id === req.user.id) {
        return res.status(400).json({
          success: false,
          error: 'Cannot review your own article'
        });
      }

      const reviewData = {
        ...req.body,
        author_id: req.user.id
      };

      const review = await Review.create(reviewData);
      
      res.status(201).json({
        success: true,
        data: review
      });
    } catch (error) {
      if (error.message === 'You have already reviewed this article') {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }
      next(error);
    }
  },

  // Update review
  async update(req, res, next) {
    try {
      const review = await Review.findById(req.params.id);
      if (!review) {
        return res.status(404).json({
          success: false,
          error: 'Review not found'
        });
      }

      // Ensure user owns the review
      if (review.author_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const updated = await Review.update(req.params.id, req.body);
      
      res.json({
        success: true,
        data: updated
      });
    } catch (error) {
      next(error);
    }
  },

  // Delete review
  async delete(req, res, next) {
    try {
      const review = await Review.findById(req.params.id);
      if (!review) {
        return res.status(404).json({
          success: false,
          error: 'Review not found'
        });
      }

      // Ensure user owns the review
      if (review.author_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      await Review.delete(req.params.id);
      
      res.json({
        success: true,
        message: 'Review deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // Get reviews by article
  async getByArticle(req, res, next) {
    try {
      const { articleId } = req.params;
      
      const article = await Article.findById(articleId);
      if (!article) {
        return res.status(404).json({
          success: false,
          error: 'Article not found'
        });
      }

      const result = await Review.findByArticle(articleId, req.query);
      
      // Check if current user reviewed this article
      let userReview = null;
      if (req.user) {
        userReview = await Review.findByArticleAndAuthor(articleId, req.user.id);
      }

      res.json({
        success: true,
        ...result,
        user_review: userReview
      });
    } catch (error) {
      next(error);
    }
  },

  // Get reviews by current user
  async getUserReviews(req, res, next) {
    try {
      const result = await Review.findByAuthor(req.user.id, req.query);
      
      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  },

  // Get review by ID
  async getById(req, res, next) {
    try {
      const review = await Review.findById(req.params.id);
      if (!review) {
        return res.status(404).json({
          success: false,
          error: 'Review not found'
        });
      }

      res.json({
        success: true,
        data: review
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = reviewController;