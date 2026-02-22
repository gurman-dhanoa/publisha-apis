const DB = require('../utils/db');

class Category {
  static async findById(id) {
    const sql = 'SELECT * FROM categories WHERE id = ?';
    return await DB.getOne(sql, [id]);
  }

  static async findBySlug(slug) {
    const sql = 'SELECT * FROM categories WHERE slug = ?';
    return await DB.getOne(sql, [slug]);
  }

  static async findAll() {
    const sql = `
      SELECT c.*, 
        (SELECT COUNT(*) FROM article_categories ac WHERE ac.category_id = c.id) as articles_count
      FROM categories c
      ORDER BY c.name ASC
    `;
    return await DB.query(sql);
  }

  static async getPopular(limit = 10) {
    const sql = `
      SELECT c.*, COUNT(ac.article_id) as articles_count
      FROM categories c
      LEFT JOIN article_categories ac ON c.id = ac.category_id
      GROUP BY c.id
      ORDER BY articles_count DESC
      LIMIT ?
    `;
    return await DB.query(sql, [limit]);
  }
}

module.exports = Category;