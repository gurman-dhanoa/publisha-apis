const Article = require("../models/Article.model");
const { uploadFile } = require('../utils/s3');

const articleController = {
  async globalSearch(req, res, next) {
    try {
      const { q, limit } = req.query;

      if (!q || q.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: "Search query must be at least 2 characters",
        });
      }

      const results = await Article.globalSearch(q, limit);

      res.json({
        success: true,
        count: results.length,
        data: results,
      });
    } catch (error) {
      next(error);
    }
  },

  // Create article
  // async create(req, res, next) {
  //   try {
  //     // Ensure author_id matches authenticated user
  //     if (req.body.author_id !== req.user.id) {
  //       return res.status(403).json({
  //         success: false,
  //         error: "Unauthorized",
  //       });
  //     }

  //     const article = await Article.create(req.body);

  //     res.status(201).json({
  //       success: true,
  //       data: article,
  //     });
  //   } catch (error) {
  //     next(error);
  //   }
  // },

  async create(req, res, next) {
    try {
      const data = req.body;

      // 1. Force Author ID (Security)
      data.author_id = req.user.id;

      // 2. Handle Image Upload
      if (req.file) {
        const imageUrl = await uploadFile(req.file);
        data.image_url = imageUrl;
      }

      // 3. Parse Categories (FormData sends arrays as JSON strings)
      if (data.categories) {
        try {
          data.categories = JSON.parse(data.categories);
        } catch (e) {
          data.categories = []; // Fallback if parsing fails
        }
      }

      const article = await Article.create(data);

      res.status(201).json({
        success: true,
        data: article,
      });
    } catch (error) {
      next(error);
    }
  },

  // --- UPDATE ---
  async update(req, res, next) {
    try {
      const articleId = req.params.id;
      const data = req.body;

      // 1. Fetch existing to check ownership
      const existingArticle = await Article.findById(articleId);
      
      if (!existingArticle) {
        return res.status(404).json({ success: false, error: "Article not found" });
      }

      // 2. Strict Ownership Check
      if (existingArticle.author_id !== req.user.id) {
        return res.status(403).json({ 
          success: false, 
          error: "Unauthorized: You do not own this content." 
        });
      }

      // 3. Handle New Image Upload
      if (req.file) {
        const imageUrl = await uploadFile(req.file);
        data.image_url = imageUrl;
      }

      // 4. Parse Categories
      if (data.categories) {
        try {
          data.categories = JSON.parse(data.categories);
        } catch (e) {
          delete data.categories; // Don't update if format is invalid
        }
      }

      const updated = await Article.update(articleId, data);

      res.json({
        success: true,
        data: updated,
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
  // async update(req, res, next) {
  //   try {
  //     const article = await Article.findById(req.params.id);
  //     if (!article) {
  //       return res.status(404).json({
  //         success: false,
  //         error: "Article not found",
  //       });
  //     }

  //     // Ensure user owns the article
  //     if (article.author_id !== req.user.id) {
  //       return res.status(403).json({
  //         success: false,
  //         error: "Unauthorized",
  //       });
  //     }

  //     const updated = await Article.update(req.params.id, req.body);

  //     res.json({
  //       success: true,
  //       data: updated,
  //     });
  //   } catch (error) {
  //     next(error);
  //   }
  // },

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
      const result = await Article.findAll({...req.query, currentUserId: req.user ? req.user.id : null});

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
