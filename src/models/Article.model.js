const DB = require("../utils/db");

class Article {
  static async globalSearch(query, limit = 10) {
    const searchTerm = `%${query}%`;
    const sql = `
      (SELECT id, title AS name, slug, 'article' AS type, image_url, created_at 
       FROM articles WHERE (title LIKE ? OR summary LIKE ?) AND status = 'published' AND deleted_at IS NULL)
      UNION ALL
      (SELECT id, name, NULL AS slug, 'author' AS type, avatar_url AS image_url, created_at 
       FROM authors WHERE (name LIKE ? OR bio LIKE ?) AND deleted_at IS NULL)
      ORDER BY name ASC LIMIT ?
    `;
    return await DB.query(sql, [searchTerm, searchTerm, searchTerm, searchTerm, parseInt(limit)]);
  }

  static async findById(id) {
    const sql = `
      SELECT a.*, 
        au.name as author_name, au.avatar_url as author_avatar,
        (SELECT COUNT(*) FROM likes WHERE article_id = a.id) as likes_count,
        (SELECT AVG(rating) FROM reviews WHERE article_id = a.id) as avg_rating,
        COALESCE(
          (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', c.id, 'name', c.name, 'slug', c.slug))
           FROM article_categories ac
           JOIN categories c ON ac.category_id = c.id
           WHERE ac.article_id = a.id), JSON_ARRAY()
        ) as categories
      FROM articles a
      JOIN authors au ON a.author_id = au.id
      WHERE a.id = ? AND a.deleted_at IS NULL
    `;
    return await DB.getOne(sql, [id]);
  }

  static async findBySlug(slug) {
    // Uses identical optimized SQL as findById, just checking a.slug = ?
    const sql = `
      SELECT a.*, 
        au.name as author_name, au.avatar_url as author_avatar,
        (SELECT COUNT(*) FROM likes WHERE article_id = a.id) as likes_count,
        (SELECT AVG(rating) FROM reviews WHERE article_id = a.id) as avg_rating,
        COALESCE(
          (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', c.id, 'name', c.name, 'slug', c.slug))
           FROM article_categories ac
           JOIN categories c ON ac.category_id = c.id
           WHERE ac.article_id = a.id), JSON_ARRAY()
        ) as categories
      FROM articles a
      JOIN authors au ON a.author_id = au.id
      WHERE a.slug = ? AND a.deleted_at IS NULL
    `;
    return await DB.getOne(sql, [slug]);
  }

  static async create(data) {
    return await DB.transaction(async (connection) => {
      let slug = data.slug || data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

      const articleData = {
        title: data.title,
        slug: slug,
        summary: data.summary,
        content: data.content,
        image_url: data.image_url || null,
        author_id: data.author_id,
        status: data.status || "draft",
        published_at: data.status === "published" ? new Date() : null,
      };

      const result = await DB.insert("articles", articleData, connection);
      const articleId = result.insertId;

      if (data.categories && data.categories.length > 0) {
        const values = data.categories.map((catId) => [articleId, catId]);
        await connection.query("INSERT INTO article_categories (article_id, category_id) VALUES ?", [values]);
      }

      return articleId;
    }).then(id => this.findById(id));
  }

  static async update(id, data) {
    return await DB.transaction(async (connection) => {
      const updateData = {};
      if (data.title) updateData.title = data.title;
      if (data.summary) updateData.summary = data.summary;
      if (data.content) updateData.content = data.content;
      if (data.image_url) updateData.image_url = data.image_url;
      if (data.slug) updateData.slug = data.slug;
      
      if (data.status) {
        updateData.status = data.status;
        if (data.status === "published" && !data.published_at) {
          updateData.published_at = new Date();
        }
      }

      if (Object.keys(updateData).length > 0) {
        await DB.update("articles", updateData, "id = ?", [id], connection);
      }

      if (data.categories) {
        await connection.query("DELETE FROM article_categories WHERE article_id = ?", [id]);
        if (data.categories.length > 0) {
          const values = data.categories.map((catId) => [id, catId]);
          await connection.query("INSERT INTO article_categories (article_id, category_id) VALUES ?", [values]);
        }
      }
      return id;
    }).then(() => this.findById(id));
  }

  static async delete(id) {
    // Soft Delete Implementation
    return await DB.query("UPDATE articles SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?", [id]);
  }

  static async findAll({ status = "published", category, author, search, page = 1, limit = 10, sort = "latest", currentUserId = null } = {}) {
    const offset = (page - 1) * limit;
    const params = [currentUserId];
    const whereClauses = ["a.deleted_at IS NULL"];

    let sql = `
      SELECT a.*, 
        au.name as author_name, au.avatar_url as author_avatar,
        (SELECT COUNT(*) FROM likes WHERE article_id = a.id) as likes_count,
        (ul.id IS NOT NULL) as is_liked,
        COALESCE(
          (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', c.id, 'name', c.name, 'slug', c.slug))
           FROM article_categories ac JOIN categories c ON ac.category_id = c.id WHERE ac.article_id = a.id), 
          JSON_ARRAY()
        ) as categories
      FROM articles a
      LEFT JOIN authors au ON a.author_id = au.id
      LEFT JOIN likes ul ON a.id = ul.article_id AND ul.author_id = ?
    `;

    if (category) {
      whereClauses.push(`EXISTS (SELECT 1 FROM article_categories ac JOIN categories c ON ac.category_id = c.id WHERE ac.article_id = a.id AND c.slug = ?)`);
      params.push(category);
    }

    if (status) {
      whereClauses.push("a.status = ?");
      params.push(status);
    }

    if (author) {
      whereClauses.push("a.author_id = ?");
      params.push(author);
    }

    if (search) {
      whereClauses.push("MATCH(a.title, a.summary, a.content) AGAINST(? IN BOOLEAN MODE)");
      params.push(`*${search}*`);
    }

    if (whereClauses.length > 0) {
      sql += " WHERE " + whereClauses.join(" AND ");
    }

    switch (sort) {
      case "popular": sql += " ORDER BY a.views_count DESC"; break;
      case "trending": sql += " ORDER BY likes_count DESC"; break;
      default: sql += " ORDER BY a.published_at DESC";
    }

    const dataParams = [...params, limit, offset];
    const articles = await DB.query(sql, dataParams);
    
    articles.forEach(article => article.is_liked = !!article.is_liked);

    // Count Query - stripping out the currentUserId at index 0
    let countSql = "SELECT COUNT(*) as total FROM articles a";
    if (whereClauses.length > 0) countSql += " WHERE " + whereClauses.join(" AND ");
    const [total] = await DB.query(countSql, params.slice(1));

    return { articles, total: total.total };
  }

  static async incrementViews(id) {
    // FIX: Updates the column directly instead of inserting into the dropped table
    const sql = "UPDATE articles SET views_count = views_count + 1 WHERE id = ?";
    await DB.query(sql, [id]);
  }
}

module.exports = Article;