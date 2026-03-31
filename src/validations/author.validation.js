const yup = require('yup');
const { PAGINATION } = require('../utils/constants');

const paginationQuery = yup.object({
  page: yup.number().integer().min(1).default(PAGINATION.DEFAULT_PAGE),
  limit: yup.number().integer().min(1).max(PAGINATION.MAX_LIMIT).default(PAGINATION.DEFAULT_LIMIT)
});

const authorSchema = {
  // --- Passwordless Auth Validations ---
  requestOtp: yup.object({
    body: yup.object({
      email: yup.string().email('Invalid email format').required('Email is required')
    })
  }),

  verifyOtp: yup.object({
    body: yup.object({
      email: yup.string().email('Invalid email format').required('Email is required'),
      otp: yup.string().length(6, 'OTP must be exactly 6 digits').required('OTP is required')
    })
  }),

  googleAuth: yup.object({
    body: yup.object({
      firebaseToken: yup.string().required('Firebase token is required')
    })
  }),

  // --- Profile Management ---
  update: yup.object({
    body: yup.object({
      name: yup.string().min(2).max(100),
      bio: yup.string().max(500),
      preferred_categories: yup.array().of(yup.number().integer()),
      avatar_url: yup.string().url()
      // Password field strictly removed
    }),
    params: yup.object({
      id: yup.number().integer().required()
    })
  }),

  // --- Content Retrieval Validations ---
  getById: yup.object({
    params: yup.object({
      id: yup.number().integer().required()
    })
  }),

  getTrending: yup.object({
    query: yup.object({
      limit: yup.number().integer().min(1).max(15).default(5),
    })
  }),

  getAuthorArticles: yup.object({
    params: yup.object({
      id: yup.number().integer().required()
    }),
    query: paginationQuery.shape({
      status: yup.string().oneOf(['draft', 'published'])
    })
  }),

  getAuthorCollections: yup.object({
    params: yup.object({
      id: yup.number().integer().required()
    }),
    query: paginationQuery
  })
};

module.exports = authorSchema;