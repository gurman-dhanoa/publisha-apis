const Article = require("../models/Article.model");
const { uploadFile } = require('../utils/s3');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const getPaginationData = require('../utils/pagination');

const articleController = {
  globalSearch: catchAsync(async (req, res) => {
    const { q, limit = 10 } = req.query;
    if (!q || q.trim().length < 2) {
      throw new ApiError(400, "Search query must be at least 2 characters");
    }
    const results = await Article.globalSearch(q, limit);
    res.status(200).json(new ApiResponse(200, results));
  }),

  create: catchAsync(async (req, res) => {
    const data = req.body;
    data.author_id = req.user.id;

    if (req.file) data.image_url = await uploadFile(req.file);

    const article = await Article.create(data);
    res.status(201).json(new ApiResponse(201, article, "Article created successfully"));
  }),

  update: catchAsync(async (req, res) => {
    const articleId = req.params.id;
    const existingArticle = await Article.findById(articleId);
    
    if (!existingArticle) throw new ApiError(404, "Article not found");
    if (existingArticle.author_id !== req.user.id) throw new ApiError(403, "Unauthorized: You do not own this content");

    const data = req.body;
    if (req.file) data.image_url = await uploadFile(req.file);

    const updated = await Article.update(articleId, data);
    res.status(200).json(new ApiResponse(200, updated, "Article updated successfully"));
  }),

  getById: catchAsync(async (req, res) => {
    const article = await Article.findById(req.params.id);
    if (!article) throw new ApiError(404, "Article not found");

    // Optimized view increment
    await Article.incrementViews(article.id);

    res.status(200).json(new ApiResponse(200, article));
  }),

  getBySlug: catchAsync(async (req, res) => {
    const article = await Article.findBySlug(req.params.slug);
    if (!article) throw new ApiError(404, "Article not found");

    await Article.incrementViews(article.id);

    res.status(200).json(new ApiResponse(200, article));
  }),

  delete: catchAsync(async (req, res) => {
    const article = await Article.findById(req.params.id);
    if (!article) throw new ApiError(404, "Article not found");
    if (article.author_id !== req.user.id) throw new ApiError(403, "Unauthorized");

    await Article.delete(req.params.id);
    res.status(200).json(new ApiResponse(200, null, "Article deleted successfully"));
  }),

  getAll: catchAsync(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const currentUserId = req.user ? req.user.id : null;

    const { articles, total } = await Article.findAll({
      ...req.query,
      currentUserId,
      page,
      limit
    });

    res.status(200).json(new ApiResponse(200, {
      articles,
      pagination: getPaginationData(total, page, limit)
    }));
  })
};

module.exports = articleController;