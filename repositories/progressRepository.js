// repositories/progressRepository.js
const db = require("../db");

// ===== Prepared Statements =====
const insertProgressStmt = db.prepare(`
  INSERT INTO progress (
    progress_no,
    contract_id,
    progress_round,
    progress_month,
    progress_rate,
    progress_amount,
    note
  )
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const updateProgressStmt = db.prepare(`
  UPDATE progress
  SET contract_id = ?,
      progress_round = ?,
      progress_month = ?,
      progress_rate = ?,
      progress_amount = ?,
      note = ?
  WHERE id = ?
`);

const updateProgressRateStmt = db.prepare(`
  UPDATE progress
  SET progress_rate = ?
  WHERE id = ?
`);

const deleteProgressStmt = db.prepare(`
  DELETE FROM progress WHERE id = ?
`);

const getProgressStmt = db.prepare(`
  SELECT p.*,
         c.contract_no AS contract_no,
         c.title AS contract_title,
         c.client_name AS contract_client_name,
         c.total_amount AS contract_total_amount
  FROM progress p
  JOIN contracts c ON c.id = p.contract_id
  WHERE p.id = ?
`);

const listProgressStmt = db.prepare(`
  SELECT p.*,
         c.contract_no AS contract_no,
         c.title AS contract_title,
         c.client_name AS contract_client_name,
         c.total_amount AS contract_total_amount
  FROM progress p
  JOIN contracts c ON c.id = p.contract_id
  WHERE (c.title LIKE ? OR c.contract_no LIKE ?)
  ORDER BY p.id DESC
  LIMIT ?
  OFFSET ?
`);

const countProgressStmt = db.prepare(`
  SELECT COUNT(*) AS cnt
  FROM progress p
  JOIN contracts c ON c.id = p.contract_id
  WHERE (c.title LIKE ? OR c.contract_no LIKE ?)
`);

const sumByContractStmt = db.prepare(`
  SELECT COALESCE(SUM(progress_amount), 0) AS sum_amount
  FROM progress
  WHERE contract_id = ?
`);

const sumByContractExceptIdStmt = db.prepare(`
  SELECT COALESCE(SUM(progress_amount), 0) AS sum_amount
  FROM progress
  WHERE contract_id = ?
    AND id != ?
`);

const getLastProgressNoStmt = db.prepare(`
  SELECT progress_no
  FROM progress
  WHERE progress_no LIKE ?
  ORDER BY progress_no DESC
  LIMIT 1
`);

const existsByContractMonthStmt = db.prepare(`
  SELECT 1
  FROM progress
  WHERE contract_id = ? AND progress_month = ?
  LIMIT 1
`);

const existsByContractMonthExceptIdStmt = db.prepare(`
  SELECT 1
  FROM progress
  WHERE contract_id = ? AND progress_month = ? AND id != ?
  LIMIT 1
`);

/** 계약별 기성 이력 (표시용: 최신부터) */
const listByContractIdDescStmt = db.prepare(`
  SELECT *
  FROM progress
  WHERE contract_id = ?
  ORDER BY progress_month DESC, id DESC
`);

/** 계약별 기성 이력 (재계산용: 오래된 것부터) */
const listByContractIdAscStmt = db.prepare(`
  SELECT *
  FROM progress
  WHERE contract_id = ?
  ORDER BY progress_month ASC, id ASC
`);

// ===== Functions =====
function findById(id) {
  return getProgressStmt.get(id);
}

function countByKeyword(keywordLike) {
  return countProgressStmt.get(keywordLike, keywordLike).cnt;
}

function findPaged(keywordLike, limit, offset) {
  return listProgressStmt.all(keywordLike, keywordLike, limit, offset);
}

function sumByContractId(contractId) {
  return sumByContractStmt.get(contractId).sum_amount;
}

function sumByContractIdExceptId(contractId, id) {
  return sumByContractExceptIdStmt.get(contractId, id).sum_amount;
}

function findByContractId(contractId) {
  return listByContractIdDescStmt.all(contractId);
}

function findByContractIdAsc(contractId) {
  return listByContractIdAscStmt.all(contractId);
}

function getNextProgressNo(year) {
  const like = `prg-${year}-%`;
  const row = getLastProgressNoStmt.get(like);

  let nextSeq = 1;
  if (row && row.progress_no) {
    const m = String(row.progress_no).match(/prg-\d{4}-(\d{3})$/);
    if (m) nextSeq = parseInt(m[1], 10) + 1;
  }
  return `prg-${year}-${String(nextSeq).padStart(3, "0")}`;
}

const createProgressTx = db.transaction((data) => {
  const year = new Date().getFullYear();
  const progressNo = data.progress_no || getNextProgressNo(year);

  const info = insertProgressStmt.run(
    progressNo,
    data.contract_id,
    data.progress_round ?? null,
    data.progress_month,
    data.progress_rate ?? null,
    data.progress_amount ?? 0,
    data.note || null
  );

  return info.lastInsertRowid;
});

const updateProgressTx = db.transaction((id, data) => {
  updateProgressStmt.run(
    data.contract_id,
    data.progress_round ?? null,
    data.progress_month,
    data.progress_rate ?? null,
    data.progress_amount ?? 0,
    data.note || null,
    id
  );
});

const updateProgressRateTx = db.transaction((id, rate) => {
  updateProgressRateStmt.run(rate ?? null, id);
});

const deleteProgressTx = db.transaction((id) => {
  deleteProgressStmt.run(id);
});

function existsByContractMonth(contractId, month) {
  return !!existsByContractMonthStmt.get(contractId, month);
}

function existsByContractMonthExceptId(contractId, month, id) {
  return !!existsByContractMonthExceptIdStmt.get(contractId, month, id);
}

module.exports = {
  findById,
  countByKeyword,
  findPaged,
  sumByContractId,
  sumByContractIdExceptId,
  findByContractId,
  findByContractIdAsc,
  getNextProgressNo,
  existsByContractMonth,
  existsByContractMonthExceptId,
  createProgressTx,
  updateProgressTx,
  updateProgressRateTx,
  deleteProgressTx,
};
