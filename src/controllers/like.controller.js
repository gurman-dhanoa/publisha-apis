const Like = require('../models/Like.model');
const Article = require('../models/Article.model');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

const likeController = {
  toggle: catchAsync(async (req, res) => {
    const { articleId } = req.params;
    const article = await Article.findById(articleId);
    if (!article) throw new ApiError(404, 'Article not found');

    const isLiked = await Like.check(articleId, req.user.id);
    
    if (isLiked) {
      await Like.delete(articleId, req.user.id);
      const likesCount = await Like.count(articleId);
      return res.status(200).json(new ApiResponse(200, { liked: false, likes_count: likesCount }, "Unliked"));
    } else {
      await Like.create(articleId, req.user.id);
      const likesCount = await Like.count(articleId);
      return res.status(200).json(new ApiResponse(200, { liked: true, likes_count: likesCount }, "Liked"));
    }
  }),

  getByArticle: catchAsync(async (req, res) => {
    const { articleId } = req.params;
    const article = await Article.findById(articleId);
    if (!article) throw new ApiError(404, 'Article not found');

    const likes = await Like.findByArticle(articleId);
    const count = await Like.count(articleId);
    const userLiked = req.user ? await Like.check(articleId, req.user.id) : false;

    res.status(200).json(new ApiResponse(200, { likes, count, user_liked: userLiked }));
  }),

  getUserLikes: catchAsync(async (req, res) => {
    const likes = await Like.findByAuthor(req.user.id);
    res.status(200).json(new ApiResponse(200, likes));
  }),

  check: catchAsync(async (req, res) => {
    const isLiked = await Like.check(req.params.articleId, req.user.id);
    res.status(200).json(new ApiResponse(200, { liked: isLiked }));
  })
};
module.exports = likeController;