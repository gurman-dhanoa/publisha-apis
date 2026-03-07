const DB = require("../utils/db");

class Admin {
  static async findById(id) {
    const sql = "SELECT id, email, name, mfa_enabled, created_at FROM admins WHERE id = ?";
    return await DB.getOne(sql, [id]);
  }

  static async findByEmail(email) {
    // Note: We need the mfa_secret here for validation, but we will delete it 
    // from the object before sending it to the frontend in the controller.
    const sql = "SELECT * FROM admins WHERE email = ?";
    return await DB.getOne(sql, [email]);
  }

  static async create(data) {
    const result = await DB.insert("admins", {
      email: data.email,
      name: data.name
    });
    return this.findById(result.insertId);
  }

  static async update(id, data) {
    await DB.update("admins", data, "id = ?", [id]);
    return this.findById(id);
  }
}

module.exports = Admin;