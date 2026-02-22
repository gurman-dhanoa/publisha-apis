const yup = require('yup');

const reviewSchema = {
  create: yup.object({
    body: yup.object({
      article_id: yup.number().required(),
      rating: yup.number().required().min(1).max(5),
      comment: yup.string().max(1000)
    })
  }),

  update: yup.object({
    body: yup.object({
      rating: yup.number().min(1).max(5),
      comment: yup.string().max(1000)
    }),
    params: yup.object({
      id: yup.number().required()
    })
  }),

  getByArticle: yup.object({
    params: yup.object({
      articleId: yup.number().required()
    }),
    query: yup.object({
      page: yup.number().min(1).default(1),
      limit: yup.number().min(1).max(50).default(10)
    })
  }),

  delete: yup.object({
    params: yup.object({
      id: yup.number().required()
    })
  })
};

module.exports = reviewSchema;