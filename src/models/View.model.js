const DB = require('../utils/db');

class View {
  static async create(articleId, ip, authorId = null) {
    const viewData = {
      article_id: articleId,
      viewer_ip: ip,
      author_id: authorId
    };
    
    const result = await DB.insert('views', viewData);
    
    // Update article views count
    const sql = 'UPDATE articles SET views_count = views_count + 1 WHERE id = ?';
    await DB.query(sql, [articleId]);
    
    return { id: result.insertId, ...viewData };
  }

  static async count(articleId) {
    const sql = 'SELECT COUNT(*) as count FROM views WHERE article_id = ?';
    const result = await DB.getOne(sql, [articleId]);
    return result.count;
  }

  static async getUniqueViews(articleId) {
    const sql = 'SELECT COUNT(DISTINCT viewer_ip) as count FROM views WHERE article_id = ?';
    const result = await DB.getOne(sql, [articleId]);
    return result.count;
  }

  static async getStats(articleId) {
    const sql = `
      SELECT 
        COUNT(*) as total_views,
        COUNT(DISTINCT viewer_ip) as unique_visitors,
        COUNT(DISTINCT DATE(viewed_at)) as days_active,
        MIN(viewed_at) as first_view,
        MAX(viewed_at) as last_view
      FROM views
      WHERE article_id = ?
    `;
    return await DB.getOne(sql, [articleId]);
  }

  static async getDailyViews(articleId, days = 7) {
    const sql = `
      SELECT 
        DATE(viewed_at) as date,
        COUNT(*) as views,
        COUNT(DISTINCT viewer_ip) as unique_visitors
      FROM views
      WHERE article_id = ? 
        AND viewed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(viewed_at)
      ORDER BY date DESC
    `;
    return await DB.query(sql, [articleId, days]);
  }

  static async deleteAll(articleId) {
    const sql = 'DELETE FROM views WHERE article_id = ?';
    return await DB.query(sql, [articleId]);
  }
}

module.exports = View;