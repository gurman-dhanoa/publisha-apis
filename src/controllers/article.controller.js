const Article = require("../models/Article.model");
const logger = require("../utils/logger");

const articleController = {
  // Create article
  async create(req, res, next) {
    try {
      // Ensure author_id matches authenticated user
      if (req.body.author_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: "Unauthorized",
        });
      }

      const article = await Article.create(req.body);

      res.status(201).json({
        success: true,
        data: article,
      });
    } catch (error) {
      next(error);
    }
  },

  // Get article by ID
  async getById(req, res, next) {
    try {
      const article = await Article.findById(req.params.id);
      if (!article) {
        return res.status(404).json({
          success: false,
          error: "Article not found",
        });
      }

      // Record view
      const ip = req.ip || req.connection.remoteAddress;
      await Article.incrementViews(article.id, ip, req.user?.id);

      res.json({
        success: true,
        data: article,
      });
    } catch (error) {
      next(error);
    }
  },

  // Get article by slug
  async getBySlug(req, res, next) {
    try {
      const article = await Article.findBySlug(req.params.slug);
      if (!article) {
        return res.status(404).json({
          success: false,
          error: "Article not found",
        });
      }

      // Record view
      const ip = req.ip || req.connection.remoteAddress;
      await Article.incrementViews(article.id, ip, req.user?.id);

      res.json({
        success: true,
        data: article,
      });
    } catch (error) {
      next(error);
    }
  },

  // Update article
  async update(req, res, next) {
    try {
      const article = await Article.findById(req.params.id);
      if (!article) {
        return res.status(404).json({
          success: false,
          error: "Article not found",
        });
      }

      // Ensure user owns the article
      if (article.author_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: "Unauthorized",
        });
      }

      const updated = await Article.update(req.params.id, req.body);

      res.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  },

  // Delete article
  async delete(req, res, next) {
    try {
      const article = await Article.findById(req.params.id);
      if (!article) {
        return res.status(404).json({
          success: false,
          error: "Article not found",
        });
      }

      // Ensure user owns the article
      if (article.author_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: "Unauthorized",
        });
      }

      await Article.delete(req.params.id);

      res.json({
        success: true,
        message: "Article deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  },

  // Get all articles
  async getAll(req, res, next) {
    try {
      const result = await Article.findAll(req.query);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  },

  // Get articles by author
  async getByAuthor(req, res, next) {
    try {
      const { id } = req.params;
      const { page, limit, status } = req.query;

      // Only show published articles unless it's the author
      let articleStatus = "published";
      if (req.user && req.user.id === parseInt(id)) {
        articleStatus = status || "all";
      }

      const articles = await Article.findAll({
        author: id,
        status: articleStatus,
        page,
        limit,
      });

      res.json({
        success: true,
        ...articles,
      });
    } catch (error) {
      next(error);
    }
  },

};

module.exports = articleController;
