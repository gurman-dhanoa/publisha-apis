const pool = require('../config/database');

class DB {
  static async query(sql, params = []) {
    try {
      const [results] = await pool.execute(sql, params);
      return results;
    } catch (error) {
      throw error;
    }
  }

  static async getOne(sql, params = []) {
    const results = await this.query(sql, params);
    return results[0];
  }

  static async insert(table, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
    const [result] = await pool.execute(sql, values);
    return result;
  }

  static async update(table, data, where, whereParams = []) {
    const keys = Object.keys(data);
    const setClause = keys.map(key => `${key} = ?`).join(', ');
    
    const sql = `UPDATE ${table} SET ${setClause} WHERE ${where}`;
    const params = [...Object.values(data), ...whereParams];
    
    const [result] = await pool.execute(sql, params);
    return result;
  }
}

module.exports = DB;