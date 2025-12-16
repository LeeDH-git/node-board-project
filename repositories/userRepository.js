const db = require("../db");

async function findByUsername(username) {
  return db.get("SELECT * FROM users WHERE username = ?", [username]);
}

module.exports = { findByUsername };
