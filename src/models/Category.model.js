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

  // NEW: Handles the LinkedIn-style dynamic creation
  static async findOrCreate(name) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    const existing = await this.findBySlug(slug);
    if (existing) return existing;

    const result = await DB.insert('categories', { name, slug });
    return { id: result.insertId, name, slug };
  }

  // OPTIMIZED: Added Pagination
  static async findAll(page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const sql = `
      SELECT c.*, 
        (SELECT COUNT(*) FROM article_categories ac WHERE ac.category_id = c.id) as articles_count
      FROM categories c
      ORDER BY c.name ASC
      LIMIT ? OFFSET ?
    `;
    const categories = await DB.query(sql, [limit, offset]);
    
    const [total] = await DB.query("SELECT COUNT(*) as total FROM categories");
    return { categories, total: total.total };
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
    return await DB.query(sql, [parseInt(limit)]);
  }
}

module.exports = Category;