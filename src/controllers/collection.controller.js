const Collection = require("../models/Collection.model");
const catchAsync = require("../utils/catchAsync");
const ApiResponse = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");

const collectionController = {
  create: catchAsync(async (req, res) => {
    // SECURITY: Force the author_id to the logged-in user
    const data = { ...req.body, author_id: req.user.id };
    
    const collection = await Collection.create(data);
    res.status(201).json(new ApiResponse(201, collection, "Collection created successfully"));
  }),

  getById: catchAsync(async (req, res) => {
    const collection = await Collection.findById(req.params.id);
    if (!collection) throw new ApiError(404, "Collection not found");
    res.status(200).json(new ApiResponse(200, collection));
  }),

  getBySlug: catchAsync(async (req, res) => {
    const collection = await Collection.findBySlug(req.params.slug);
    if (!collection) throw new ApiError(404, "Collection not found");
    res.status(200).json(new ApiResponse(200, collection));
  }),

  update: catchAsync(async (req, res) => {
    const collection = await Collection.findById(req.params.id);
    if (!collection) throw new ApiError(404, "Collection not found");
    if (collection.author_id !== req.user.id) throw new ApiError(403, "Unauthorized: You do not own this collection");

    const updated = await Collection.update(req.params.id, req.body);
    res.status(200).json(new ApiResponse(200, updated, "Collection updated successfully"));
  }),

  delete: catchAsync(async (req, res) => {
    const collection = await Collection.findById(req.params.id);
    if (!collection) throw new ApiError(404, "Collection not found");
    if (collection.author_id !== req.user.id) throw new ApiError(403, "Unauthorized");

    await Collection.delete(req.params.id);
    res.status(200).json(new ApiResponse(200, null, "Collection deleted successfully"));
  }),

  getByAuthor: catchAsync(async (req, res) => {
    const collections = await Collection.getByAuthor(req.params.authorId);
    res.status(200).json(new ApiResponse(200, collections));
  }),

  addArticles: catchAsync(async (req, res) => {
    const collection = await Collection.findById(req.params.id);
    if (!collection) throw new ApiError(404, "Collection not found");
    if (collection.author_id !== req.user.id) throw new ApiError(403, "Unauthorized");

    await Collection.addArticles(req.params.id, req.body.article_ids);
    const updated = await Collection.findById(req.params.id);
    
    res.status(200).json(new ApiResponse(200, updated, "Articles added to collection"));
  }),

  removeArticle: catchAsync(async (req, res) => {
    const { collectionId, articleId } = req.params;
    const collection = await Collection.findById(collectionId);
    
    if (!collection) throw new ApiError(404, "Collection not found");
    if (collection.author_id !== req.user.id) throw new ApiError(403, "Unauthorized");

    await Collection.removeArticle(collectionId, articleId);
    const updated = await Collection.findById(collectionId);
    
    res.status(200).json(new ApiResponse(200, updated, "Article removed from collection"));
  }),

  checkArticle: catchAsync(async (req, res) => {
    const { collectionId, articleId } = req.params;
    const isInCollection = await Collection.isArticleInCollection(collectionId, articleId);
    res.status(200).json(new ApiResponse(200, { isInCollection }));
  }),

  getPopular: catchAsync(async (req, res) => {
    const safeLimit = Math.min(parseInt(req.query.limit) || 6, 20);
    const collections = await Collection.getPopular(safeLimit);
    res.status(200).json(new ApiResponse(200, collections));
  })
};

module.exports = collectionController;