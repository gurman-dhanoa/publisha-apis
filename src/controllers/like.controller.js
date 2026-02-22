const Like = require('../models/Like.model');
const Article = require('../models/Article.model');
const logger = require('../utils/logger');

const likeController = {
  // Toggle like (create or delete)
  async toggle(req, res, next) {
    try {
      const { articleId } = req.params;
      
      // Check if article exists
      const article = await Article.findById(articleId);
      if (!article) {
        return res.status(404).json({
          success: false,
          error: 'Article not found'
        });
      }

      // Check if already liked
      const isLiked = await Like.check(articleId, req.user.id);
      
      if (isLiked) {
        await Like.delete(articleId, req.user.id);
        const likesCount = await Like.count(articleId);
        
        return res.json({
          success: true,
          data: { liked: false, likes_count: likesCount }
        });
      } else {
        await Like.create(articleId, req.user.id);
        const likesCount = await Like.count(articleId);
        
        return res.json({
          success: true,
          data: { liked: true, likes_count: likesCount }
        });
      }
    } catch (error) {
      next(error);
    }
  },

  // Get likes by article
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

      const likes = await Like.findByArticle(articleId);
      const count = await Like.count(articleId);
      
      // Check if current user liked this article
      let userLiked = false;
      if (req.user) {
        userLiked = await Like.check(articleId, req.user.id);
      }

      res.json({
        success: true,
        data: {
          likes,
          count,
          user_liked: userLiked
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Get articles liked by current user
  async getUserLikes(req, res, next) {
    try {
      const likes = await Like.findByAuthor(req.user.id);
      
      res.json({
        success: true,
        data: likes
      });
    } catch (error) {
      next(error);
    }
  },

  // Check if user liked article
  async check(req, res, next) {
    try {
      const { articleId } = req.params;
      
      const isLiked = await Like.check(articleId, req.user.id);
      
      res.json({
        success: true,
        data: { liked: isLiked }
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = likeController;