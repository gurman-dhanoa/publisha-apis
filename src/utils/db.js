const pool = require('../config/database');

class DB {
  /**
   * Executes a standard query.
   * @param {string} sql - The SQL query.
   * @param {Array} params - The query parameters.
   * @param {Object} [connection] - Optional connection object for transactions.
   */
  static async query(sql, params = [], connection = null) {
    try {
      // Use the provided transaction connection, or fall back to the general pool
      const db = connection || pool;
      const [results] = await db.query(sql, params);
      return results;
    } catch (error) {
      throw error; // Let the controller handle the error response
    }
  }

  static async getOne(sql, params = [], connection = null) {
    const results = await this.query(sql, params, connection);
    return results[0];
  }

  static async insert(table, data, connection = null) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
    
    const db = connection || pool;
    const [result] = await db.query(sql, values);
    return result;
  }

  static async update(table, data, where, whereParams = [], connection = null) {
    const keys = Object.keys(data);
    const setClause = keys.map(key => `${key} = ?`).join(', ');
    
    const sql = `UPDATE ${table} SET ${setClause} WHERE ${where}`;
    const params = [...Object.values(data), ...whereParams];
    
    const db = connection || pool;
    const [result] = await db.query(sql, params);
    return result;
  }

  /**
   * Wrapper for executing multiple queries within a single transaction.
   * @param {Function} callback - A function containing the queries to execute.
   */
  static async transaction(callback) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      // Pass the isolated connection to the callback function
      const result = await callback(connection);
      
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release(); // Always release the connection back to the pool
    }
  }
}

module.exports = DB;