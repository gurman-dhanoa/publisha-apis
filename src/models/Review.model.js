const DB = require('../utils/db');

class Review {
  static async findById(id) {
    const sql = `
      SELECT r.*, 
        au.name as author_name, au.avatar_url as author_avatar,
        a.title as article_title, a.slug as article_slug
      FROM reviews r
      LEFT JOIN authors au ON r.author_id = au.id
      LEFT JOIN articles a ON r.article_id = a.id
      WHERE r.id = ?
    `;
    return await DB.getOne(sql, [id]);
  }

  static async create(data) {
    // Check if author already reviewed this article
    const existing = await this.findByArticleAndAuthor(data.article_id, data.author_id);
    if (existing) {
      throw new Error('You have already reviewed this article');
    }

    const reviewData = {
      article_id: data.article_id,
      author_id: data.author_id,
      rating: data.rating,
      comment: data.comment || null
    };

    const result = await DB.insert('reviews', reviewData);
    return this.findById(result.insertId);
  }

  static async update(id, data) {
    const updateData = {};
    
    if (data.rating) updateData.rating = data.rating;
    if (data.comment !== undefined) updateData.comment = data.comment;

    await DB.update('reviews', updateData, 'id = ?', [id]);
    return this.findById(id);
  }

  static async delete(id) {
    const sql = 'DELETE FROM reviews WHERE id = ?';
    return await DB.query(sql, [id]);
  }

  static async findByArticle(articleId, { page = 1, limit = 10 } = {}) {
    const offset = (page - 1) * limit;
    
    const sql = `
      SELECT r.*, 
        au.name as author_name, au.avatar_url as author_avatar
      FROM reviews r
      LEFT JOIN authors au ON r.author_id = au.id
      WHERE r.article_id = ?
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const reviews = await DB.query(sql, [articleId, limit, offset]);
    
    const countSql = 'SELECT COUNT(*) as total FROM reviews WHERE article_id = ?';
    const [total] = await DB.query(countSql, [articleId]);
    
    // Get average rating
    const avgSql = 'SELECT AVG(rating) as average FROM reviews WHERE article_id = ?';
    const avgResult = await DB.getOne(avgSql, [articleId]);
    
    // Get rating distribution
    const distSql = `
      SELECT rating, COUNT(*) as count
      FROM reviews
      WHERE article_id = ?
      GROUP BY rating
      ORDER BY rating DESC
    `;
    const distribution = await DB.query(distSql, [articleId]);
    
    return {
      data: reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total.total,
        pages: Math.ceil(total.total / limit)
      },
      summary: {
        average: parseFloat(avgResult.average || 0).toFixed(1),
        total: total.total,
        distribution
      }
    };
  }

  static async findByAuthor(authorId, { page = 1, limit = 10 } = {}) {
    const offset = (page - 1) * limit;
    
    const sql = `
      SELECT r.*, 
        a.title as article_title, a.slug as article_slug
      FROM reviews r
      LEFT JOIN articles a ON r.article_id = a.id
      WHERE r.author_id = ?
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const reviews = await DB.query(sql, [authorId, limit, offset]);
    
    const countSql = 'SELECT COUNT(*) as total FROM reviews WHERE author_id = ?';
    const [total] = await DB.query(countSql, [authorId]);
    
    return {
      data: reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total.total,
        pages: Math.ceil(total.total / limit)
      }
    };
  }

  static async findByArticleAndAuthor(articleId, authorId) {
    const sql = 'SELECT * FROM reviews WHERE article_id = ? AND author_id = ?';
    return await DB.getOne(sql, [articleId, authorId]);
  }

  static async getAverageRating(articleId) {
    const sql = 'SELECT AVG(rating) as average FROM reviews WHERE article_id = ?';
    const result = await DB.getOne(sql, [articleId]);
    return parseFloat(result.average || 0).toFixed(1);
  }

  static async deleteAll(articleId) {
    const sql = 'DELETE FROM reviews WHERE article_id = ?';
    return await DB.query(sql, [articleId]);
  }
}

module.exports = Review;