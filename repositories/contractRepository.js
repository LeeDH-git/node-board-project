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

/* =========================
   자동 계약번호 생성
   ctr-YYYY-NNN
   ========================= */

const getLastContractNoStmt = db.prepare(`
  SELECT contract_no
  FROM contracts
  WHERE contract_no LIKE ?
  ORDER BY contract_no DESC
  LIMIT 1
`);

function getNextContractNo(year) {
  const like = `ctr-${year}-%`;
  const row = getLastContractNoStmt.get(like);

  let nextSeq = 1;
  if (row && row.contract_no) {
    const m = String(row.contract_no).match(/ctr-\d{4}-(\d{3})$/);
    if (m) nextSeq = parseInt(m[1], 10) + 1;
  }

  return `ctr-${year}-${String(nextSeq).padStart(3, "0")}`;
}

/**
 * 기성관리 / select box용 계약 목록
 */
const listForSelectStmt = db.prepare(`
  SELECT id, contract_no, title, total_amount
  FROM contracts
  ORDER BY id DESC
`);

function findAllForSelect() {
  return listForSelectStmt.all();
}

module.exports = {
  countByKeyword,
  findPagedByKeyword,
  findById,
  createContractTx,
  updateContractTx,
  deleteContractTx,

  // ✅ 추가 export
  getNextContractNo,
  findAllForSelect,
};
