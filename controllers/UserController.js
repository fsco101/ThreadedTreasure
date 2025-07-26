const { promisePool } = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

class UserController {
  // Create new user
  static async createUser(req, res) {
    try {
      const { name, email, password, phone, address, role } = req.body;
      
      // Validate required fields
      if (!name || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Name, email, and password are required'
        });
      }
      
      // Check if user already exists
      const [existingUsers] = await promisePool.execute('SELECT * FROM users WHERE email = ?', [email]);
      if (existingUsers.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists'
        });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12);
      
      // Create user
      const query = `
        INSERT INTO users (name, email, password, phone, address, role, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
      `;
      const [result] = await promisePool.execute(query, [name, email, hashedPassword, phone, address, role || 'user']);
      
      const user = {
        id: result.insertId,
        name,
        email,
        phone,
        address,
        role: role || 'user'
      };
      
      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: user
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get user by ID
  static async getUserById(req, res) {
    try {
      const { id } = req.params;
      
      const [rows] = await promisePool.execute('SELECT * FROM users WHERE id = ?', [id]);
      
      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      const user = rows[0];
      // Remove password from response
      delete user.password;
      
      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get all users
  static async getAllUsers(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      
      const query = `
        SELECT id, name, email, phone, address, role, is_active, profile_photo, last_login, created_at, updated_at 
        FROM users 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `;
      const [rows] = await promisePool.execute(query, [limit, offset]);
      
      // Get total count
      const [countResult] = await promisePool.execute('SELECT COUNT(*) as total FROM users');
      const total = countResult[0].total;
      
      res.json({
        success: true,
        data: rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Update user
  static async updateUser(req, res) {
    try {
        const { id } = req.params;
        let { name, email, phone, address, role, is_active } = req.body;

        // If only role and/or is_active are present, update only those
        if (typeof role !== 'undefined' || typeof is_active !== 'undefined') {
            // Validate role
            if (role && !['user', 'admin'].includes(role)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid role. Must be "user" or "admin"'
                });
            }
            // Parse is_active to integer
            let activeValue;
            if (typeof is_active !== 'undefined') {
                if (
                    is_active === true ||
                    is_active === 1 ||
                    is_active === '1' ||
                    is_active === 'true' ||
                    is_active === 'on'
                ) {
                    activeValue = 1;
                } else {
                    activeValue = 0;
                }
            }

            // Build dynamic query
            let query = 'UPDATE users SET ';
            let params = [];
            if (typeof role !== 'undefined') {
                query += 'role = ?';
                params.push(role);
            }
            if (typeof activeValue !== 'undefined') {
                if (params.length > 0) query += ', ';
                query += 'is_active = ?';
                params.push(activeValue);
            }
            query += ', updated_at = NOW() WHERE id = ?';
            params.push(id);

            const [result] = await promisePool.execute(query, params);
            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            // Get updated user
            const [rows] = await promisePool.execute('SELECT * FROM users WHERE id = ?', [id]);
            const user = rows[0];
            delete user.password;
            user.is_active = Number(user.is_active);
            return res.json({
                success: true,
                message: 'User updated successfully',
                data: user
            });
        }

        // Otherwise, update profile fields (for self-update)
        name = name === undefined || name === '' ? null : name;
        email = email === undefined || email === '' ? null : email;
        phone = phone === undefined || phone === '' ? null : phone;
        address = address === undefined || address === '' ? null : address;

        // Fix: Always preserve the current role if not provided in the update
        if (role === undefined || role === '' || role === null) {
            // Fetch current role from DB
            const [current] = await promisePool.execute('SELECT role FROM users WHERE id = ?', [id]);
            role = current.length > 0 ? current[0].role : 'user';
        }

        // Validate role
        if (role && !['user', 'admin'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role. Must be "user" or "admin"'
            });
        }

        const query = `
            UPDATE users 
            SET name = ?, email = ?, phone = ?, address = ?, role = ?, updated_at = NOW()
            WHERE id = ?
        `;
        const [result] = await promisePool.execute(query, [name, email, phone, address, role, id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        // Get updated user
        const [rows] = await promisePool.execute('SELECT * FROM users WHERE id = ?', [id]);
        const user = rows[0];
        delete user.password;
        user.is_active = Number(user.is_active);
        res.json({
            success: true,
            message: 'User updated successfully',
            data: user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
  }

  // Delete user
  static async deleteUser(req, res) {
    try {
      const { id } = req.params;
      
      const [result] = await promisePool.execute('DELETE FROM users WHERE id = ?', [id]);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Search users
  static async searchUsers(req, res) {
    try {
      const { q } = req.query;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      
      if (!q) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }
      
      const query = `
        SELECT id, name, email, phone, address, role, created_at, updated_at 
        FROM users 
        WHERE name LIKE ? OR email LIKE ? OR phone LIKE ?
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `;
      const searchPattern = `%${q}%`;
      const [rows] = await promisePool.execute(query, [searchPattern, searchPattern, searchPattern, limit, offset]);
      
      res.json({
        success: true,
        data: rows
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Change password
  static async changePassword(req, res) {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password and new password are required'
        });
      }

      // Get current user
      const [users] = await promisePool.execute('SELECT * FROM users WHERE id = ?', [userId]);
      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const user = users[0];

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12);

      // Update password
      await promisePool.execute('UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?', [hashedPassword, userId]);

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Upload avatar
  static async uploadAvatar(req, res) {
    try {
      const userId = req.user.id;
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No image file provided'
        });
      }

      // The file is stored directly in uploads/ directory, not in a users/ subdirectory
      const avatarPath = req.file.filename;

      // Update user avatar in profile_photo column
      await promisePool.execute('UPDATE users SET profile_photo = ?, updated_at = NOW() WHERE id = ?', [avatarPath, userId]);

      // Get updated user
      const [users] = await promisePool.execute('SELECT * FROM users WHERE id = ?', [userId]);
      const user = users[0];
      delete user.password;

      res.json({
        success: true,
        message: 'Avatar uploaded successfully',
        data: {
          avatar: avatarPath,
          profile_photo: avatarPath,
          user: user
        }
      });
    } catch (error) {
      console.error('Avatar upload error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = UserController;
