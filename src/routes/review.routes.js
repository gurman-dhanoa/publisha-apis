const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/review.controller");
const validate = require("../middleware/validate");
const reviewSchema = require("../validations/review.validation");
const { authMiddleware } = require("../middleware/auth");
const optionalAuth = require("../middleware/optionalAuth");

router.get("/article/:articleId", validate(reviewSchema.getByArticle), optionalAuth, reviewController.getByArticle);
router.get("/:id", reviewController.getById);

router.use(authMiddleware);
router.post("/", validate(reviewSchema.create), reviewController.create);
router.put("/:id", validate(reviewSchema.update), reviewController.update);
router.delete("/:id", validate(reviewSchema.delete), reviewController.delete);
router.get("/user/me", reviewController.getUserReviews);

module.exports = router;