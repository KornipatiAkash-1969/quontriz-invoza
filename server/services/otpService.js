const crypto = require('crypto');
const db = require('../database/db');
const emailService = require('./emailService');

const DEV_EMAIL = 'developer@supermarket.com';
const DEFAULT_OTP = process.env.DEFAULT_OTP || '196969';

class OtpService {
  /**
   * Generate a 6-digit OTP code and record it in the database.
   * - developer@supermarket.com: Always receives 196969 (or process.env.DEFAULT_OTP)
   * - All other emails: Receive a genuine, random, cryptographically secure 6-digit numeric OTP
   * @param {string} email - Target email
   * @param {string} purpose - 'login' | 'register' | 'create_member' | 'create_staff' | 'current_owner_auth' | 'new_owner_verification'
   * @param {object|null} metadata - Optional extra payload (e.g. name, role, tempHash)
   * @param {number} expiresInMinutes - Expiry duration (defaults to 10 mins)
   */
  async generateOtp(email, purpose, metadata = null, expiresInMinutes = 10) {
    if (!email || !email.trim()) {
      throw new Error('Email is required to generate OTP.');
    }
    const cleanEmail = email.trim().toLowerCase();
    const cleanPurpose = (purpose || 'login').toLowerCase().trim();

    // 196969 ONLY works for developer@supermarket.com.
    // All other users generate a genuine 6-digit random numeric code.
    const isDev = cleanEmail === DEV_EMAIL;
    const otpCode = isDev 
      ? DEFAULT_OTP 
      : crypto.randomInt(100000, 1000000).toString();

    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString();
    const metaStr = metadata ? JSON.stringify(metadata) : null;

    try {
      // Invalidate existing unused OTPs for the same email & purpose
      await db.run(
        `UPDATE otps SET verified_at = CURRENT_TIMESTAMP 
         WHERE LOWER(email) = LOWER(?) AND purpose = ? AND verified_at IS NULL`,
        [cleanEmail, cleanPurpose]
      );

      // Insert fresh OTP
      const result = await db.run(
        `INSERT INTO otps (email, otp_code, purpose, metadata, attempts, expires_at)
         VALUES (?, ?, ?, ?, 0, ?)`,
        [cleanEmail, otpCode, cleanPurpose, metaStr, expiresAt]
      );

      // Prominent console output for email dispatch simulation
      console.log(`\n==============================================================`);
      console.log(`📧 [EMAIL OTP DISPATCH] Sent to ${cleanEmail}`);
      console.log(`Purpose   : ${cleanPurpose.toUpperCase()}`);
      console.log(`OTP Code  : >>> ${otpCode} <<<`);
      console.log(`Valid for : ${expiresInMinutes} minutes (Expires: ${expiresAt})`);
      if (isDev) {
        console.log(`Type      : Developer Account Default OTP (${DEFAULT_OTP})`);
      } else {
        console.log(`Type      : Secure Random 6-Digit OTP`);
      }
      console.log(`==============================================================\n`);

      // Trigger actual email dispatch through nodemailer to recipient inbox
      // If developer demo email, route to the real configured email akash.kornipati1969@gmail.com
      const targetDispatchEmail = isDev ? (process.env.SMTP_USER || 'akash.kornipati1969@gmail.com') : cleanEmail;
      emailService.sendOtpEmail(targetDispatchEmail, otpCode, cleanPurpose, expiresInMinutes).catch((err) => {
        console.error('[OtpService] Background email dispatch error:', err.message);
      });

      return {
        id: result.lastInsertRowid || result.insertId,
        email: cleanEmail,
        purpose: cleanPurpose,
        otp: otpCode,
        debugOtp: otpCode,
        emailConfigured: emailService.isConfigured(),
        expiresAt,
        expiresInMinutes,
      };
    } catch (err) {
      console.error('[OtpService] Failed to generate OTP:', err);
      throw err;
    }
  }

  /**
   * Verify provided OTP code against stored records.
   * - developer@supermarket.com: 196969 is accepted.
   * - ANY OTHER email: 196969 is REJECTED. Only the actual stored OTP is accepted.
   * @param {string} email
   * @param {string} otpCode
   * @param {string} purpose
   * @param {boolean} markVerified
   */
  async verifyOtp(email, otpCode, purpose, markVerified = true) {
    if (!email || !email.trim()) {
      return { valid: false, error: 'Email is required for OTP verification.' };
    }
    if (!otpCode || !otpCode.trim()) {
      return { valid: false, error: 'Please enter the 6-digit OTP code.' };
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = otpCode.trim();
    const cleanPurpose = (purpose || 'login').toLowerCase().trim();
    const isDev = cleanEmail === DEV_EMAIL;

    try {
      const record = await db.get(
        `SELECT * FROM otps 
         WHERE LOWER(email) = LOWER(?) AND purpose = ? AND verified_at IS NULL 
         ORDER BY id DESC LIMIT 1`,
        [cleanEmail, cleanPurpose]
      );

      // Default OTP (196969) is strictly restricted to developer@supermarket.com ONLY!
      if (isDev && cleanCode === DEFAULT_OTP) {
        if (record && markVerified) {
          await db.run('UPDATE otps SET verified_at = CURRENT_TIMESTAMP WHERE id = ?', [record.id]);
        }
        let parsedMeta = null;
        if (record?.metadata) {
          try {
            parsedMeta = JSON.parse(record.metadata);
          } catch {}
        }
        return { valid: true, metadata: parsedMeta };
      }

      // Non-developer accounts must have an active OTP record
      if (!record) {
        return {
          valid: false,
          error: 'No active OTP found for this email. Please request a new code.',
        };
      }

      // Check brute-force attempts
      if (record.attempts >= 5) {
        return {
          valid: false,
          error: 'Too many incorrect attempts. Please request a new OTP code.',
        };
      }

      // Check expiration
      const now = Date.now();
      const expiresAt = new Date(record.expires_at).getTime();
      if (now > expiresAt) {
        return {
          valid: false,
          error: 'OTP code has expired. Please request a new code.',
        };
      }

      // Check code matching - 196969 is NOT accepted for non-developer emails
      if (record.otp_code !== cleanCode) {
        await db.run('UPDATE otps SET attempts = attempts + 1 WHERE id = ?', [record.id]);
        const remaining = 5 - (record.attempts + 1);
        return {
          valid: false,
          error: `Incorrect OTP code. ${remaining > 0 ? `${remaining} attempts remaining.` : 'Code locked.'}`,
        };
      }

      // Mark verified if required
      if (markVerified) {
        await db.run('UPDATE otps SET verified_at = CURRENT_TIMESTAMP WHERE id = ?', [record.id]);
      }

      let parsedMeta = null;
      if (record.metadata) {
        try {
          parsedMeta = JSON.parse(record.metadata);
        } catch {}
      }

      return {
        valid: true,
        record: {
          ...record,
          metadata: parsedMeta,
        },
      };
    } catch (err) {
      console.error('[OtpService] Verification error:', err);
      return { valid: false, error: err.message || 'OTP verification failed.' };
    }
  }
}

module.exports = new OtpService();
