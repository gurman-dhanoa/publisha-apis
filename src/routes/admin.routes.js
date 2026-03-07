const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");
const validate = require("../middleware/validate");
const adminSchema = require("../validations/admin.validation");
const { authMiddleware } = require("../middleware/auth");

// Public Step 1 & 2: Email OTP Flow
router.post(
  "/request-otp",
  validate(adminSchema.requestOtp),
  adminController.requestOtp,
);

router.post(
  "/verify-otp",
  validate(adminSchema.verifyOtp),
  adminController.verifyOtp,
);

// Protected Steps: Require the 5-minute tempToken from verify-otp
router.use(authMiddleware);

// Generate the QR Code (First time only)
router.get("/mfa/setup", adminController.setupMfa);

// Verify the first code to lock in MFA (First time only)
router.post(
  "/mfa/setup/verify",
  validate(adminSchema.verifyMfa),
  adminController.verifyMfaSetup,
);

// Standard Login Verification (Every time after setup)
router.post(
  "/mfa/verify",
  validate(adminSchema.verifyMfa),
  adminController.verifyMfaLogin,
);

module.exports = router;
