const yup = require("yup");

const likeSchema = {
  getByArticle: yup.object({ params: yup.object({ articleId: yup.number().integer().required() }) }),
  toggle: yup.object({ params: yup.object({ articleId: yup.number().integer().required() }) })
};

module.exports = likeSchema;