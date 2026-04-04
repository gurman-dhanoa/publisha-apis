const DB = require("../utils/db");
const { ARTICLE_STATUS } = require("../utils/constants");

class Author {
  static async findById(id) {
    const sql = `
      SELECT 
        au.id, au.name, au.email, au.bio, au.avatar_url, au.google_id, au.created_at, au.updated_at,
        COALESCE(
          (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', c.id, 'name', c.name, 'slug', c.slug))
           FROM author_preferred_categories apc
           JOIN categories c ON apc.category_id = c.id
           WHERE apc.author_id = au.id),
          JSON_ARRAY()
        ) as preferred_categories
      FROM authors au
      WHERE au.id = ? AND au.deleted_at IS NULL
    `;
    return await DB.getOne(sql, [id]);
  }

  static async findByEmail(email) {
    // We select all fields here because the Auth controller needs to check au.otp and au.otp_expires_at
    const sql = "SELECT * FROM authors WHERE email = ? AND deleted_at IS NULL";
    return await DB.getOne(sql, [email]);
  }

  static async create(data) {
    return await DB.transaction(async (connection) => {
      // Stripped out password hashing, added google_id
      const authorData = {
        name: data.name,
        email: data.email,
        bio: data.bio || null,
        avatar_url: data.avatar_url || null,
        google_id: data.google_id || null,
      };

      const result = await DB.insert("authors", authorData, connection);
      const authorId = result.insertId;

      if (data.preferred_categories && data.preferred_categories.length > 0) {
        const values = data.preferred_categories.map((categoryId) => [
          authorId,
          categoryId,
        ]);
        const sql =
          "INSERT INTO author_preferred_categories (author_id, category_id) VALUES ?";
        await connection.query(sql, [values]);
      }

      return authorId;
    }).then((id) => this.findById(id));
  }

  static async update(id, data) {
    return await DB.transaction(async (connection) => {
      const updateData = {};

      if (data.name) updateData.name = data.name;
      if (data.bio) updateData.bio = data.bio;
      if (data.avatar_url) updateData.avatar_url = data.avatar_url;
      if (data.google_id) updateData.google_id = data.google_id;

      // Explicitly checking for undefined so we can intentionally pass `null` to clear the OTP after a successful login
      if (data.otp !== undefined) updateData.otp = data.otp;
      if (data.otp_expires_at !== undefined)
        updateData.otp_expires_at = data.otp_expires_at;

      if (Object.keys(updateData).length > 0) {
        await DB.update("authors", updateData, "id = ?", [id], connection);
      }

      if (data.preferred_categories) {
        await connection.query(
          "DELETE FROM author_preferred_categories WHERE author_id = ?",
          [id],
        );
        if (data.preferred_categories.length > 0) {
          const values = data.preferred_categories.map((catId) => [id, catId]);
          await connection.query(
            "INSERT INTO author_preferred_categories (author_id, category_id) VALUES ?",
            [values],
          );
        }
      }
      return id;
    }).then(() => this.findById(id));
  }

  static async delete(id) {
    const sql =
      "UPDATE authors SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?";
    return await DB.query(sql, [id]);
  }

  static async findAll({ search, categoryId, page = 1, limit = 10 } = {}) {
    const offset = (page - 1) * limit;
    const params = [];
    const whereClauses = ["au.deleted_at IS NULL"];

    let sql = `
      SELECT 
        au.id, au.name, au.email, au.bio, au.avatar_url, au.created_at,
        COALESCE(
          (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', c.id, 'name', c.name, 'slug', c.slug))
           FROM author_preferred_categories apc
           JOIN categories c ON apc.category_id = c.id
           WHERE apc.author_id = au.id),
          JSON_ARRAY()
        ) as categories
      FROM authors au
    `;

    if (search) {
      whereClauses.push("(au.name LIKE ? OR au.bio LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }

    // Filter by the new junction table
    if (categoryId) {
      whereClauses.push(`EXISTS (
        SELECT 1 FROM author_preferred_categories apc 
        WHERE apc.author_id = au.id AND apc.category_id = ?
      )`);
      params.push(categoryId);
    }

    if (whereClauses.length > 0) {
      sql += " WHERE " + whereClauses.join(" AND ");
    }

    sql += " ORDER BY au.created_at DESC LIMIT ? OFFSET ?";

    // Create separate array for data fetching to prevent polluting count query
    const dataParams = [...params, limit, offset];
    const authors = await DB.query(sql, dataParams);

    let countSql = "SELECT COUNT(*) as total FROM authors au";
    if (whereClauses.length > 0) {
      countSql += " WHERE " + whereClauses.join(" AND ");
    }
    const [total] = await DB.query(countSql, params);

    return { authors, total: total.total };
  }

  static async getArticles(authorId, { status, page = 1, limit = 10 } = {}) {
    const offset = (page - 1) * limit;

    let countSql =
      "SELECT COUNT(*) as total FROM articles a WHERE a.author_id = ? AND a.deleted_at IS NULL";

    let sql = `
      SELECT a.*, 
        (SELECT COUNT(*) FROM likes WHERE article_id = a.id) as likes_count,
        (SELECT AVG(rating) FROM reviews WHERE article_id = a.id) as avg_rating
      FROM articles a
      WHERE a.author_id = ? AND a.deleted_at IS NULL
    `;
    const params = [authorId];

    if (status) {
      sql += " AND a.status = ?";
      countSql += " AND a.status = ?";
      params.push(status);
    }

    sql += " ORDER BY a.created_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const [total] = await DB.query(countSql, params);
    const articles = await DB.query(sql, params);

    return { articles, total: total.total };
  }

  static async getCollections(authorId, { page = 1, limit = 10 } = {}) {
    const offset = (page - 1) * limit;
    
    const countSql =
      "SELECT COUNT(*) as total FROM collections WHERE author_id = ?";
    const [total] = await DB.query(countSql, [authorId]);

    const sql = `
      SELECT c.*, 
        (SELECT COUNT(*) 
         FROM collection_articles ca
         INNER JOIN articles a ON ca.article_id = a.id
         WHERE ca.collection_id = c.id AND a.deleted_at IS NULL AND a.status = 'published'
        ) as articles_count,
        
        -- NEW: Fetch the image of the first article added to this collection
        (SELECT a.image_url 
         FROM articles a 
         INNER JOIN collection_articles ca ON a.id = ca.article_id 
         WHERE ca.collection_id = c.id AND a.deleted_at IS NULL AND a.status = 'published' 
         ORDER BY ca.sort_order ASC, ca.added_at DESC
         LIMIT 1
        ) as cover_image

      FROM collections c
      WHERE c.author_id = ?
      ORDER BY c.created_at DESC 
      LIMIT ? OFFSET ?
    `;

    const collections = await DB.query(sql, [
      authorId,
      parseInt(limit),
      parseInt(offset),
    ]);

    return { collections, total: total.total };
  }

  static async getTrending(limit = 5) {
    // Trending adjusted to use likes instead of views (since views table was dropped)
    const sql = `
      SELECT 
        au.id, au.name, au.avatar_url, au.bio,
        COUNT(DISTINCT a.id) as total_articles,
        COUNT(l.id) as total_likes
      FROM authors au
      LEFT JOIN articles a ON au.id = a.author_id AND a.status = ? AND a.deleted_at IS NULL
      LEFT JOIN likes l ON a.id = l.article_id
      WHERE au.deleted_at IS NULL
      GROUP BY au.id
      ORDER BY total_likes DESC, total_articles DESC
      LIMIT ?
    `;
    return await DB.query(sql, [ARTICLE_STATUS.PUBLISHED, parseInt(limit)]);
  }

  static async getStats(authorId) {
    const sql = `
      SELECT 
        (SELECT COUNT(id) FROM articles WHERE author_id = ? AND deleted_at IS NULL) as total_articles,
        (SELECT COUNT(id) FROM articles WHERE author_id = ? AND status = 'published' AND deleted_at IS NULL) as published_articles,
        (SELECT COALESCE(SUM(views_count), 0) FROM articles WHERE author_id = ? AND deleted_at IS NULL) as total_views,
        (SELECT COUNT(l.article_id) 
         FROM likes l 
         INNER JOIN articles a ON l.article_id = a.id 
         WHERE a.author_id = ? AND a.deleted_at IS NULL) as total_likes,
        (SELECT AVG(r.rating) 
         FROM reviews r 
         INNER JOIN articles a ON r.article_id = a.id 
         WHERE a.author_id = ? AND a.deleted_at IS NULL) as avg_rating
    `;

    // We pass authorId 5 times, once for each subquery
    const result = await DB.getOne(sql, [
      authorId,
      authorId,
      authorId,
      authorId,
      authorId,
    ]);

    // Format the results to ensure clean types for the frontend
    return {
      total_articles: parseInt(result.total_articles || 0),
      published_articles: parseInt(result.published_articles || 0),
      total_views: parseInt(result.total_views || 0),
      total_likes: parseInt(result.total_likes || 0),
      // Format average to 1 decimal place (e.g., 4.5). Return 0 if there are no reviews yet.
      avg_rating: result.avg_rating
        ? parseFloat(result.avg_rating).toFixed(1)
        : 0,
    };
  }
}

module.exports = Author;
