const axios = require('axios');
const logger = require('../utils/logger');

const sendOtpEmail = async (email, otp) => {
  try {
    await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: { name: 'Publisha', email: 'publisha01@gmail.com' }, // Update with your verified Brevo email
        to: [{ email }],
        subject: 'Your Publisha Access Code',
        htmlContent: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a202c;">
            <h2 style="color: #0d1b2a;">Publisha Authentication</h2>
            <p>Your premium access code is:</p>
            <h1 style="letter-spacing: 4px; color: #d4af37;">${otp}</h1>
            <p style="font-size: 12px; color: #718096;">This code expires in 10 minutes. If you did not request this, please ignore this email.</p>
          </div>
        `
      },
      {
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    logger.error(`Brevo Email Error: ${error.message}`);
    throw new Error('Failed to send OTP email');
  }
};

module.exports = { sendOtpEmail };