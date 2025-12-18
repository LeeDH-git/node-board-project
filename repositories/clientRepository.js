const db = require("../db"); // 당신 프로젝트의 db.js 방식 그대로

function list({ q = "", page = 1, perPage = 16 }) {
  const kw = `%${q}%`;
  const offset = (page - 1) * perPage;

  const total = db
    .prepare(
      `
    SELECT COUNT(*) AS cnt
    FROM clients
    WHERE name LIKE ? OR biz_no LIKE ? OR phone LIKE ?
  `
    )
    .get(kw, kw, kw).cnt;

  const rows = db
    .prepare(
      `
    SELECT *
    FROM clients
    WHERE name LIKE ? OR biz_no LIKE ? OR phone LIKE ?
    ORDER BY id DESC
    LIMIT ? OFFSET ?
  `
    )
    .all(kw, kw, kw, perPage, offset);

  return { total, rows };
}

function findById(id) {
  return db.prepare(`SELECT * FROM clients WHERE id = ?`).get(id);
}

function create(data) {
  const stmt = db.prepare(`
    INSERT INTO clients (name, biz_no, ceo_name, phone, email, address, memo)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const info = stmt.run(
    data.name,
    data.biz_no || null,
    data.ceo_name || null,
    data.phone || null,
    data.email || null,
    data.address || null,
    data.memo || null
  );

  return info.lastInsertRowid;
}

function update(id, data) {
  db.prepare(
    `
    UPDATE clients
    SET name = ?, biz_no = ?, ceo_name = ?, phone = ?, email = ?, address = ?, memo = ?
    WHERE id = ?
  `
  ).run(
    data.name,
    data.biz_no || null,
    data.ceo_name || null,
    data.phone || null,
    data.email || null,
    data.address || null,
    data.memo || null,
    id
  );
}

function remove(id) {
  db.prepare(`DELETE FROM clients WHERE id = ?`).run(id);
}

// 일괄 거래처 등록
function bulkInsert(list) {
  const insert = db.prepare(`
    INSERT INTO clients (name, biz_no, ceo_name, phone, email, address, memo)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const tx = db.transaction((rows) => {
    for (const r of rows) {
      insert.run(
        r.name,
        r.biz_no || null,
        r.ceo_name || null,
        r.phone || null,
        r.email || null,
        r.address || null,
        r.memo || null
      );
    }
  });

  tx(list);
  return { inserted: list.length };
}

module.exports = { list, findById, create, update, remove, bulkInsert };
