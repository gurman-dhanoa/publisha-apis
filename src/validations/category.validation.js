const yup = require('yup');
const { PAGINATION } = require('../utils/constants');

const categorySchema = {
  create: yup.object({
    body: yup.object({
      name: yup.string().required('Category name is required').min(2).max(50)
    })
  }),
  getAll: yup.object({
    query: yup.object({
      page: yup.number().integer().min(1).default(PAGINATION.DEFAULT_PAGE),
      limit: yup.number().integer().min(1).max(50).default(PAGINATION.DEFAULT_LIMIT)
    })
  })
};
module.exports = categorySchema;