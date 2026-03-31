const yup = require('yup');

const adminSchema = {
  requestOtp: yup.object({
    body: yup.object({
      email: yup.string().email('Invalid email').required('Email is required')
    })
  }),

  verifyOtp: yup.object({
    body: yup.object({
      email: yup.string().email('Invalid email').required('Email is required'),
      otp: yup.string().length(6, 'OTP must be exactly 6 digits').required('OTP is required')
    })
  }),

  // Reusable schema for both initial setup verification and subsequent logins
  verifyMfa: yup.object({
    body: yup.object({
      token: yup.string().length(6, 'Authenticator code must be exactly 6 digits').required('Code is required')
    })
  })
};

module.exports = adminSchema;