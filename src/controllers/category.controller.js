const Category = require("../models/Category.model");
const catchAsync = require("../utils/catchAsync");
const ApiResponse = require("../utils/ApiResponse");
const { getPaginationData } = require("../utils/pagination");

const categoryController = {
  getAll: catchAsync(async (req, res) => {
    const { page, limit } = req.query;
    const { categories, total } = await Category.findAll(page, limit);

    res.status(200).json(
      new ApiResponse(200, {
        categories,
        pagination: getPaginationData(total, page, limit),
      }),
    );
  }),

  getPopular: catchAsync(async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const categories = await Category.getPopular(limit);
    res.status(200).json(new ApiResponse(200, categories));
  }),

  getBySlug: catchAsync(async (req, res) => {
    const category = await Category.findBySlug(req.params.slug);
    if (!category) throw new ApiError(404, "Category not found");
    res.status(200).json(new ApiResponse(200, category));
  }),

  // NEW: Create category endpoint for authors
  create: catchAsync(async (req, res) => {
    const category = await Category.findOrCreate(req.body.name);
    res
      .status(201)
      .json(new ApiResponse(201, category, "Category processed successfully"));
  }),
};

module.exports = categoryController;
