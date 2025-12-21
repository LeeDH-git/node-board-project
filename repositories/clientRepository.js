const db = require("../db"); // 프로젝트 db.js (better-sqlite3)

/**
 * ✅ [수정] 업로드(사업자등록증) 컬럼 추가 대응 + "업로드 없을 때 기존 첨부가 NULL로 덮이는 문제" 방지
 * - updateBase(): 텍스트 필드만 업데이트 (첨부 컬럼은 건드리지 않음)
 * - updateBizCert(): 업로드가 있을 때만 첨부 컬럼 업데이트
 */

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
    INSERT INTO clients (
      name, biz_no, ceo_name, phone, email, address, memo,
      biz_cert_name, biz_cert_path
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const info = stmt.run(
    data.name,
    data.biz_no || null,
    data.ceo_name || null,
    data.phone || null,
    data.email || null,
    data.address || null,
    data.memo || null,
    data.biz_cert_name || null,
    data.biz_cert_path || null
  );

  return info.lastInsertRowid;
}

/** ✅ [신규] 텍스트 필드만 업데이트 (첨부는 유지) */
function updateBase(id, data) {
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

/** ✅ [신규] 첨부(사업자등록증)만 업데이트 (업로드 있을 때만 호출) */
function updateBizCert(id, { biz_cert_name, biz_cert_path }) {
  db.prepare(
    `
    UPDATE clients
    SET biz_cert_name = ?, biz_cert_path = ?
    WHERE id = ?
  `
  ).run(biz_cert_name || null, biz_cert_path || null, id);
}

/** (선택) 첨부 삭제가 필요하면 사용 */
function clearBizCert(id) {
  db.prepare(
    `
    UPDATE clients
    SET biz_cert_name = NULL, biz_cert_path = NULL
    WHERE id = ?
  `
  ).run(id);
}

function remove(id) {
  db.prepare(`DELETE FROM clients WHERE id = ?`).run(id);
}

// 일괄 거래처 등록
function bulkInsert(list) {
  const insert = db.prepare(`
    INSERT INTO clients (
      name, biz_no, ceo_name, phone, email, address, memo,
      biz_cert_name, biz_cert_path
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        r.memo || null,
        r.biz_cert_name || null,
        r.biz_cert_path || null
      );
    }
  });

  tx(list);
  return { inserted: list.length };
}

module.exports = {
  list,
  findById,
  create,
  updateBase, // ✅ [추가]
  updateBizCert, // ✅ [추가]
  clearBizCert, // (선택)
  remove,
  bulkInsert,
};
