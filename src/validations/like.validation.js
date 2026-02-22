const yup = require('yup');

const likeSchema = {
  toggle: yup.object({
    params: yup.object({
      articleId: yup.number().required()
    })
  }),

  getByArticle: yup.object({
    params: yup.object({
      articleId: yup.number().required()
    })
  })
};

module.exports = likeSchema;