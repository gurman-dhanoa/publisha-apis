const Review = require('../models/Review.model');
const Article = require('../models/Article.model');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const getPaginationData = require('../utils/pagination');

const reviewController = {
  create: catchAsync(async (req, res) => {
    const { article_id } = req.body;
    const article = await Article.findById(article_id);
    
    if (!article) throw new ApiError(404, 'Article not found');
    if (article.status !== 'published') throw new ApiError(400, 'Cannot review unpublished article');
    if (article.author_id === req.user.id) throw new ApiError(400, 'Cannot review your own article');

    try {
      const review = await Review.create({ ...req.body, author_id: req.user.id });
      res.status(201).json(new ApiResponse(201, review, "Review added successfully"));
    } catch (error) {
      if (error.message === 'You have already reviewed this article') {
        throw new ApiError(400, error.message);
      }
      throw error;
    }
  }),

  update: catchAsync(async (req, res) => {
    const review = await Review.findById(req.params.id);
    if (!review) throw new ApiError(404, 'Review not found');
    if (review.author_id !== req.user.id) throw new ApiError(403, 'Unauthorized');

    const updated = await Review.update(req.params.id, req.body);
    res.status(200).json(new ApiResponse(200, updated, "Review updated"));
  }),

  delete: catchAsync(async (req, res) => {
    const review = await Review.findById(req.params.id);
    if (!review) throw new ApiError(404, 'Review not found');
    if (review.author_id !== req.user.id) throw new ApiError(403, 'Unauthorized');

    await Review.delete(req.params.id);
    res.status(200).json(new ApiResponse(200, null, 'Review deleted successfully'));
  }),

  getByArticle: catchAsync(async (req, res) => {
    const { articleId } = req.params;
    const { page, limit } = req.query;
    
    const article = await Article.findById(articleId);
    if (!article) throw new ApiError(404, 'Article not found');

    const { reviews, total, summary } = await Review.findByArticle(articleId, { page, limit });
    const userReview = req.user ? await Review.findByArticleAndAuthor(articleId, req.user.id) : null;

    res.status(200).json(new ApiResponse(200, {
      reviews,
      pagination: getPaginationData(total, page, limit),
      summary,
      user_review: userReview
    }));
  }),

  getUserReviews: catchAsync(async (req, res) => {
    const { page, limit } = req.query;
    const { reviews, total } = await Review.findByAuthor(req.user.id, { page, limit });
    
    res.status(200).json(new ApiResponse(200, {
      reviews,
      pagination: getPaginationData(total, page, limit)
    }));
  }),

  getById: catchAsync(async (req, res) => {
    const review = await Review.findById(req.params.id);
    if (!review) throw new ApiError(404, 'Review not found');
    res.status(200).json(new ApiResponse(200, review));
  })
};
module.exports = reviewController;