const express = require("express");
const router = express.Router();
const likeController = require("../controllers/like.controller");
const validate = require("../middleware/validate");
const likeSchema = require("../validations/like.validation");
const { authMiddleware } = require("../middleware/auth");
const optionalAuth = require("../middleware/optionalAuth");

router.get("/article/:articleId", validate(likeSchema.getByArticle), optionalAuth, likeController.getByArticle);

router.use(authMiddleware);
router.post("/article/:articleId/toggle", validate(likeSchema.toggle), likeController.toggle);
router.get("/user/me", likeController.getUserLikes);
router.get("/article/:articleId/check", validate(likeSchema.toggle), likeController.check);

module.exports = router;