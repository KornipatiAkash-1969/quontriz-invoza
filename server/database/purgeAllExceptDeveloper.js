const db = require('./postgresClient');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

async function purgeAllExceptDeveloper() {
  console.log('[Purge] 🧹 Purging all transactional data and non-developer accounts...');

  // 1. Transactional & temporary records
  try { await db.run('DELETE FROM invoice_items'); } catch (e) {}
  try { await db.run('DELETE FROM invoices'); } catch (e) {}
  try { await db.run('DELETE FROM store_requirements'); } catch (e) {}
  try { await db.run('DROP TABLE IF EXISTS otps CASCADE'); } catch (e) {}
  try { await db.run('DELETE FROM buyers'); } catch (e) {}
  try { await db.run('DELETE FROM ai_training_samples'); } catch (e) {}
  try { await db.run('DELETE FROM ai_learned_vendor_templates'); } catch (e) {}
  try { await db.run('DELETE FROM ai_training_runs'); } catch (e) {}
  try { await db.run('DELETE FROM ai_extraction_logs'); } catch (e) {}

  // 2. Remove all users except Developer, Akanksh, and Hemanth
  await db.run("DELETE FROM users WHERE LOWER(email) NOT IN ('developer@supermarket.com', 'developer@gmail.com', 'akanksh@supermarket.com', 'hemanth@supermarket.com')");

  // 3. Ensure primary Developer account exists with credentials
  const devHash = bcrypt.hashSync('developer123', 10);
  const dev = await db.get("SELECT id, email, role FROM users WHERE LOWER(email) = 'developer@supermarket.com'");
  if (!dev) {
    await db.run(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      ['Developer', 'developer@supermarket.com', devHash, 'owner']
    );
    console.log('[Purge] ✅ Seeded primary Developer account (developer@supermarket.com / owner).');
  } else {
    await db.run(
      'UPDATE users SET name = ?, email = ?, password_hash = ?, role = ? WHERE id = ?',
      ['Developer', 'developer@supermarket.com', devHash, 'owner', dev.id]
    );
    console.log('[Purge] ✅ Reset Developer credentials to default (developer@supermarket.com / developer123).');
  }

  // 3b. Ensure Akanksh and Hemanth owner accounts exist
  const ownerHash = bcrypt.hashSync('owner@123', 10);
  const owners = [
    { name: 'Akanksh', email: 'akanksh@supermarket.com' },
    { name: 'Hemanth', email: 'hemanth@supermarket.com' },
  ];
  for (const o of owners) {
    const existing = await db.get("SELECT id FROM users WHERE LOWER(email) = LOWER(?)", [o.email]);
    if (!existing) {
      await db.run(
        'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [o.name, o.email, ownerHash, 'owner']
      );
      console.log(`[Purge] ✅ Seeded Owner account: ${o.email}`);
    } else {
      await db.run(
        'UPDATE users SET name = ?, password_hash = ?, role = ? WHERE id = ?',
        [o.name, ownerHash, 'owner', existing.id]
      );
      console.log(`[Purge] ✅ Updated Owner account: ${o.email}`);
    }
  }

  // 4. Remove uploaded test invoice files in server/uploads/ (keep samples/ & subfolders)
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (fs.existsSync(uploadsDir)) {
    const files = fs.readdirSync(uploadsDir);
    let removedCount = 0;
    for (const f of files) {
      const fullPath = path.join(uploadsDir, f);
      try {
        if (fs.statSync(fullPath).isFile() && (f.startsWith('invoice_') || f.endsWith('.pdf') || f.endsWith('.png') || f.endsWith('.jpg'))) {
          fs.unlinkSync(fullPath);
          removedCount++;
        }
      } catch (err) {}
    }
    console.log(`[Purge] 🧹 Removed ${removedCount} test invoice file(s) from server/uploads.`);
  }

  const users = await db.query('SELECT id, name, email, role FROM users');
  console.log('[Purge] 👥 Active Users Remaining:', users);
  console.log('[Purge] 🎉 Completed successfully! Only Developer is kept.');
}

if (require.main === module) {
  purgeAllExceptDeveloper().then(() => process.exit(0)).catch((err) => {
    console.error('[Purge Error]', err);
    process.exit(1);
  });
}

module.exports = purgeAllExceptDeveloper;
