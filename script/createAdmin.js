const bcrypt = require("bcrypt");
const db = require("../db");

(async () => {
  const username = process.argv[2];
  const password = process.argv[3];
  if (!username || !password) {
    console.log("Usage: node scripts/createAdmin.js <username> <password>");
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 10);
  await db.run(
    "INSERT INTO users(username, password_hash, role) VALUES(?,?, 'admin')",
    [username, hash]
  );
  console.log("Admin created:", username);
  process.exit(0);
})();
