const DB = require("../utils/db");

class Collection {
  static async findById(id) {
    const sql = `
      SELECT c.*, au.name as author_name,
        (SELECT COUNT(*) FROM collection_articles ca 
         INNER JOIN articles a ON ca.article_id = a.id 
         WHERE ca.collection_id = c.id AND a.deleted_at IS NULL) as articles_count
      FROM collections c
      LEFT JOIN authors au ON c.author_id = au.id
      WHERE c.id = ?
    `;
    const collection = await DB.getOne(sql, [id]);
    if (collection) collection.articles = await this.getArticles(collection.id);
    return collection;
  }

  static async findBySlug(slug) {
    const sql = `
      SELECT c.*, au.name as author_name,
        (SELECT COUNT(*) FROM collection_articles ca 
         INNER JOIN articles a ON ca.article_id = a.id 
         WHERE ca.collection_id = c.id AND a.deleted_at IS NULL) as articles_count
      FROM collections c
      LEFT JOIN authors au ON c.author_id = au.id
      WHERE c.slug = ?
    `;
    const collection = await DB.getOne(sql, [slug]);
    if (collection) collection.articles = await this.getArticles(collection.id);
    return collection;
  }

  static async create(data) {
    return await DB.transaction(async (connection) => {
      const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      
      const collectionData = {
        author_id: data.author_id,
        name: data.name,
        description: data.description || null,
        slug,
      };

      const result = await DB.insert("collections", collectionData, connection);
      const collectionId = result.insertId;

      if (data.article_ids && data.article_ids.length > 0) {
        await this.addArticles(collectionId, data.article_ids, connection);
      }
      return collectionId;
    }).then(id => this.findById(id));
  }

  static async update(id, data) {
    const updateData = {};
    if (data.name) {
      updateData.name = data.name;
      updateData.slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    }
    if (data.description !== undefined) updateData.description = data.description;

    if (Object.keys(updateData).length > 0) {
      await DB.update("collections", updateData, "id = ?", [id]);
    }
    return this.findById(id);
  }

  static async delete(id) {
    return await DB.query("DELETE FROM collections WHERE id = ?", [id]);
  }

  static async getByAuthor(authorId) {
    const sql = `
      SELECT c.*, au.name as author_name,
        (SELECT COUNT(*) FROM collection_articles ca INNER JOIN articles a ON ca.article_id = a.id WHERE ca.collection_id = c.id AND a.deleted_at IS NULL) as articles_count,
        (SELECT COALESCE(SUM(a.views_count), 0) FROM articles a INNER JOIN collection_articles ca ON a.id = ca.article_id WHERE ca.collection_id = c.id AND a.deleted_at IS NULL) as total_collection_views
      FROM collections c
      LEFT JOIN authors au ON c.author_id = au.id
      WHERE c.author_id = ?
      ORDER BY c.created_at DESC
    `;
    const collections = await DB.query(sql, [authorId]);
    return await this._attachPreviewArticles(collections);
  }

  static async getPopular(limit = 6) {
    const sql = `
      SELECT c.*, au.name as author_name,
        COUNT(ca.article_id) as articles_count,
        COALESCE(SUM(a.views_count), 0) as total_collection_views
      FROM collections c
      LEFT JOIN authors au ON c.author_id = au.id
      LEFT JOIN collection_articles ca ON c.id = ca.collection_id
      LEFT JOIN articles a ON ca.article_id = a.id AND a.deleted_at IS NULL AND a.status = 'published'
      GROUP BY c.id
      ORDER BY total_collection_views DESC
      LIMIT ?
    `;
    const collections = await DB.query(sql, [parseInt(limit)]);
    return await this._attachPreviewArticles(collections);
  }

  static async getArticles(collectionId) {
    const sql = `
      SELECT a.*, au.name as author_name, ca.added_at as added_to_collection_at
      FROM articles a
      INNER JOIN collection_articles ca ON a.id = ca.article_id
      LEFT JOIN authors au ON a.author_id = au.id
      WHERE ca.collection_id = ? AND a.deleted_at IS NULL AND a.status = 'published'
      ORDER BY ca.added_at DESC
    `;
    return await DB.query(sql, [collectionId]);
  }

  static async addArticles(collectionId, articleIds, connection = null) {
    if (!articleIds || articleIds.length === 0) return;
    const db = connection || DB;

    // 1. Fetch only valid, published, non-deleted articles from the provided IDs
    const validArticles = await db.query(
      'SELECT id FROM articles WHERE id IN (?) AND status = "published" AND deleted_at IS NULL', 
      [articleIds]
    );
    
    if (validArticles.length === 0) return;

    // 2. Perform a single bulk INSERT IGNORE (silently skips duplicates)
    const values = validArticles.map((a) => [collectionId, a.id]);
    const sql = "INSERT IGNORE INTO collection_articles (collection_id, article_id) VALUES ?";
    await db.query(sql, [values]);
  }

  static async removeArticle(collectionId, articleId) {
    return await DB.query("DELETE FROM collection_articles WHERE collection_id = ? AND article_id = ?", [collectionId, articleId]);
  }

  static async isArticleInCollection(collectionId, articleId) {
    const result = await DB.getOne("SELECT 1 FROM collection_articles WHERE collection_id = ? AND article_id = ?", [collectionId, articleId]);
    return !!result;
  }

  // --- PRIVATE HELPER: Solves the N+1 Query Problem ---
  static async _attachPreviewArticles(collections) {
    if (collections.length === 0) return [];
    
    const collectionIds = collections.map(c => c.id);
    
    // Uses a Window Function to grab the top 3 articles for EVERY collection in a single query
    const previewSql = `
      SELECT * FROM (
        SELECT a.id, a.title, a.image_url, a.slug, ca.collection_id,
               ROW_NUMBER() OVER(PARTITION BY ca.collection_id ORDER BY ca.added_at DESC) as rn
        FROM articles a
        INNER JOIN collection_articles ca ON a.id = ca.article_id
        WHERE ca.collection_id IN (?) AND a.deleted_at IS NULL AND a.status = 'published'
      ) sub WHERE rn <= 3
    `;
    
    const allPreviews = await DB.query(previewSql, [collectionIds]);

    // Map the previews back to their respective collections in memory
    return collections.map(collection => {
      collection.preview_articles = allPreviews
        .filter(p => p.collection_id === collection.id)
        .map(({ id, title, image_url, slug }) => ({ id, title, image_url, slug }));
      return collection;
    });
  }
}

module.exports = Collection;