const yup = require('yup');

const collectionSchema = {
  create: yup.object({
    body: yup.object({
      name: yup.string().required().min(3).max(100),
      description: yup.string().max(500),
      author_id: yup.number().required(),
      article_ids: yup.array().of(yup.number())
    })
  }),

  update: yup.object({
    body: yup.object({
      name: yup.string().min(3).max(100),
      description: yup.string().max(500)
    }),
    params: yup.object({
      id: yup.number().required()
    })
  }),

  addArticles: yup.object({
    body: yup.object({
      article_ids: yup.array().of(yup.number()).min(1).required()
    }),
    params: yup.object({
      id: yup.number().required()
    })
  }),

  removeArticle: yup.object({
    params: yup.object({
      collectionId: yup.number().required(),
      articleId: yup.number().required()
    })
  })
};

module.exports = collectionSchema;