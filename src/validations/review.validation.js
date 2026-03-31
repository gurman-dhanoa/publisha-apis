const yup = require("yup");
const { PAGINATION } = require("../utils/constants");

const reviewSchema = {
  create: yup.object({
    body: yup.object({
      article_id: yup.number().integer().required("Article ID is required"),
      rating: yup.number().integer().min(1).max(5).required("Rating must be between 1 and 5"),
      comment: yup.string().max(1000).nullable()
    })
  }),
  update: yup.object({
    params: yup.object({ id: yup.number().integer().required() }),
    body: yup.object({
      rating: yup.number().integer().min(1).max(5),
      comment: yup.string().max(1000).nullable()
    })
  }),
  delete: yup.object({ params: yup.object({ id: yup.number().integer().required() }) }),
  getByArticle: yup.object({
    params: yup.object({ articleId: yup.number().integer().required() }),
    query: yup.object({
      page: yup.number().integer().min(1).default(PAGINATION.DEFAULT_PAGE),
      limit: yup.number().integer().min(1).max(50).default(PAGINATION.DEFAULT_LIMIT)
    })
  })
};

module.exports = reviewSchema;