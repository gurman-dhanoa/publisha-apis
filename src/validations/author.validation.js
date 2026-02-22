const yup = require('yup');

const authorSchema = {
  register: yup.object({
    body: yup.object({
      name: yup.string().required('Name is required').min(2).max(100),
      email: yup.string().email('Invalid email').required('Email is required'),
      password: yup.string().required('Password is required').min(6).max(100),
      bio: yup.string().max(500),
      preferred_categories: yup.array().of(yup.number()),
      avatar_url: yup.string().url()
    })
  }),

  login: yup.object({
    body: yup.object({
      email: yup.string().email().required(),
      password: yup.string().required()
    })
  }),

  update: yup.object({
    body: yup.object({
      name: yup.string().min(2).max(100),
      bio: yup.string().max(500),
      preferred_categories: yup.array().of(yup.number()),
      avatar_url: yup.string().url(),
      password: yup.string().min(6).max(100)
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

  getTrending: yup.object({
    params: yup.object({
      limit: yup.number().min(1).max(50).default(10),
    })
  })
};

module.exports = authorSchema;