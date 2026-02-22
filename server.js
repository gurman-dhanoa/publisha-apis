require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');

const errorHandler = require('./src/middleware/error');
const logger = require('./src/utils/logger');

// Import routes
const authorRoutes = require('./src/routes/author.routes');
const articleRoutes = require('./src/routes/article.routes');
const categoryRoutes = require('./src/routes/category.routes');
const collectionRoutes = require('./src/routes/collection.routes');
const likeRoutes = require('./src/routes/like.routes');
const reviewRoutes = require('./src/routes/review.routes');

const app = express();

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Routes
app.use('/api/authors', authorRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/likes', likeRoutes);
app.use('/api/reviews', reviewRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Error handling
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

module.exports = app;