const express = require("express");
const router = express.Router();
const articleController = require("../controllers/article.controller");
const validate = require("../middleware/validate");
const articleSchema = require("../validations/article.validation");
const { authMiddleware } = require("../middleware/auth");
const optionalAuth = require("../middleware/optionalAuth");
const multer = require("multer");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Public routes
router.get(
  "/search",
  validate(articleSchema.globalSearch),
  articleController.globalSearch,
);

router.get(
  "/",
  validate(articleSchema.getAll),
  optionalAuth,
  articleController.getAll,
);

router.get(
  "/slug/:slug",
  validate(articleSchema.getBySlug),
  articleController.getBySlug,
);

router.get("/:id", validate(articleSchema.getById), articleController.getById);

// Protected routes
router.use(authMiddleware);

router.post(
  "/",
  upload.single("featuredImage"),
  validate(articleSchema.create),
  articleController.create,
);

router.put(
  "/:id",
  upload.single("featuredImage"),
  // validate(articleSchema.update),
  articleController.update,
);

router.delete(
  "/:id",
  validate(articleSchema.getById),
  articleController.delete,
);

module.exports = router;
