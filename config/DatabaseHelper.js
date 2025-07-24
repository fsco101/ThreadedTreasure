const { promisePool } = require('./database');

// Database helper functions for common operations
class DatabaseHelper {
  // Generic query execution
  static async execute(query, params = []) {
    try {
      const [rows] = await promisePool.execute(query, params);
      return rows;
    } catch (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }
  }

  // Find a single record by ID
  static async findById(table, id) {
    const query = `SELECT * FROM ${table} WHERE id = ?`;
    const rows = await this.execute(query, [id]);
    return rows[0] || null;
  }

  // Find all records with optional conditions
  static async findAll(table, conditions = '', params = []) {
    const query = `SELECT * FROM ${table} ${conditions}`;
    return await this.execute(query, params);
  }

  // Insert a new record
  static async insert(table, data) {
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);
    
    const query = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
    const [result] = await promisePool.execute(query, values);
    return result.insertId;
  }

  // Update a record by ID
  static async update(table, id, data) {
    const columns = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(data), id];
    
    const query = `UPDATE ${table} SET ${columns} WHERE id = ?`;
    const [result] = await promisePool.execute(query, values);
    return result.affectedRows;
  }

  // Delete a record by ID
  static async delete(table, id) {
    const query = `DELETE FROM ${table} WHERE id = ?`;
    const [result] = await promisePool.execute(query, [id]);
    return result.affectedRows;
  }

  // Count records
  static async count(table, conditions = '', params = []) {
    const query = `SELECT COUNT(*) as total FROM ${table} ${conditions}`;
    const rows = await this.execute(query, params);
    return rows[0].total;
  }
}

module.exports = DatabaseHelper;
