const yup = require('yup');

const articleSchema = {
  create: yup.object({
    body: yup.object({
      title: yup.string().required().min(5).max(255),
      summary: yup.string().required().min(50).max(500),
      content: yup.string().required().min(100),
      image_url: yup.string().url(),
      author_id: yup.number().required(),
      categories: yup.array().of(yup.number()).min(1).required(),
      status: yup.string().oneOf(['draft', 'published']).default('draft')
    })
  }),

  update: yup.object({
    body: yup.object({
      title: yup.string().min(5).max(255),
      summary: yup.string().min(50).max(500),
      content: yup.string().min(100),
      image_url: yup.string().url(),
      categories: yup.array().of(yup.number()),
      status: yup.string().oneOf(['draft', 'published'])
    }),
    params: yup.object({
      id: yup.number().required()
    })
  }),

  getById: yup.object({
    params: yup.object({
      id: yup.number().required()
    })
  }),

  getBySlug: yup.object({
    params: yup.object({
      slug: yup.string().required()
    })
  }),

  getAll: yup.object({
    query: yup.object({
      page: yup.number().min(1).default(1),
      limit: yup.number().min(1).max(50).default(10),
      status: yup.string().oneOf(['draft', 'published']),
      category: yup.string(),
      author: yup.number(),
      search: yup.string(),
      sort: yup.string().oneOf(['latest', 'popular', 'trending'])
    })
  })  
};

module.exports = articleSchema;