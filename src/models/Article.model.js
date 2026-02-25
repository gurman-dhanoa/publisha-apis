const DB = require("../utils/db");

class Article {
  static async globalSearch(query, limit = 10) {
    const searchTerm = `%${query}%`;

    const sql = `
    -- Search Articles
    (SELECT 
        id, 
        title AS name, 
        slug, 
        'article' AS type, 
        image_url, 
        created_at 
     FROM articles 
     WHERE (title LIKE ? OR summary LIKE ?) AND status = 'published')
    
    UNION ALL

    -- Search Authors
    (SELECT 
        id, 
        name, 
        id AS slug, -- Authors don't have slugs in your current schema
        'author' AS type, 
        avatar_url AS image_url, 
        created_at 
     FROM authors 
     WHERE name LIKE ? OR bio LIKE ?)

    UNION ALL

    -- Search Collections
    (SELECT 
        id, 
        name, 
        slug, 
        'collection' AS type, 
        NULL AS image_url, 
        created_at 
     FROM collections 
     WHERE name LIKE ? OR description LIKE ?)

    ORDER BY name ASC
    LIMIT ?
  `;

    const params = [
      searchTerm,
      searchTerm, // Articles
      searchTerm,
      searchTerm, // Authors
      searchTerm,
      searchTerm, // Collections
      parseInt(limit),
    ];

    return await DB.query(sql, params);
  }

  static async findById(id) {
    const sql = `
      SELECT a.*, 
        au.name as author_name, au.avatar_url as author_avatar,
        (SELECT COUNT(*) FROM likes WHERE article_id = a.id) as likes_count,
        (SELECT COUNT(*) FROM views WHERE article_id = a.id) as views_count,
        (SELECT AVG(rating) FROM reviews WHERE article_id = a.id) as avg_rating,
        (SELECT COUNT(*) FROM reviews WHERE article_id = a.id) as reviews_count
      FROM articles a
      LEFT JOIN authors au ON a.author_id = au.id
      WHERE a.id = ?
    `;
    const article = await DB.getOne(sql, [id]);

    if (article) {
      article.categories = await this.getCategories(id);
    }

    return article;
  }

  static async findBySlug(slug) {
    const sql = `
      SELECT a.*, 
        au.name as author_name, au.avatar_url as author_avatar,
        (SELECT COUNT(*) FROM likes WHERE article_id = a.id) as likes_count,
        (SELECT COUNT(*) FROM views WHERE article_id = a.id) as views_count,
        (SELECT AVG(rating) FROM reviews WHERE article_id = a.id) as avg_rating,
        (SELECT COUNT(*) FROM reviews WHERE article_id = a.id) as reviews_count
      FROM articles a
      LEFT JOIN authors au ON a.author_id = au.id
      WHERE a.slug = ?
    `;
    const article = await DB.getOne(sql, [slug]);

    if (article) {
      article.categories = await this.getCategories(article.id);
    }

    return article;
  }

  static async create(data) {
    const slug = data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const articleData = {
      title: data.title,
      slug,
      summary: data.summary,
      content: data.content,
      image_url: data.image_url || null,
      author_id: data.author_id,
      status: data.status || "draft",
      published_at: data.status === "published" ? new Date() : null,
    };

    const result = await DB.insert("articles", articleData);

    // Add categories
    if (data.categories && data.categories.length > 0) {
      await this.addCategories(result.insertId, data.categories);
    }

    return this.findById(result.insertId);
  }

  static async update(id, data) {
    const updateData = {};

    if (data.title) {
      updateData.title = data.title;
      updateData.slug = data.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    }
    if (data.summary) updateData.summary = data.summary;
    if (data.content) updateData.content = data.content;
    if (data.image_url) updateData.image_url = data.image_url;
    if (data.status) {
      updateData.status = data.status;
      if (data.status === "published") {
        updateData.published_at = new Date();
      }
    }

    await DB.update("articles", updateData, "id = ?", [id]);

    // Update categories
    if (data.categories) {
      await this.removeAllCategories(id);
      await this.addCategories(id, data.categories);
    }

    return this.findById(id);
  }

  static async delete(id) {
    const sql = "DELETE FROM articles WHERE id = ?";
    return await DB.query(sql, [id]);
  }

  static async findAll({
    status = "published",
    category,
    author,
    search,
    page = 1,
    limit = 10,
    sort = "latest",
  } = {}) {
    const offset = (page - 1) * limit;
    let sql = `
      SELECT a.*, 
        au.name as author_name, au.avatar_url as author_avatar,
        (SELECT COUNT(*) FROM likes WHERE article_id = a.id) as likes_count,
        (SELECT COUNT(*) FROM views WHERE article_id = a.id) as views_count,
        (SELECT AVG(rating) FROM reviews WHERE article_id = a.id) as avg_rating
      FROM articles a
      LEFT JOIN authors au ON a.author_id = au.id
    `;

    const params = [];
    const whereClauses = [];

    if (category) {
      sql += ` INNER JOIN article_categories ac ON a.id = ac.article_id
               INNER JOIN categories c ON ac.category_id = c.id`;
      whereClauses.push("c.slug = ?");
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
      whereClauses.push(
        "MATCH(a.title, a.summary, a.content) AGAINST(? IN BOOLEAN MODE)",
      );
      params.push(`*${search}*`);
    }

    if (whereClauses.length > 0) {
      sql += " WHERE " + whereClauses.join(" AND ");
    }

    // Sorting
    switch (sort) {
      case "popular":
        sql += " ORDER BY views_count DESC";
        break;
      case "trending":
        sql += " ORDER BY likes_count DESC";
        break;
      default:
        sql += " ORDER BY a.published_at DESC";
    }

    sql += " LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const articles = await DB.query(sql, params);

    // Get categories for each article
    for (let article of articles) {
      article.categories = await this.getCategories(article.id);
    }

    // Get total count
    let countSql = "SELECT COUNT(*) as total FROM articles a";

    // If filtering by category, we MUST join categories in the count query too
    if (category) {
      countSql += ` INNER JOIN article_categories ac ON a.id = ac.article_id
                INNER JOIN categories c ON ac.category_id = c.id`;
    }

    if (whereClauses.length > 0) {
      countSql += " WHERE " + whereClauses.join(" AND ");
    }

    // Ensure params matches the number of '?' in countSql
    // We slice off the last 2 params because count query doesn't use LIMIT and OFFSET
    const [total] = await DB.query(countSql, params.slice(0, -2));

    return {
      data: articles,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total.total,
        pages: Math.ceil(total.total / limit),
      },
    };
  }

  static async incrementViews(id, ip, authorId = null) {
    // Add view record
    const viewData = {
      article_id: id,
      viewer_ip: ip,
      author_id: authorId,
    };
    await DB.insert("views", viewData);

    // Update views count
    const sql =
      "UPDATE articles SET views_count = views_count + 1 WHERE id = ?";
    await DB.query(sql, [id]);
  }

  static async getCategories(articleId) {
    const sql = `
      SELECT c.id, c.name, c.slug
      FROM categories c
      INNER JOIN article_categories ac ON c.id = ac.category_id
      WHERE ac.article_id = ?
    `;
    return await DB.query(sql, [articleId]);
  }

  static async addCategories(articleId, categoryIds) {
    for (const categoryId of categoryIds) {
      await DB.insert("article_categories", {
        article_id: articleId,
        category_id: categoryId,
      });
    }
  }

  static async removeAllCategories(articleId) {
    const sql = "DELETE FROM article_categories WHERE article_id = ?";
    await DB.query(sql, [articleId]);
  }
}

module.exports = Article;
