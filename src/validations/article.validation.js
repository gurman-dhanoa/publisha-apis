const yup = require("yup");
const { PAGINATION, ARTICLE_STATUS } = require("../utils/constants");

/**
 * Helper to parse stringified arrays coming from Multer FormData
 * If it's a string, it attempts to parse it into an array before Yup validates it.
 */
const parseJsonArray = (value, originalValue) => {
  if (typeof originalValue === "string") {
    try {
      return JSON.parse(originalValue);
    } catch (e) {
      return value; // Pass the raw string so Yup can throw a proper "must be an array" error
    }
  }
  return value;
};

const articleSchema = {
  create: yup.object({
    body: yup.object({
      title: yup.string().required("Title is required").min(5).max(255),
      summary: yup.string().required("Summary is required").min(50).max(500),
      content: yup.string().required("Content is required").min(100),
      image_url: yup.string().url("Must be a valid URL"),
      // author_id REMOVED: Sourced securely from req.user.id in the controller
      categories: yup.array()
        .transform(parseJsonArray)
        .of(yup.number().integer())
        .min(1, "At least one category is required")
        .required("Categories are required"),
      status: yup.string().oneOf([ARTICLE_STATUS.DRAFT, ARTICLE_STATUS.PUBLISHED]).default(ARTICLE_STATUS.DRAFT),
    }),
  }),

  update: yup.object({
    body: yup.object({
      title: yup.string().min(5).max(255),
      summary: yup.string().min(50).max(500),
      content: yup.string().min(100),
      image_url: yup.string().url("Must be a valid URL"),
      categories: yup.array().transform(parseJsonArray).of(yup.number().integer()),
      status: yup.string().oneOf([ARTICLE_STATUS.DRAFT, ARTICLE_STATUS.PUBLISHED]),
    }),
    params: yup.object({
      id: yup.number().integer().required(),
    }),
  }),

  getById: yup.object({
    params: yup.object({
      id: yup.number().integer().required(),
    }),
  }),

  getBySlug: yup.object({
    params: yup.object({
      slug: yup.string().required(),
    }),
  }),

  getAll: yup.object({
    query: yup.object({
      page: yup.number().integer().min(1).default(PAGINATION.DEFAULT_PAGE),
      limit: yup.number().integer().min(1).max(PAGINATION.MAX_LIMIT).default(PAGINATION.DEFAULT_LIMIT),
      status: yup.string().oneOf([ARTICLE_STATUS.DRAFT, ARTICLE_STATUS.PUBLISHED]),
      category: yup.string(), // We query by category slug usually, so string is correct
      author: yup.number().integer(),
      search: yup.string(),
      sort: yup.string().oneOf(["latest", "popular", "trending"]).default("latest"),
    }),
  }),

  globalSearch: yup.object({
    query: yup.object({
      q: yup
        .string()
        .required("Search query is required")
        .min(2, "Search query must be at least 2 characters")
        .max(100, "Search query too long"),
      limit: yup.number().integer().min(1).max(20).default(10),
    }),
  }),
};

module.exports = articleSchema;