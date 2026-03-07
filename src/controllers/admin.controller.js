const Admin = require("../models/Admin.model");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const otplib = require("otplib");
const qrcode = require("qrcode");
const { sendOtpEmail } = require("../services/email.service");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const catchAsync = require("../utils/catchAsync");

const adminController = {
  // STEP 1: Admin enters email -> Send Email OTP
  requestOtp: catchAsync(async (req, res) => {
    const { email } = req.body;
    const admin = await Admin.findByEmail(email);

    if (!admin) {
      // For security, don't reveal if the admin exists or not to prevent enumeration
      return res.status(200).json(new ApiResponse(200, null, "If the email exists, an OTP has been sent."));
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    await Admin.update(admin.id, { otp, otp_expires_at: expiresAt });
    await sendOtpEmail(email, otp); // Reusing your Brevo service

    res.status(200).json(new ApiResponse(200, null, "OTP sent to admin email"));
  }),

  // STEP 2: Admin enters Email OTP -> Return Temp Token
  verifyOtp: catchAsync(async (req, res) => {
    const { email, otp } = req.body;
    const admin = await Admin.findByEmail(email);

    if (!admin || admin.otp !== otp || new Date() > new Date(admin.otp_expires_at)) {
      throw new ApiError(401, "Invalid or expired OTP");
    }

    // Clear the OTP to prevent reuse
    await Admin.update(admin.id, { otp: null, otp_expires_at: null });

    // Issue a short-lived temporary token purely for the MFA step
    const tempToken = jwt.sign(
      { id: admin.id, email: admin.email, mfa_pending: true },
      process.env.JWT_SECRET,
      { expiresIn: "5m" } // Strict 5-minute window to enter Authenticator code
    );

    res.status(200).json(new ApiResponse(200, {
      tempToken,
      mfaEnabled: !!admin.mfa_enabled,
      message: admin.mfa_enabled ? "Proceed to MFA" : "MFA Setup Required"
    }));
  }),

  // STEP 3A (First Time Only): Generate QR Code for Authenticator App
  setupMfa: catchAsync(async (req, res) => {
    // Note: req.admin would be set by a middleware that verifies the tempToken
    const admin = await Admin.findById(req.admin.id); 

    if (admin.mfa_enabled) {
      throw new ApiError(400, "MFA is already set up for this account");
    }

    const secret = otplib.authenticator.generateSecret();
    
    // Save the unverified secret to the database temporarily
    await Admin.update(admin.id, { mfa_secret: secret });

    // Create the URL for Google Authenticator / Authy
    const otpauth = otplib.authenticator.keyuri(admin.email, "Publisha Admin", secret);
    
    // Generate the QR Code image as a base64 string
    const qrCodeUrl = await qrcode.toDataURL(otpauth);

    res.status(200).json(new ApiResponse(200, { qrCodeUrl, secret }, "Scan this QR code with your Authenticator app"));
  }),

  // STEP 3B (First Time Only): Verify the first code to enable MFA permanently
  verifyMfaSetup: catchAsync(async (req, res) => {
    const { token } = req.body; // The 6-digit code from the app
    const admin = await Admin.findByEmail(req.admin.email);

    const isValid = otplib.authenticator.check(token, admin.mfa_secret);

    if (!isValid) {
      throw new ApiError(401, "Invalid Authenticator code");
    }

    // Lock it in!
    await Admin.update(admin.id, { mfa_enabled: true });

    // Issue the final, fully-authorized Admin Token
    const authToken = jwt.sign(
      { id: admin.id, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    );

    res.status(200).json(new ApiResponse(200, { authToken }, "MFA setup complete. Logged in successfully."));
  }),

  // STEP 4 (Every subsequent login): Verify the Authenticator code
  verifyMfaLogin: catchAsync(async (req, res) => {
    const { token } = req.body; // The 6-digit code from the app
    const admin = await Admin.findByEmail(req.admin.email);

    if (!admin.mfa_enabled) {
      throw new ApiError(400, "MFA is not enabled on this account");
    }

    const isValid = otplib.authenticator.check(token, admin.mfa_secret);

    if (!isValid) {
      throw new ApiError(401, "Invalid Authenticator code");
    }

    // Issue the final, fully-authorized Admin Token
    const authToken = jwt.sign(
      { id: admin.id, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    );

    res.status(200).json(new ApiResponse(200, { authToken }, "Admin login successful"));
  })
};

module.exports = adminController;