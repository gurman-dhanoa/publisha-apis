const Author = require("../models/Author.model");
const jwt = require("jsonwebtoken");
const hash = require("../utils/hash");
const logger = require("../utils/logger");

const authorController = {
  // Register new author
  async register(req, res, next) {
    try {
      const existingAuthor = await Author.findByEmail(req.body.email);
      if (existingAuthor) {
        return res.status(400).json({
          success: false,
          error: "Email already registered",
        });
      }

      const author = await Author.create(req.body);

      const token = jwt.sign(
        { id: author.id, email: author.email },
        process.env.JWT_SECRET,
        { expiresIn: "7d" },
      );

      res.status(201).json({
        success: true,
        data: { author, token },
      });
    } catch (error) {
      next(error);
    }
  },

  // Login
  async login(req, res, next) {
    try {
      const author = await Author.findByEmail(req.body.email);
      if (!author) {
        return res.status(403).json({
          success: false,
          error: "Invalid credentials",
        });
      }

      const isValid = await hash.compare(
        req.body.password,
        author.password_hash,
      );
      if (!isValid) {
        return res.status(403).json({
          success: false,
          error: "Invalid credentials",
        });
      }

      const token = jwt.sign(
        { id: author.id, email: author.email },
        process.env.JWT_SECRET,
        { expiresIn: "7d" },
      );

      delete author.password_hash;

      res.json({
        success: true,
        data: { author, token },
      });
    } catch (error) {
      next(error);
    }
  },

  // Get profile
  async getProfile(req, res, next) {
    try {
      const author = await Author.findById(req.user.id);
      if (!author) {
        return res.status(404).json({
          success: false,
          error: "Author not found",
        });
      }

      const articles = await Author.getArticles(author.id);
      const collections = await Author.getCollections(author.id);

      res.json({
        success: true,
        data: { ...author, articles, collections },
      });
    } catch (error) {
      next(error);
    }
  },

  // Get author by ID
  async getById(req, res, next) {
    try {
      const author = await Author.findById(req.params.id);
      if (!author) {
        return res.status(404).json({
          success: false,
          error: "Author not found",
        });
      }

      // const articles = await Author.getArticles(author.id, {
      //   status: "published",
      // });

      res.json({
        success: true,
        data: { ...author },
      });
    } catch (error) {
      next(error);
    }
  },

  // Update author
  async update(req, res, next) {
    try {
      // Ensure user can only update their own profile
      if (parseInt(req.params.id) !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: "Unauthorized",
        });
      }
      const author = await Author.update(req.params.id, req.body);
      if (!author) {
        return res.status(404).json({
          success: false,
          error: "Author not found",
        });
      }

      res.json({
        success: true,
        data: author,
      });
    } catch (error) {
      next(error);
    }
  },

  // Get all authors
  async getAll(req, res, next) {
    try {
      const { page, limit } = req.query;
      const result = await Author.findAll({ page, limit });

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  },

  // Get author stats
  async getStats(req, res, next) {
    try {
      const authorId = parseInt(req.params.id);

      // Verify access
      // if (parseInt(req.params.id) && req.params.id != req.user.id) {
      //   return res.status(403).json({
      //     success: false,
      //     error: "Unauthorized",
      //   });
      // }

      const articles = await Author.getArticles(authorId);

      const stats = {
        total_articles: articles.length,
        published_articles: articles.filter((a) => a.status === "published")
          .length,
        total_views: articles.reduce((sum, a) => sum + (a.views_count || 0), 0),
        total_likes: articles.reduce((sum, a) => sum + (a.likes_count || 0), 0),
        avg_rating:
          articles.reduce(
            (sum, a) => sum + (parseFloat(a.avg_rating) || 0),
            0,
          ) / articles.length || 0,
      };

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  },

  async getTrending(req, res, next) {
    try {
      // Default to 5 trending authors, maximum 15
      let limit = parseInt(req.query.limit) || 5;
      if (limit > 15) limit = 15;

      const trendingAuthors = await Author.getTrending(limit);

      res.json({
        success: true,
        count: trendingAuthors.length,
        data: trendingAuthors,
      });
    } catch (error) {
      logger.error(`Error in getTrendingAuthors: ${error.message}`);
      next(error);
    }
  },
};

module.exports = authorController;
