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

    // Standard insert without a transaction connection
    const result = await DB.insert("collections", collectionData);
    const collectionId = result.insertId;

    // Add articles if provided
    if (data.article_ids && data.article_ids.length > 0) {
      await this.addArticles(collectionId, data.article_ids);
    }

    return this.findById(collectionId);
  }

  static async update(id, data) {
    const updateData = {};

    if (data.name) {
      updateData.name = data.name;
      // updateData.slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    }

    if (data.description !== undefined) {
      updateData.description = data.description;
    }

    // 1. Update the base collection details
    if (Object.keys(updateData).length > 0) {
      await DB.update("collections", updateData, "id = ?", [id]);
    }

    // 2. Synchronize the associated articles
    if (data.article_ids && Array.isArray(data.article_ids)) {
      // Step A: Completely wipe the existing article mappings for this collection
      await DB.query(
        "DELETE FROM collection_articles WHERE collection_id = ?",
        [id],
      );

      // Step B: Re-insert the new list using our existing optimized bulk-insert helper
      if (data.article_ids.length > 0) {
        await this.addArticles(id, data.article_ids);
      }
    }

    return this.findById(id);
  }

  static async delete(id) {
    return await DB.query("DELETE FROM collections WHERE id = ?", [id]);
  }

  static async getByAuthor(authorId, { page = 1, limit = 10 } = {}) {
    const offset = (page - 1) * limit;

    // 1. Get the total count for the pagination math
    const countSql =
      "SELECT COUNT(*) as total FROM collections WHERE author_id = ?";
    const [totalResult] = await DB.query(countSql, [authorId]);
    const total = totalResult.total;

    // 2. Fetch the paginated data
    const sql = `
      SELECT c.*, au.name as author_name,
        (SELECT COUNT(*) FROM collection_articles ca INNER JOIN articles a ON ca.article_id = a.id WHERE ca.collection_id = c.id AND a.deleted_at IS NULL) as articles_count,
        (SELECT COALESCE(SUM(a.views_count), 0) FROM articles a INNER JOIN collection_articles ca ON a.id = ca.article_id WHERE ca.collection_id = c.id AND a.deleted_at IS NULL) as total_collection_views
      FROM collections c
      LEFT JOIN authors au ON c.author_id = au.id
      WHERE c.author_id = ?
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const collections = await DB.query(sql, [
      authorId,
      parseInt(limit),
      parseInt(offset),
    ]);

    // 3. Attach the preview images safely
    const collectionsWithPreviews =
      await this._attachPreviewArticles(collections);

    return { collections: collectionsWithPreviews, total };
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

  static async removeArticle(collectionId, articleId) {
    return await DB.query(
      "DELETE FROM collection_articles WHERE collection_id = ? AND article_id = ?",
      [collectionId, articleId],
    );
  }

  static async isArticleInCollection(collectionId, articleId) {
    const result = await DB.getOne(
      "SELECT 1 FROM collection_articles WHERE collection_id = ? AND article_id = ?",
      [collectionId, articleId],
    );
    return !!result;
  }

  // --- PRIVATE HELPER: Solves the N+1 Query Problem ---
  static async getArticles(collectionId) {
    const sql = `
      SELECT a.*, au.name as author_name, ca.added_at as added_to_collection_at
      FROM articles a
      INNER JOIN collection_articles ca ON a.id = ca.article_id
      LEFT JOIN authors au ON a.author_id = au.id
      WHERE ca.collection_id = ? AND a.deleted_at IS NULL AND a.status = 'published'
      ORDER BY ca.sort_order ASC, ca.added_at DESC
    `;
    return await DB.query(sql, [collectionId]);
  }

  static async addArticles(collectionId, articleIds, connection = null) {
    if (!articleIds || articleIds.length === 0) return;
    const db = connection || DB;

    // 1. Fetch valid articles. (Note: The DB returns these in random/ID order)
    const validArticles = await db.query(
      'SELECT id FROM articles WHERE id IN (?) AND status = "published" AND deleted_at IS NULL',
      [articleIds],
    );

    if (validArticles.length === 0) return;

    // Create a quick lookup array of the valid IDs
    const validIds = validArticles.map((a) => a.id);

    // 2. CRITICAL FIX: Loop over the explicit frontend array to preserve the requested order,
    // only keeping the IDs that we verified actually exist in the database.
    const orderedValidIds = articleIds.filter((id) => validIds.includes(id));

    // 3. Map the values, explicitly passing the array 'index' as the sort_order
    const values = orderedValidIds.map((id, index) => [
      collectionId,
      id,
      index,
    ]);

    // Insert them with the sort_order included
    const sql =
      "INSERT IGNORE INTO collection_articles (collection_id, article_id, sort_order) VALUES ?";
    await db.query(sql, [values]);
  }

  // --- PRIVATE HELPER: Solves the N+1 Query Problem ---
  static async _attachPreviewArticles(collections) {
    if (collections.length === 0) return [];

    const collectionIds = collections.map((c) => c.id);

    // CRITICAL FIX: Updated the ORDER BY clause in the Window Function to respect sort_order
    const previewSql = `
      SELECT * FROM (
        SELECT a.id, a.title, a.image_url, a.slug, ca.collection_id,
               ROW_NUMBER() OVER(PARTITION BY ca.collection_id ORDER BY ca.sort_order ASC, ca.added_at DESC) as rn
        FROM articles a
        INNER JOIN collection_articles ca ON a.id = ca.article_id
        WHERE ca.collection_id IN (?) AND a.deleted_at IS NULL AND a.status = 'published'
      ) sub WHERE rn <= 3
    `;

    const allPreviews = await DB.query(previewSql, [collectionIds]);

    // Map the previews back to their respective collections in memory
    return collections.map((collection) => {
      collection.preview_articles = allPreviews
        .filter((p) => p.collection_id === collection.id)
        .map(({ id, title, image_url, slug }) => ({
          id,
          title,
          image_url,
          slug,
        }));
      return collection;
    });
  }
}

module.exports = Collection;
