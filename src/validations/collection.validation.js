const yup = require("yup");

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
  })
};

module.exports = collectionSchema;