const DB = require('../utils/db');

class Like {
  static async create(articleId, authorId) {
    try {
      const likeData = {
        article_id: articleId,
        author_id: authorId
      };
      
      const result = await DB.insert('likes', likeData);
      return { id: result.insertId, article_id: articleId, author_id: authorId };
    } catch (error) {
      if (error.message.includes('Duplicate entry')) {
        return null; // Already liked
      }
      throw error;
    }
  }

  static async delete(articleId, authorId) {
    const sql = 'DELETE FROM likes WHERE article_id = ? AND author_id = ?';
    return await DB.query(sql, [articleId, authorId]);
  }

  static async findByArticle(articleId) {
    const sql = `
      SELECT l.*, 
        au.name as author_name, au.avatar_url as author_avatar
      FROM likes l
      LEFT JOIN authors au ON l.author_id = au.id
      WHERE l.article_id = ?
      ORDER BY l.created_at DESC
    `;
    return await DB.query(sql, [articleId]);
  }

  static async findByAuthor(authorId) {
    const sql = `
      SELECT l.*, 
        a.title as article_title, a.slug as article_slug
      FROM likes l
      LEFT JOIN articles a ON l.article_id = a.id
      WHERE l.author_id = ?
      ORDER BY l.created_at DESC
    `;
    return await DB.query(sql, [authorId]);
  }

  static async count(articleId) {
    const sql = 'SELECT COUNT(*) as count FROM likes WHERE article_id = ?';
    const result = await DB.getOne(sql, [articleId]);
    return result.count;
  }

  static async check(articleId, authorId) {
    const sql = 'SELECT 1 FROM likes WHERE article_id = ? AND author_id = ?';
    const result = await DB.getOne(sql, [articleId, authorId]);
    return !!result;
  }

  static async deleteAll(articleId) {
    const sql = 'DELETE FROM likes WHERE article_id = ?';
    return await DB.query(sql, [articleId]);
  }
}

module.exports = Like;