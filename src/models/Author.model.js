const DB = require("../utils/db");
const hash = require("../utils/hash");

class Author {
  // Find by ID
  static async findById(id) {
    const sql = `
    SELECT 
      au.id, au.name, au.email, au.bio, au.avatar_url, au.created_at, au.updated_at,
      (
        SELECT GROUP_CONCAT(
          JSON_OBJECT('id', c.id, 'name', c.name, 'slug', c.slug)
        )
        FROM categories c
        WHERE JSON_CONTAINS(au.preferred_categories, CAST(c.id AS CHAR))
      ) as categories_raw
    FROM authors au
    WHERE au.id = ?
  `;

    const author = await DB.getOne(sql, [id]);

    if (author) {
      // Convert the GROUP_CONCAT string back into a clean JSON array
      if (author.categories_raw) {
        author.preferred_categories = JSON.parse(`[${author.categories_raw}]`);
      } else {
        author.preferred_categories = [];
      }
      // Remove the raw string helper property
      delete author.categories_raw;
    }

    return author;
  }

  // Find by email
  static async findByEmail(email) {
    const sql = "SELECT * FROM authors WHERE email = ?";
    return await DB.getOne(sql, [email]);
  }

  // Create new author
  static async create(data) {
    const hashedPassword = await hash.make(data.password);

    const authorData = {
      name: data.name,
      email: data.email,
      password_hash: hashedPassword,
      bio: data.bio || null,
      preferred_categories: data.preferred_categories
        ? JSON.stringify(data.preferred_categories)
        : null,
      avatar_url: data.avatar_url || null,
    };

    const result = await DB.insert("authors", authorData);
    return this.findById(result.insertId);
  }

  // Update author
  static async update(id, data) {
    const updateData = {};

    if (data.name) updateData.name = data.name;
    if (data.bio) updateData.bio = data.bio;
    if (data.preferred_categories)
      updateData.preferred_categories = JSON.stringify(
        data.preferred_categories,
      );
    if (data.avatar_url) updateData.avatar_url = data.avatar_url;
    if (data.password)
      updateData.password_hash = await hash.make(data.password);

    await DB.update("authors", updateData, "id = ?", [id]);
    return this.findById(id);
  }

  // Delete author
  static async delete(id) {
    const sql = "DELETE FROM authors WHERE id = ?";
    return await DB.query(sql, [id]);
  }

  // Get all authors with pagination
  static async findAll({ search, categoryId, page = 1, limit = 10 } = {}) {
    const offset = (page - 1) * limit;
    const params = [];
    const whereClauses = [];

    // Use GROUP_CONCAT to collect categories.
    // We use a subquery to avoid the "Cartesian product" issue of a direct join.
    let sql = `
    SELECT 
      au.id, au.name, au.email, au.bio, au.avatar_url, au.created_at,
      (
        SELECT GROUP_CONCAT(
          JSON_OBJECT('id', c.id, 'name', c.name, 'slug', c.slug)
        )
        FROM categories c
        WHERE JSON_CONTAINS(au.preferred_categories, CAST(c.id AS CHAR))
      ) as categories_raw
    FROM authors au
  `;

    if (search) {
      whereClauses.push("(au.name LIKE ? OR au.bio LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }

    if (categoryId) {
      // Note: In MariaDB, JSON_CONTAINS works better when the search value is a string
      whereClauses.push("JSON_CONTAINS(au.preferred_categories, ?)");
      params.push(String(categoryId));
    }

    if (whereClauses.length > 0) {
      sql += " WHERE " + whereClauses.join(" AND ");
    }

    sql += " ORDER BY au.created_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const authors = await DB.query(sql, params);

    // Since GROUP_CONCAT returns a string like '{"id":1...},{"id":2...}',
    // we wrap it in brackets and parse it.
    authors.forEach((author) => {
      if (author.categories_raw) {
        author.categories = JSON.parse(`[${author.categories_raw}]`);
      } else {
        author.categories = [];
      }
      delete author.categories_raw; // Clean up the raw string
    });

    // Count Query
    let countSql = "SELECT COUNT(*) as total FROM authors au";
    if (whereClauses.length > 0) {
      countSql += " WHERE " + whereClauses.join(" AND ");
    }
    const [total] = await DB.query(countSql, params.slice(0, -2));

    return {
      data: authors,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total.total,
        pages: Math.ceil(total.total / limit),
      },
    };
  }

  // Get author articles
  static async getArticles(authorId, { status, page = 1, limit = 10 } = {}) {
    const offset = (page - 1) * limit;
    let sql = `
      SELECT a.*, 
        (SELECT COUNT(*) FROM likes WHERE article_id = a.id) as likes_count,
        (SELECT COUNT(*) FROM views WHERE article_id = a.id) as views_count,
        (SELECT AVG(rating) FROM reviews WHERE article_id = a.id) as avg_rating
      FROM articles a
      WHERE a.author_id = ?
    `;
    const params = [authorId];

    if (status) {
      sql += " AND a.status = ?";
      params.push(status);
    }

    sql += " ORDER BY a.created_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const articles = await DB.query(sql, params);
    return articles;
  }

  // Get author collections
  static async getCollections(authorId) {
    const sql = `
      SELECT c.*, 
        (SELECT COUNT(*) FROM collection_articles WHERE collection_id = c.id) as articles_count
      FROM collections c
      WHERE c.author_id = ?
      ORDER BY c.created_at DESC
    `;
    return await DB.query(sql, [authorId]);
  }

  static async getTrending(limit = 5) {
    const sql = `
    SELECT 
      au.id, 
      au.name, 
      au.avatar_url, 
      au.bio,
      COUNT(a.id) as total_articles,
      IFNULL(SUM(a.views_count), 0) as total_views
    FROM authors au
    LEFT JOIN articles a ON au.id = a.author_id AND a.status = 'published'
    GROUP BY au.id
    ORDER BY total_views DESC, total_articles DESC
    LIMIT ?
  `;

    return await DB.query(sql, [parseInt(limit)]);
  }
}

module.exports = Author;
