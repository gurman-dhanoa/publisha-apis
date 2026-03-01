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
    // 1. Use user-provided slug OR generate one from title
    let slug = data.slug;
    if (!slug || slug.trim() === "") {
      slug = data.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    }

    const articleData = {
      title: data.title,
      slug: slug, // Use the determined slug
      summary: data.summary,
      content: data.content,
      image_url: data.image_url || null,
      author_id: data.author_id,
      status: data.status || "draft",
      published_at: data.status === "published" ? new Date() : null,
    };

    const result = await DB.insert("articles", articleData);

    // 2. Link Categories
    if (data.categories && data.categories.length > 0) {
      await this.addCategories(result.insertId, data.categories);
    }

    return this.findById(result.insertId);
  }

  static async update(id, data) {
    const updateData = {};

    // 1. Conditional Fields
    if (data.title) updateData.title = data.title;
    if (data.summary) updateData.summary = data.summary;
    if (data.content) updateData.content = data.content;
    if (data.image_url) updateData.image_url = data.image_url;

    // 2. Slug Logic: Allow manual update
    if (data.slug) {
      updateData.slug = data.slug;
    } else if (data.title && !data.slug) {
      // Only auto-regenerate if title changed AND no slug was provided
      // (Optional: usually you don't want to change slug on title change unless requested)
      // updateData.slug = ...
    }

    if (data.status) {
      updateData.status = data.status;
      if (data.status === "published") {
        updateData.published_at = new Date();
      }
    }

    if (Object.keys(updateData).length > 0) {
      await DB.update("articles", updateData, "id = ?", [id]);
    }

    // 3. Update Categories (Full Replace Strategy)
    if (data.categories) {
      await this.removeAllCategories(id);
      if (data.categories.length > 0) {
        await this.addCategories(id, data.categories);
      }
    }

    return this.findById(id);
  }

  // --- Helper Methods ---

  static async findById(id) {
    // Ensure you return author_id to perform the check in controller
    const sql = `
      SELECT a.*, au.name as author_name, au.avatar_url as author_avatar
      FROM articles a
      JOIN authors au ON a.author_id = au.id
      WHERE a.id = ?
    `;
    
    const article = await DB.getOne(sql, [id]);
    if (!article) return null;

    // Fetch categories for this article to return complete object
    const categoriesSql = `
        SELECT c.id, c.name, c.slug 
        FROM categories c
        JOIN article_categories ac ON c.id = ac.category_id
        WHERE ac.article_id = ?
    `;
    article.categories = await DB.query(categoriesSql, [id]);
    
    return article;
  }

  static async addCategories(articleId, categoryIds) {
    // categoryIds should be an array of IDs [1, 5, 8]
    const values = categoryIds.map((catId) => [articleId, catId]);
    if (values.length === 0) return;

    const sql =
      "INSERT INTO article_categories (article_id, category_id) VALUES ?";
    return await DB.query(sql, [values]); // DB.query needs to support bulk insert
  }

  static async removeAllCategories(articleId) {
    const sql = "DELETE FROM article_categories WHERE article_id = ?";
    return await DB.query(sql, [articleId]);
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
    currentUserId = null,
  } = {}) {
    page = parseInt(page, 10) || 1;
    limit = parseInt(limit, 10) || 10;
    const offset = (page - 1) * limit;

    // 1. Initialize params with currentUserId immediately for the JOIN
    const params = [currentUserId];

    let sql = `
    SELECT a.*, 
      au.name as author_name, au.avatar_url as author_avatar,
      (SELECT COUNT(*) FROM likes WHERE article_id = a.id) as likes_count,
      (SELECT COUNT(*) FROM views WHERE article_id = a.id) as views_count,
      (SELECT AVG(rating) FROM reviews WHERE article_id = a.id) as avg_rating,
      -- 2. Check existence efficiently using the JOIN
      (ul.id IS NOT NULL) as is_liked
    FROM articles a
    LEFT JOIN authors au ON a.author_id = au.id
    -- 3. The Magic Join: specifically checks if THIS user liked the article
    -- If currentUserId is null, this JOIN finds nothing, so is_liked becomes 0 (false)
    LEFT JOIN likes ul ON a.id = ul.article_id AND ul.author_id = ?
  `;

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
      // Convert is_liked to a proper boolean for frontend
      article.is_liked = !!article.is_liked;
    }

    // Get total count
    let countSql = "SELECT COUNT(*) as total FROM articles a";

    if (category) {
      countSql += ` INNER JOIN article_categories ac ON a.id = ac.article_id
                  INNER JOIN categories c ON ac.category_id = c.id`;
    }

    if (whereClauses.length > 0) {
      countSql += " WHERE " + whereClauses.join(" AND ");
    }

    // Slice params for count query:
    // Remove the first param (currentUserId) because countSql doesn't use the 'ul' join
    // Remove the last 2 params (limit, offset)
    const countParams = params.slice(1, -2);

    const [total] = await DB.query(countSql, countParams);

    return {
      data: articles,
      pagination: {
        page,
        limit,
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
