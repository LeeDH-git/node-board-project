// services/libraryService.js
const path = require("path");
const fs = require("fs");
const db = require("../db"); // 당신 프로젝트의 db 연결 모듈 경로에 맞추세요

function ensureTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS library_docs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT DEFAULT '',
      doc_type TEXT DEFAULT 'form', -- form | reference | safety | contract | etc
      filename TEXT DEFAULT '',
      original_name TEXT DEFAULT '',
      mime_type TEXT DEFAULT '',
      size INTEGER DEFAULT 0,
      memo TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
  `);
}

ensureTable();

function list(q, type, page, perPage) {
  const offset = (page - 1) * perPage;
  const keyword = `%${q}%`;

  const where = [];
  const params = [];

  if (q) {
    where.push("(title LIKE ? OR category LIKE ? OR memo LIKE ? OR original_name LIKE ?)");
    params.push(keyword, keyword, keyword, keyword);
  }
  if (type && type !== "all") {
    where.push("doc_type = ?");
    params.push(type);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const totalRow = db.prepare(`SELECT COUNT(*) as cnt FROM library_docs ${whereSql}`).get(...params);
  const totalCount = totalRow.cnt;
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));

  const rows = db.prepare(`
    SELECT
      id,
      title,
      category,
      doc_type,
      original_name,
      filename,
      size,
      created_at
    FROM library_docs
    ${whereSql}
    ORDER BY id DESC
    LIMIT ? OFFSET ?
  `).all(...params, perPage, offset);

  rows.forEach((r, idx) => (r.row_no = totalCount - (offset + idx)));

  return { docs: rows, currentPage: page, totalPages, totalCount };
}

function create(body, file) {
  const title = (body.title || "").trim();
  if (!title) throw new Error("제목은 필수입니다.");

  const docType = body.doc_type || "form";
  const category = (body.category || "").trim();
  const memo = (body.memo || "").trim();

  const filename = file ? file.filename : "";
  const originalName = file ? file.originalname : "";
  const mimeType = file ? file.mimetype : "";
  const size = file ? file.size : 0;

  db.prepare(`
    INSERT INTO library_docs (title, category, doc_type, filename, original_name, mime_type, size, memo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, category, docType, filename, originalName, mimeType, size, memo);
}

function get(id) {
  return db.prepare(`SELECT * FROM library_docs WHERE id = ?`).get(id);
}

function update(id, body, file) {
  const doc = get(id);
  if (!doc) throw new Error("존재하지 않는 자료입니다.");

  const title = (body.title || "").trim();
  if (!title) throw new Error("제목은 필수입니다.");

  const docType = body.doc_type || doc.doc_type;
  const category = (body.category || "").trim();
  const memo = (body.memo || "").trim();

  let filename = doc.filename;
  let originalName = doc.original_name;
  let mimeType = doc.mime_type;
  let size = doc.size;

  // 새 파일 업로드 시 기존 파일 삭제 후 교체
  if (file) {
    if (doc.filename) {
      const oldPath = path.join(__dirname, "..", "uploads", "library", doc.filename);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    filename = file.filename;
    originalName = file.originalname;
    mimeType = file.mimetype;
    size = file.size;
  }

  db.prepare(`
    UPDATE library_docs
    SET title = ?, category = ?, doc_type = ?, filename = ?, original_name = ?, mime_type = ?, size = ?, memo = ?
    WHERE id = ?
  `).run(title, category, docType, filename, originalName, mimeType, size, memo, id);
}

function remove(id) {
  const doc = get(id);
  if (!doc) throw new Error("존재하지 않는 자료입니다.");

  if (doc.filename) {
    const p = path.join(__dirname, "..", "uploads", "library", doc.filename);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }

  db.prepare(`DELETE FROM library_docs WHERE id = ?`).run(id);
}

module.exports = { list, create, get, update, remove };
