// // repositories/userRepository.js
// const db = require("../db");

// function findByUsername(username) {
//   return db
//     .prepare(`SELECT * FROM users WHERE username = ? LIMIT 1`)
//     .get(username);
// }

// function createAdmin({ staff_id = null, username, password_hash }) {
//   const stmt = db.prepare(`
//     INSERT INTO users (staff_id, username, password_hash, role, is_active)
//     VALUES (?, ?, ?, 'admin', 1)
//   `);
//   const info = stmt.run(staff_id, username, password_hash);
//   return info.lastInsertRowid;
// }

// module.exports = {
//   findByUsername,
//   createAdmin,
// };
