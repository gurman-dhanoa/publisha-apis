const DB = require('../utils/db');

class Like {
  static async create(articleId, authorId) {
    try {
      const result = await DB.insert('likes', { article_id: articleId, author_id: authorId });
      return { id: result.insertId, article_id: articleId, author_id: authorId };
    } catch (error) {
      if (error.message.includes('Duplicate entry')) return null; 
      throw error;
    }
  }

  static async delete(articleId, authorId) {
    return await DB.query('DELETE FROM likes WHERE article_id = ? AND author_id = ?', [articleId, authorId]);
  }

  static async findByArticle(articleId) {
    const sql = `
      SELECT l.*, au.name as author_name, au.avatar_url as author_avatar
      FROM likes l
      INNER JOIN authors au ON l.author_id = au.id
      WHERE l.article_id = ? AND au.deleted_at IS NULL
      ORDER BY l.created_at DESC
    `;
    return await DB.query(sql, [articleId]);
  }

  static async findByAuthor(authorId) {
    const sql = `
      SELECT l.*, a.title as article_title, a.slug as article_slug
      FROM likes l
      INNER JOIN articles a ON l.article_id = a.id
      WHERE l.author_id = ? AND a.deleted_at IS NULL AND a.status = 'published'
      ORDER BY l.created_at DESC
    `;
    return await DB.query(sql, [authorId]);
  }

  static async count(articleId) {
    const result = await DB.getOne('SELECT COUNT(*) as count FROM likes WHERE article_id = ?', [articleId]);
    return result.count;
  }

  static async check(articleId, authorId) {
    const result = await DB.getOne('SELECT 1 FROM likes WHERE article_id = ? AND author_id = ?', [articleId, authorId]);
    return !!result;
  }
}
module.exports = Like;