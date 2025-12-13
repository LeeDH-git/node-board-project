// repositories/contractRepository.js
const db = require("../db");

/**
 * 검색 카운트
 * contractService에서 keywordLike(예: %키워드%)를 그대로 넘겨줍니다.
 */
function countByKeyword(keywordLike) {
  const row = db.prepare(`
    SELECT COUNT(*) AS cnt
    FROM contracts
    WHERE title LIKE ?
       OR contract_no LIKE ?
       OR client_name LIKE ?
  `).get(keywordLike, keywordLike, keywordLike);

  return row ? row.cnt : 0;
}

/**
 * 검색 + 페이징 목록
 * contractService에서 (keywordLike, perPage, offset) 순으로 호출합니다.
 */
function findPagedByKeyword(keywordLike, limit, offset) {
  return db.prepare(`
    SELECT
      id,
      estimate_id,
      contract_no,
      title,
      client_name,
      total_amount,
      start_date,
      end_date,
      pdf_filename,
      body_text,
      created_at
    FROM contracts
    WHERE title LIKE ?
       OR contract_no LIKE ?
       OR client_name LIKE ?
    ORDER BY id DESC
    LIMIT ? OFFSET ?
  `).all(keywordLike, keywordLike, keywordLike, limit, offset);
}

function findById(id) {
  return db.prepare(`
    SELECT *
    FROM contracts
    WHERE id = ?
  `).get(id);
}

/**
 * 생성(트랜잭션)
 * created_at은 DB DEFAULT가 있으면 자동 생성됩니다.
 */
function createContractTx(data) {
  const tx = db.transaction((d) => {
    const result = db.prepare(`
      INSERT INTO contracts
        (estimate_id, contract_no, title, client_name, total_amount, start_date, end_date, pdf_filename, body_text)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      d.estimate_id ?? null,
      d.contract_no ?? null,
      d.title,
      d.client_name ?? null,
      d.total_amount ?? null,
      d.start_date ?? null,
      d.end_date ?? null,
      d.pdf_filename ?? null,
      d.body_text ?? null
    );

    return result.lastInsertRowid;
  });

  return tx(data);
}

/**
 * 수정(트랜잭션)
 */
function updateContractTx(id, data) {
  const tx = db.transaction((contractId, d) => {
    db.prepare(`
      UPDATE contracts
      SET
        estimate_id   = ?,
        contract_no   = ?,
        title         = ?,
        client_name   = ?,
        total_amount  = ?,
        start_date    = ?,
        end_date      = ?,
        pdf_filename  = ?,
        body_text     = ?
      WHERE id = ?
    `).run(
      d.estimate_id ?? null,
      d.contract_no ?? null,
      d.title,
      d.client_name ?? null,
      d.total_amount ?? null,
      d.start_date ?? null,
      d.end_date ?? null,
      d.pdf_filename ?? null,
      d.body_text ?? null,
      contractId
    );
  });

  tx(id, data);
}

/**
 * 삭제(트랜잭션)
 */
function deleteContractTx(id) {
  const tx = db.transaction((contractId) => {
    db.prepare(`DELETE FROM contracts WHERE id = ?`).run(contractId);
  });

  tx(id);
}

module.exports = {
  countByKeyword,
  findPagedByKeyword,
  findById,
  createContractTx,
  updateContractTx,
  deleteContractTx,
};
