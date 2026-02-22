const Collection = require('../models/Collection.model');
const Article = require('../models/Article.model');
const logger = require('../utils/logger');

const collectionController = {
  // Create collection
  async create(req, res, next) {
    try {
      // Ensure author_id matches authenticated user
      if (req.body.author_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const collection = await Collection.create(req.body);

      res.status(201).json({
        success: true,
        data: collection
      });
    } catch (error) {
      next(error);
    }
  },

  // Get collection by ID
  async getById(req, res, next) {
    try {
      const collection = await Collection.findById(req.params.id);
      if (!collection) {
        return res.status(404).json({
          success: false,
          error: 'Collection not found'
        });
      }

      res.json({
        success: true,
        data: collection
      });
    } catch (error) {
      next(error);
    }
  },

  // Get collection by slug
  async getBySlug(req, res, next) {
    try {
      const collection = await Collection.findBySlug(req.params.slug);
      if (!collection) {
        return res.status(404).json({
          success: false,
          error: 'Collection not found'
        });
      }

      res.json({
        success: true,
        data: collection
      });
    } catch (error) {
      next(error);
    }
  },

  // Update collection
  async update(req, res, next) {
    try {
      const collection = await Collection.findById(req.params.id);
      if (!collection) {
        return res.status(404).json({
          success: false,
          error: 'Collection not found'
        });
      }

      // Ensure user owns the collection
      if (collection.author_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const updated = await Collection.update(req.params.id, req.body);

      res.json({
        success: true,
        data: updated
      });
    } catch (error) {
      next(error);
    }
  },

  // Delete collection
  async delete(req, res, next) {
    try {
      const collection = await Collection.findById(req.params.id);
      if (!collection) {
        return res.status(404).json({
          success: false,
          error: 'Collection not found'
        });
      }

      // Ensure user owns the collection
      if (collection.author_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      await Collection.delete(req.params.id);

      res.json({
        success: true,
        message: 'Collection deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // Get collections by author
  async getByAuthor(req, res, next) {
    try {
      const { authorId } = req.params;
      const collections = await Collection.getByAuthor(authorId);

      res.json({
        success: true,
        data: collections
      });
    } catch (error) {
      next(error);
    }
  },

  // Add articles to collection
  async addArticles(req, res, next) {
    try {
      const collection = await Collection.findById(req.params.id);
      if (!collection) {
        return res.status(404).json({
          success: false,
          error: 'Collection not found'
        });
      }

      // Ensure user owns the collection
      if (collection.author_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      await Collection.addArticles(req.params.id, req.body.article_ids);
      const updated = await Collection.findById(req.params.id);

      res.json({
        success: true,
        data: updated
      });
    } catch (error) {
      next(error);
    }
  },

  // Remove article from collection
  async removeArticle(req, res, next) {
    try {
      const { collectionId, articleId } = req.params;
      
      const collection = await Collection.findById(collectionId);
      if (!collection) {
        return res.status(404).json({
          success: false,
          error: 'Collection not found'
        });
      }

      // Ensure user owns the collection
      if (collection.author_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      await Collection.removeArticle(collectionId, articleId);
      const updated = await Collection.findById(collectionId);

      res.json({
        success: true,
        data: updated
      });
    } catch (error) {
      next(error);
    }
  },

  // Check if article is in collection
  async checkArticle(req, res, next) {
    try {
      const { collectionId, articleId } = req.params;
      
      const isInCollection = await Collection.isArticleInCollection(collectionId, articleId);
      
      res.json({
        success: true,
        data: { isInCollection }
      });
    } catch (error) {
      next(error);
    }
  },

  async getPopular(req, res, next) {
    try {
      const limit = parseInt(req.query.limit) || 6;
      
      // Protection against massive queries
      const safeLimit = Math.min(limit, 20);

      const collections = await Collection.getPopular(safeLimit);

      res.json({
        success: true,
        count: collections.length,
        data: collections
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = collectionController;