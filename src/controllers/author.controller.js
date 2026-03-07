const Author = require("../models/Author.model");
const jwt = require("jsonwebtoken");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const catchAsync = require("../utils/catchAsync");
const getPaginationData = require("../utils/pagination");
const { PAGINATION } = require("../utils/constants");
const crypto = require('crypto');
const { sendOtpEmail } = require('../services/email.service');
const { verifyFirebaseToken } = require('../services/firebase.service');
const DB = require("../utils/db");

const authorController = {
  requestOtp: catchAsync(async (req, res) => {
    const { email } = req.body;

    // Generate a 6-digit numeric OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Check if author exists. If not, create a placeholder profile.
    let author = await Author.findByEmail(email);
    if (!author) {
      author = await Author.create({ email, name: email.split("@")[0] }); // Shell account
    }

    // Update the author record with the OTP
    await DB.update("authors", { otp, otp_expires_at: expiresAt }, "id = ?", [
      author.id,
    ]);

    await sendOtpEmail(email, otp);

    res
      .status(200)
      .json(new ApiResponse(200, null, "OTP sent to email successfully"));
  }),

  verifyOtp: catchAsync(async (req, res) => {
    const { email, otp } = req.body;
    const author = await Author.findByEmail(email);

    if (!author || author.otp !== otp) {
      throw new ApiError(401, "Invalid or expired OTP");
    }

    // Check expiration
    if (new Date() > new Date(author.otp_expires_at)) {
      throw new ApiError(401, "OTP has expired");
    }

    // Clear the OTP so it can't be reused
    await DB.update('authors', { otp: null, otp_expires_at: null }, 'id = ?', [author.id]);

    const token = jwt.sign({ id: author.id, email: author.email }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.status(200).json(new ApiResponse(200, { author, token }, "Authentication successful"));
  }),

  // 3. Google Auth Flow
  googleAuth: catchAsync(async (req, res) => {
    const { firebaseToken } = req.body;
    
    // Verify token via Firebase Admin
    const decodedToken = await verifyFirebaseToken(firebaseToken);
    const { email, name, picture, uid } = decodedToken;

    let author = await Author.findByEmail(email);

    if (!author) {
      // First time logging in with Google
      author = await Author.create({
        email,
        name: name || email.split('@')[0],
        avatar_url: picture,
        google_id: uid
      });
    } else if (!author.google_id) {
      // Existing user (maybe via OTP previously), now linking Google
      await DB.update('authors', { google_id: uid, avatar_url: picture }, 'id = ?', [author.id]);
    }

    const token = jwt.sign({ id: author.id, email: author.email }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.status(200).json(new ApiResponse(200, { author, token }, "Google authentication successful"));
  }),

  // Optimized: Removed heavy payload. Only fetches profile.
  getProfile: catchAsync(async (req, res) => {
    const author = await Author.findById(req.user.id);
    if (!author) {
      throw new ApiError(404, "Author not found");
    }

    res.status(200).json(new ApiResponse(200, author, "Profile retrieved"));
  }),

  getById: catchAsync(async (req, res) => {
    const author = await Author.findById(req.params.id);
    if (!author) {
      throw new ApiError(404, "Author not found");
    }

    res.status(200).json(new ApiResponse(200, author, "Author retrieved"));
  }),

  update: catchAsync(async (req, res) => {
    if (parseInt(req.params.id) !== req.user.id) {
      throw new ApiError(403, "Unauthorized to update this profile");
    }

    const author = await Author.update(req.params.id, req.body);
    res.status(200).json(new ApiResponse(200, author, "Profile updated"));
  }),

  getAll: catchAsync(async (req, res) => {
    const page = parseInt(req.query.page) || PAGINATION.DEFAULT_PAGE;
    const limit = parseInt(req.query.limit) || PAGINATION.DEFAULT_LIMIT;
    const { search, categoryId } = req.query;

    const { authors, total } = await Author.findAll({
      search,
      categoryId,
      page,
      limit,
    });

    res.status(200).json(
      new ApiResponse(200, {
        authors,
        pagination: getPaginationData(total, page, limit),
      }),
    );
  }),

  getStats: catchAsync(async (req, res) => {
    const authorId = parseInt(req.params.id);

    // We can fetch unpaginated for raw calculations, or optimize this later
    // with a dedicated SQL aggregation query for absolute maximum performance.
    const articles = await Author.getArticles(authorId, { limit: 10000 });

    const stats = {
      total_articles: articles.length,
      published_articles: articles.filter((a) => a.status === "published")
        .length,
      total_likes: articles.reduce((sum, a) => sum + (a.likes_count || 0), 0),
      avg_rating:
        articles.reduce((sum, a) => sum + (parseFloat(a.avg_rating) || 0), 0) /
        (articles.length || 1),
    };

    res.status(200).json(new ApiResponse(200, stats));
  }),

  getTrending: catchAsync(async (req, res) => {
    let limit = parseInt(req.query.limit) || 5;
    if (limit > 15) limit = 15;

    const trendingAuthors = await Author.getTrending(limit);
    res
      .status(200)
      .json(
        new ApiResponse(200, trendingAuthors, "Trending authors retrieved"),
      );
  }),

  getAuthorArticles: catchAsync(async (req, res) => {
    const { id } = req.params;
    const { page, limit, status } = req.query; // Types are now guaranteed by Yup

    // Optional: Check if author exists first, or just return an empty array
    const articles = await Author.getArticles(id, { status, page, limit });

    res
      .status(200)
      .json(new ApiResponse(200, articles, "Author articles retrieved"));
  }),

  getAuthorCollections: catchAsync(async (req, res) => {
    const { id } = req.params;
    const { page, limit } = req.query;

    const collections = await Author.getCollections(id, { page, limit });

    res
      .status(200)
      .json(new ApiResponse(200, collections, "Author collections retrieved"));
  }),
};

module.exports = authorController;
