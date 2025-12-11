// repositories/contractRepository.js
const db = require("../db");

// =============== Prepared Statements ===============

// 단건 조회
const getContractStmt = db.prepare(`
  SELECT *
  FROM contracts
  WHERE id = ?
`);

// INSERT
const insertContractStmt = db.prepare(`
  INSERT INTO contracts (
    estimate_id,
    contract_no,
    title,
    client_name,
    total_amount,
    start_date,
    end_date,
    pdf_filename,
    body_text
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// UPDATE
const updateContractStmt = db.prepare(`
  UPDATE contracts
  SET
    estimate_id = ?,
    contract_no = ?,
    title = ?,
    client_name = ?,
    total_amount = ?,
    start_date = ?,
    end_date = ?,
    pdf_filename = ?,
    body_text = ?
  WHERE id = ?
`);

// DELETE
const deleteContractStmt = db.prepare(`
  DELETE FROM contracts
  WHERE id = ?
`);

// 목록/검색용
const countByKeywordStmt = db.prepare(`
  SELECT COUNT(*) AS cnt
  FROM contracts
  WHERE title LIKE ?
     OR client_name LIKE ?
`);

const listByKeywordStmt = db.prepare(`
  SELECT *
  FROM contracts
  WHERE title LIKE ?
     OR client_name LIKE ?
  ORDER BY id DESC
  LIMIT ?
  OFFSET ?
`);

// =============== Repository 함수 ===============

function findById(id) {
  return getContractStmt.get(id);
}

function countByKeyword(keywordLike) {
  const row = countByKeywordStmt.get(keywordLike, keywordLike);
  return row ? row.cnt : 0;
}

function findPagedByKeyword(keywordLike, limit, offset) {
  return listByKeywordStmt.all(keywordLike, keywordLike, limit, offset);
}

// 신규 생성 트랜잭션
const createContractTx = db.transaction((data) => {
  const info = insertContractStmt.run(
    data.estimate_id || null,
    data.contract_no || null,
    data.title,
    data.client_name || null,
    data.total_amount || null,
    data.start_date || null,
    data.end_date || null,
    data.pdf_filename || null,
    data.body_text || null
  );
  return info.lastInsertRowid;
});

// 수정 트랜잭션
const updateContractTx = db.transaction((id, data) => {
  updateContractStmt.run(
    data.estimate_id || null,
    data.contract_no || null,
    data.title,
    data.client_name || null,
    data.total_amount || null,
    data.start_date || null,
    data.end_date || null,
    data.pdf_filename || null,
    data.body_text || null,
    id
  );
});

// 삭제 트랜잭션
const deleteContractTx = db.transaction((id) => {
  deleteContractStmt.run(id);
});

module.exports = {
  findById,
  countByKeyword,
  findPagedByKeyword,
  createContractTx,
  updateContractTx,
  deleteContractTx,
};
