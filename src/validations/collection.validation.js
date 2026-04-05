const yup = require("yup");
const { PAGINATION } = require("../utils/constants");

const collectionSchema = {
  create: yup.object({
    body: yup.object({
      name: yup.string().required("Name is required").min(3).max(100),
      description: yup.string().max(500).nullable(),
      article_ids: yup.array().of(yup.number().integer()).default([]),
    })
  }),
  update: yup.object({
    params: yup.object({ id: yup.number().integer().required() }),
    body: yup.object({
      name: yup.string().min(3).max(100),
      description: yup.string().max(500).nullable(),
      article_ids: yup.array().of(yup.number().integer())
    })
  }),
  addArticles: yup.object({
    params: yup.object({ id: yup.number().integer().required() }),
    body: yup.object({
      article_ids: yup.array().of(yup.number().integer()).min(1).required("Provide at least one article ID")
    })
  }),
  removeArticle: yup.object({
    params: yup.object({
      collectionId: yup.number().integer().required(),
      articleId: yup.number().integer().required()
    })
  }),
  authorCollections: yup.object({
    params: yup.object({
      authorId: yup.number().integer().required()
    }),
    query: yup.object({
      page: yup.number().integer().min(1).default(PAGINATION.DEFAULT_PAGE),
      limit: yup.number().integer().min(1).max(PAGINATION.MAX_LIMIT).default(PAGINATION.DEFAULT_LIMIT),
    }),
  }),
};

module.exports = collectionSchema;