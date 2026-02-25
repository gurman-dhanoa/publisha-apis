const DB = require("../utils/db");

class Collection {
  static async findById(id) {
    const sql = `
      SELECT c.*, 
        au.name as author_name,
        (SELECT COUNT(*) FROM collection_articles WHERE collection_id = c.id) as articles_count
      FROM collections c
      LEFT JOIN authors au ON c.author_id = au.id
      WHERE c.id = ?
    `;
    const collection = await DB.getOne(sql, [id]);

    if (collection) {
      collection.articles = await this.getArticles(collection.id);
    }

    return collection;
  }

  static async findBySlug(slug) {
    const sql = `
      SELECT c.*, 
        au.name as author_name,
        (SELECT COUNT(*) FROM collection_articles WHERE collection_id = c.id) as articles_count
      FROM collections c
      LEFT JOIN authors au ON c.author_id = au.id
      WHERE c.slug = ?
    `;
    const collection = await DB.getOne(sql, [slug]);

    if (collection) {
      collection.articles = await this.getArticles(collection.id);
    }

    return collection;
  }

  static async create(data) {
    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const collectionData = {
      author_id: data.author_id,
      name: data.name,
      description: data.description || null,
      slug,
    };

    const result = await DB.insert("collections", collectionData);

    // Add articles if provided
    if (data.article_ids && data.article_ids.length > 0) {
      await this.addArticles(result.insertId, data.article_ids);
    }

    return this.findById(result.insertId);
  }

  static async update(id, data) {
    const updateData = {};

    if (data.name) {
      updateData.name = data.name;
      updateData.slug = data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    }
    if (data.description) updateData.description = data.description;

    await DB.update("collections", updateData, "id = ?", [id]);
    return this.findById(id);
  }

  static async delete(id) {
    const sql = "DELETE FROM collections WHERE id = ?";
    return await DB.query(sql, [id]);
  }

  static async getByAuthor(authorId) {
    const sql = `
    SELECT 
      c.*, 
      au.name as author_name,
      (SELECT COUNT(*) FROM collection_articles WHERE collection_id = c.id) as articles_count,
      IFNULL((
        SELECT SUM(a.views_count) 
        FROM articles a 
        INNER JOIN collection_articles ca ON a.id = ca.article_id 
        WHERE ca.collection_id = c.id
      ), 0) as total_collection_views
    FROM collections c
    LEFT JOIN authors au ON c.author_id = au.id
    WHERE c.author_id = ?
    ORDER BY c.created_at DESC
  `;

    const collections = await DB.query(sql, [authorId]);

    // Fetch preview articles for each collection
    for (let collection of collections) {
      const previewSql = `
      SELECT a.id, a.title, a.image_url, a.slug 
      FROM articles a
      INNER JOIN collection_articles ca ON a.id = ca.article_id
      WHERE ca.collection_id = ?
      ORDER BY ca.added_at DESC
      LIMIT 3
    `;
      collection.preview_articles = await DB.query(previewSql, [collection.id]);
    }

    return collections;
  }

  static async getArticles(collectionId) {
    const sql = `
      SELECT a.*, 
        au.name as author_name,
        ca.added_at as added_to_collection_at
      FROM articles a
      INNER JOIN collection_articles ca ON a.id = ca.article_id
      LEFT JOIN authors au ON a.author_id = au.id
      WHERE ca.collection_id = ?
      ORDER BY ca.added_at DESC
    `;
    return await DB.query(sql, [collectionId]);
  }

  static async addArticles(collectionId, articleIds) {
    for (const articleId of articleIds) {
      // Check if article exists and is published
      const articleSql =
        'SELECT id FROM articles WHERE id = ? AND status = "published"';
      const article = await DB.getOne(articleSql, [articleId]);

      if (article) {
        try {
          await DB.insert("collection_articles", {
            collection_id: collectionId,
            article_id: articleId,
          });
        } catch (error) {
          // Skip duplicate entries
          if (!error.message.includes("Duplicate entry")) {
            throw error;
          }
        }
      }
    }
  }

  static async removeArticle(collectionId, articleId) {
    const sql =
      "DELETE FROM collection_articles WHERE collection_id = ? AND article_id = ?";
    return await DB.query(sql, [collectionId, articleId]);
  }

  static async isArticleInCollection(collectionId, articleId) {
    const sql =
      "SELECT 1 FROM collection_articles WHERE collection_id = ? AND article_id = ?";
    const result = await DB.getOne(sql, [collectionId, articleId]);
    return !!result;
  }

  static async getPopular(limit = 6) {
    const sql = `
    SELECT 
      c.*, 
      au.name as author_name,
      COUNT(ca.article_id) as articles_count,
      IFNULL(SUM(a.views_count), 0) as total_collection_views
    FROM collections c
    LEFT JOIN authors au ON c.author_id = au.id
    LEFT JOIN collection_articles ca ON c.id = ca.collection_id
    LEFT JOIN articles a ON ca.article_id = a.id
    GROUP BY c.id
    ORDER BY total_collection_views DESC
    LIMIT ?
  `;

    const collections = await DB.query(sql, [parseInt(limit)]);

    // Optionally attach the top 3 preview articles for each collection
    for (let collection of collections) {
      const articlesSql = `
      SELECT a.id, a.title, a.image_url, a.slug 
      FROM articles a
      INNER JOIN collection_articles ca ON a.id = ca.article_id
      WHERE ca.collection_id = ?
      LIMIT 3
    `;
      collection.preview_articles = await DB.query(articlesSql, [
        collection.id,
      ]);
    }

    return collections;
  }
}

module.exports = Collection;
