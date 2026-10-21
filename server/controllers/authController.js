const bcrypt = require('bcryptjs');
const db = require('../database/db');
const { generateToken, getNextMidnight } = require('../utils/authMiddleware');

class AuthController {
  /**
   * Direct Email + Password Login
   */
  async login(req, res) {
    try {
      const { email, password, portalRole, expectedRole } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password are required.' });
      }

      const user = await db.get('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [email.trim()]);
      if (!user || !user.password_hash) {
        return res.status(401).json({ success: false, error: 'Invalid email or password.' });
      }

      // Strictly verify password against salted cryptographic bcrypt hash stored in the database
      const isMatch = bcrypt.compareSync(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ success: false, error: 'Invalid email or password.' });
      }

      const requestedRole = (portalRole || expectedRole || '').toLowerCase().trim();
      const normalizedRole = user.role === 'employee' ? 'staff' : user.role;

      if (requestedRole) {
        const isOwnerPortal = requestedRole === 'owner';
        const isStaffPortal = requestedRole === 'staff' || requestedRole === 'employee';

        if (isOwnerPortal && normalizedRole !== 'owner') {
          return res.status(403).json({
            success: false,
            error: 'Access Denied: This account is registered as Store Staff and cannot access the Store Owner portal. Please switch to the Store Staff tab.',
            expectedRole: 'staff',
            userRole: normalizedRole,
          });
        }

        if (isStaffPortal && normalizedRole !== 'staff') {
          return res.status(403).json({
            success: false,
            error: 'Access Denied: This account is registered as Store Owner and cannot access the Store Staff portal. Please switch to the Store Owner tab.',
            expectedRole: 'owner',
            userRole: normalizedRole,
          });
        }
      }

      const nextMidnight = getNextMidnight();
      const token = generateToken(user);
      const expiresAt = nextMidnight.getTime();
      const msLeft = Math.max(0, expiresAt - Date.now());
      const hoursLeft = (msLeft / (1000 * 60 * 60)).toFixed(1);

      // Record login timestamp
      const loginTimestamp = new Date().toISOString();
      await db.run('UPDATE users SET last_login_at = ? WHERE id = ?', [loginTimestamp, user.id]);

      // Set JWT in HTTP cookie with midnight expiration
      const isProduction = process.env.NODE_ENV === 'production' && req.secure;
      res.cookie('token', token, {
        httpOnly: true,
        expires: nextMidnight,
        sameSite: 'lax',
        path: '/',
        secure: isProduction,
      });

      return res.json({
        success: true,
        message: `Welcome back, ${user.name}!`,
        token,
        expiresIn: `${hoursLeft}h (Midnight 12:00 AM reset)`,
        expiresAt,
        resetsAt: nextMidnight.toISOString(),
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: normalizedRole,
          last_login_at: loginTimestamp,
        },
      });
    } catch (error) {
      console.error('[AuthController] Login error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Login failed.' });
    }
  }

  logout(req, res) {
    try {
      const isProduction = process.env.NODE_ENV === 'production' && req.secure;
      res.clearCookie('token', {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProduction,
      });
      return res.json({
        success: true,
        message: 'Logged out successfully. Token cookie cleared.',
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  async getMe(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Not logged in.' });
      }

      const user = await db.get('SELECT id, name, email, role, created_at, last_login_at FROM users WHERE id = ?', [req.user.id]);
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found.' });
      }

      const normalizedRole = user.role === 'employee' ? 'staff' : user.role;
      const expiresAt = req.user?.expiresAt || (req.user?.exp ? req.user.exp * 1000 : null);
      return res.json({
        success: true,
        user: { ...user, role: normalizedRole },
        expiresAt,
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Get all users (Owner only)
   */
  async getUsers(req, res) {
    try {
      const users = await db.query('SELECT id, name, email, role, created_at, last_login_at FROM users ORDER BY id ASC');
      const normalizedUsers = users.map(u => ({
        ...u,
        role: u.role === 'employee' ? 'staff' : u.role
      }));
      return res.json({ success: true, data: normalizedUsers, users: normalizedUsers });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Create new Staff or Owner directly (Owner only)
   */
  async createUser(req, res) {
    try {
      const { name, email, password, role } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, error: 'User name is required.' });
      }
      if (!email || !email.trim()) {
        return res.status(400).json({ success: false, error: 'Valid email is required.' });
      }
      const requestedRole = (role || 'staff').toLowerCase().trim();
      if (!['owner', 'staff', 'employee'].includes(requestedRole)) {
        return res.status(400).json({ success: false, error: 'Role must be either "staff" or "owner".' });
      }
      const targetRole = requestedRole === 'employee' ? 'staff' : requestedRole;

      // Default password: staff123 for staff, owner123 for owner
      const defaultPassword = targetRole === 'owner' ? 'owner123' : 'staff123';
      const finalPassword = (password && password.trim()) ? password.trim() : defaultPassword;

      if (!finalPassword || finalPassword.length < 4) {
        return res.status(400).json({ success: false, error: 'Password must be at least 4 characters.' });
      }

      const trimmedName = name.trim();
      const trimmedEmail = email.trim().toLowerCase();

      // Check duplicate user name (case-insensitive)
      const existingName = await db.get(
        'SELECT id, name, email FROM users WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))',
        [trimmedName]
      );

      // Check duplicate email (case-insensitive)
      const existingEmail = await db.get(
        'SELECT id, name, email FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))',
        [trimmedEmail]
      );

      if (existingName && existingEmail) {
        return res.status(409).json({
          success: false,
          error: `Both user name "${trimmedName}" and email "${trimmedEmail}" already exist in the system.`,
          conflict: 'both',
          conflicts: ['name', 'email'],
          details: {
            name: `User name "${trimmedName}" is already taken by an existing team member.`,
            email: `Email address "${trimmedEmail}" is already registered.`
          }
        });
      }

      if (existingName) {
        return res.status(409).json({
          success: false,
          error: `User name "${trimmedName}" is already taken by another team member. Please choose a unique user name.`,
          conflict: 'name',
          conflicts: ['name'],
          details: {
            name: `User name "${trimmedName}" is already taken.`
          }
        });
      }

      if (existingEmail) {
        return res.status(409).json({
          success: false,
          error: `Email address "${trimmedEmail}" is already registered. Please choose a unique email address.`,
          conflict: 'email',
          conflicts: ['email'],
          details: {
            email: `Email address "${trimmedEmail}" is already registered.`
          }
        });
      }

      const passwordHash = bcrypt.hashSync(finalPassword, 10);
      const result = await db.run(`
        INSERT INTO users (name, email, password_hash, role)
        VALUES (?, ?, ?, ?)
      `, [trimmedName, trimmedEmail, passwordHash, targetRole]);

      const newUser = {
        id: result.lastInsertRowid || result.insertId,
        name: trimmedName,
        email: trimmedEmail,
        role: targetRole,
        created_at: new Date().toISOString()
      };

      console.log(`[AuthController] Owner ${req.user?.name} created new ${targetRole}: ${newUser.email}`);
      return res.status(201).json({
        success: true,
        message: `${targetRole === 'owner' ? 'Store Owner' : 'Store Staff'} account created successfully!`,
        data: newUser,
        user: newUser
      });
    } catch (error) {
      console.error('[AuthController] Create user error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Helper endpoint: Create Staff
   */
  async createStaff(req, res) {
    req.body.role = 'staff';
    return this.createUser(req, res);
  }

  /**
   * Helper endpoint: Create Owner
   */
  async createOwner(req, res) {
    req.body.role = 'owner';
    return this.createUser(req, res);
  }

  /**
   * Delete Staff or Owner directly (Owner only)
   */
  async deleteUser(req, res) {
    try {
      const targetId = parseInt(req.params.id, 10);
      if (!targetId) {
        return res.status(400).json({ success: false, error: 'Valid user ID is required.' });
      }

      // Prevent self-deletion
      if (req.user && req.user.id === targetId) {
        return res.status(400).json({ success: false, error: 'You cannot delete your own active account.' });
      }

      const user = await db.get('SELECT id, name, email, role FROM users WHERE id = ?', [targetId]);
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found.' });
      }

      // Primary developer protection: developer@supermarket.com cannot be deleted
      if (user.email.toLowerCase() === 'developer@supermarket.com') {
        return res.status(403).json({
          success: false,
          error: 'The primary Developer Administrator account (developer@supermarket.com) cannot be deleted.'
        });
      }

      // Disassociate invoices and store requirements before user deletion
      try {
        await db.run('UPDATE invoices SET created_by_user_id = NULL WHERE created_by_user_id = ?', [targetId]);
        await db.run('UPDATE invoices SET approved_by_user_id = NULL WHERE approved_by_user_id = ?', [targetId]);
        await db.run('UPDATE store_requirements SET requested_by_user_id = NULL WHERE requested_by_user_id = ?', [targetId]);
        await db.run('UPDATE store_requirements SET fulfilled_by_user_id = NULL WHERE fulfilled_by_user_id = ?', [targetId]);
        await db.run('DELETE FROM notifications WHERE user_id = ? OR created_by_user_id = ?', [targetId, targetId]);
      } catch (fkErr) {
        console.warn('[AuthController] Notice while updating foreign keys before user deletion:', fkErr.message);
      }

      await db.run('DELETE FROM users WHERE id = ?', [targetId]);
      console.log(`[AuthController] Owner ${req.user?.name} deleted user ${user.name} (${user.email}, ${user.role})`);

      return res.json({
        success: true,
        message: `${user.role === 'owner' ? 'Store Owner' : 'Staff member'} "${user.name}" (${user.email}) deleted successfully.`
      });
    } catch (error) {
      console.error('[AuthController] Delete user error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Change Password (for current logged-in user: both Owner and Staff)
   */
  async changePassword(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized. Please sign in.' });
      }

      const { currentPassword, newPassword, confirmPassword } = req.body;
      if (!currentPassword) {
        return res.status(400).json({ success: false, error: 'Current password is required.' });
      }
      if (!newPassword || newPassword.length < 4) {
        return res.status(400).json({ success: false, error: 'New password must be at least 4 characters.' });
      }
      if (confirmPassword && newPassword !== confirmPassword) {
        return res.status(400).json({ success: false, error: 'New password and confirm password do not match.' });
      }

      const user = await db.get('SELECT id, name, email, password_hash, role FROM users WHERE id = ?', [userId]);
      if (!user) {
        return res.status(404).json({ success: false, error: 'User account not found.' });
      }

      // Verify current password
      const isMatch = bcrypt.compareSync(currentPassword, user.password_hash);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          error: 'Current password is incorrect. Please re-enter your current password.',
          field: 'currentPassword'
        });
      }

      if (currentPassword === newPassword) {
        return res.status(400).json({
          success: false,
          error: 'New password must be different from your current password.',
          field: 'newPassword'
        });
      }

      const passwordHash = bcrypt.hashSync(newPassword, 10);
      await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);

      return res.json({
        success: true,
        message: 'Your password has been changed successfully.',
      });
    } catch (error) {
      console.error('[AuthController] Change password error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Reset Password for any Staff or Owner account (Owner only)
   */
  async resetUserPassword(req, res) {
    try {
      const targetId = parseInt(req.params.id, 10);
      const { newPassword } = req.body;

      if (!targetId) {
        return res.status(400).json({ success: false, error: 'Valid user ID is required.' });
      }
      if (!newPassword || newPassword.length < 4) {
        return res.status(400).json({ success: false, error: 'New password must be at least 4 characters.' });
      }

      const user = await db.get('SELECT id, name, email, role FROM users WHERE id = ?', [targetId]);
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found.' });
      }

      const passwordHash = bcrypt.hashSync(newPassword, 10);
      await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, targetId]);

      const roleLabel = user.role === 'owner' ? 'Store Owner' : 'Store Staff';
      return res.json({
        success: true,
        message: `Password for ${roleLabel} "${user.name}" (${user.email}) has been reset successfully.`
      });
    } catch (error) {
      console.error('[AuthController] Reset password error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  async getDemoUsers(req, res) {
    try {
      return res.json({
        success: true,
        demoAccounts: [
          {
            role: 'owner',
            label: 'Developer Administrator',
            name: 'Developer',
            email: 'developer@supermarket.com',
            description: 'Full administrative access: approve & pay invoices, manage staff & owners, analytics',
          },
          {
            role: 'owner',
            label: 'Store Owner',
            name: 'Akanksh',
            email: 'akanksh@supermarket.com',
            description: 'Store Owner access: approve & pay invoices, manage staff, analytics',
          },
          {
            role: 'owner',
            label: 'Store Owner',
            name: 'Hemanth',
            email: 'hemanth@supermarket.com',
            description: 'Store Owner access: approve & pay invoices, manage staff, analytics',
          },
          {
            role: 'staff',
            label: 'Store Staff',
            name: 'Staff',
            email: 'staff@supermarket.com',
            description: 'Store Staff access: upload supplier invoices, submit inventory requirements',
          },
        ],
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new AuthController();
