const DB = require('../utils/db');

class Review {
  static async findById(id) {
    const sql = `
      SELECT r.*, au.name as author_name, au.avatar_url as author_avatar, a.title as article_title, a.slug as article_slug
      FROM reviews r
      INNER JOIN authors au ON r.author_id = au.id
      INNER JOIN articles a ON r.article_id = a.id
      WHERE r.id = ? AND a.deleted_at IS NULL AND au.deleted_at IS NULL
    `;
    return await DB.getOne(sql, [id]);
  }

  static async create(data) {
    const existing = await this.findByArticleAndAuthor(data.article_id, data.author_id);
    if (existing) throw new Error('You have already reviewed this article');

    const result = await DB.insert('reviews', {
      article_id: data.article_id,
      author_id: data.author_id,
      rating: data.rating,
      comment: data.comment || null
    });
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
    return await DB.query('DELETE FROM reviews WHERE id = ?', [id]);
  }

  static async findByArticle(articleId, { page = 1, limit = 10 } = {}) {
    const offset = (page - 1) * limit;
    
    const sql = `
      SELECT r.*, au.name as author_name, au.avatar_url as author_avatar
      FROM reviews r
      INNER JOIN authors au ON r.author_id = au.id
      WHERE r.article_id = ? AND au.deleted_at IS NULL
      ORDER BY r.created_at DESC LIMIT ? OFFSET ?
    `;
    const reviews = await DB.query(sql, [articleId, limit, offset]);
    
    const [total] = await DB.query('SELECT COUNT(*) as total FROM reviews r INNER JOIN authors au ON r.author_id = au.id WHERE r.article_id = ? AND au.deleted_at IS NULL', [articleId]);
    const avgResult = await DB.getOne('SELECT AVG(rating) as average FROM reviews r INNER JOIN authors au ON r.author_id = au.id WHERE r.article_id = ? AND au.deleted_at IS NULL', [articleId]);
    const distribution = await DB.query('SELECT rating, COUNT(*) as count FROM reviews r INNER JOIN authors au ON r.author_id = au.id WHERE r.article_id = ? AND au.deleted_at IS NULL GROUP BY rating ORDER BY rating DESC', [articleId]);
    
    return {
      reviews,
      total: total.total,
      summary: {
        average: parseFloat(avgResult.average || 0).toFixed(1),
        distribution
      }
    };
  }

  static async findByAuthor(authorId, { page = 1, limit = 10 } = {}) {
    const offset = (page - 1) * limit;
    
    const sql = `
      SELECT r.*, a.title as article_title, a.slug as article_slug
      FROM reviews r
      INNER JOIN articles a ON r.article_id = a.id
      WHERE r.author_id = ? AND a.deleted_at IS NULL AND a.status = 'published'
      ORDER BY r.created_at DESC LIMIT ? OFFSET ?
    `;
    const reviews = await DB.query(sql, [authorId, limit, offset]);
    const [total] = await DB.query("SELECT COUNT(*) as total FROM reviews r INNER JOIN articles a ON r.article_id = a.id WHERE r.author_id = ? AND a.deleted_at IS NULL AND a.status = 'published'", [authorId]);
    
    return { reviews, total: total.total };
  }

  static async findByArticleAndAuthor(articleId, authorId) {
    return await DB.getOne('SELECT * FROM reviews WHERE article_id = ? AND author_id = ?', [articleId, authorId]);
  }
}
module.exports = Review;