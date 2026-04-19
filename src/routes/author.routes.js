const express = require("express");
const router = express.Router();
const authorController = require("../controllers/author.controller");
const validate = require("../middleware/validate");
const authorSchema = require("../validations/author.validation");
const { authMiddleware } = require("../middleware/auth");

router.post(
  "/request-otp",
  validate(authorSchema.requestOtp),
  authorController.requestOtp,
);

router.get(
  "/sitemap",
  authorController.getAllAuthorsForSitemap,
);

router.post(
  "/verify-otp",
  validate(authorSchema.verifyOtp),
  authorController.verifyOtp,
);

router.post(
  "/google-auth",
  validate(authorSchema.googleAuth),
  authorController.googleAuth,
);

router.get("/", authorController.getAll);

router.get(
  "/trending",
  validate(authorSchema.getTrending),
  authorController.getTrending,
);

router.get("/:id", validate(authorSchema.getById), authorController.getById);

router.get("/:id/stats", validate(authorSchema.getById), authorController.getStats);

router.get(
  "/:id/articles",
  validate(authorSchema.getAuthorArticles),
  authorController.getAuthorArticles,
);

router.get(
  "/:id/articles/active",
  validate(authorSchema.getAuthorArticles),
  authorController.getPublishedArticles,
);

router.get(
  "/:id/collections",
  validate(authorSchema.getAuthorCollections),
  authorController.getAuthorCollections,
);

router.use(authMiddleware);

router.get("/profile/me", authorController.getProfile);

router.put("/:id", validate(authorSchema.update), authorController.update);

module.exports = router;
