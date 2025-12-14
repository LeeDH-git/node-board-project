// repositories/estimateRepository.js
const db = require("../db");

// ==================== Prepared Statements ====================

const insertEstimateStmt = db.prepare(`
  INSERT INTO estimates (estimate_no, title, client_name, total_amount)
  VALUES (?, ?, ?, ?)
`);

const insertEstimateItemStmt = db.prepare(`
  INSERT INTO estimate_items (
    estimate_id, row_no, item_name, spec, unit, qty,
    material_unit, material_amount,
    labor_unit, labor_amount,
    expense_unit, expense_amount,
    total_unit, total_amount,
    note
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const getEstimateStmt = db.prepare(`
  SELECT * FROM estimates WHERE id = ?
`);

const getEstimateItemsStmt = db.prepare(`
  SELECT *
  FROM estimate_items
  WHERE estimate_id = ?
  ORDER BY row_no ASC
`);

const updateEstimateStmt = db.prepare(`
  UPDATE estimates
  SET title = ?, client_name = ?, total_amount = ?
  WHERE id = ?
`);

const deleteItemsStmt = db.prepare(`
  DELETE FROM estimate_items WHERE estimate_id = ?
`);

const deleteEstimateStmt = db.prepare(`
  DELETE FROM estimates WHERE id = ?
`);

const countByTitleStmt = db.prepare(`
  SELECT COUNT(*) AS cnt
  FROM estimates
  WHERE title LIKE ?
`);

const listByTitleStmt = db.prepare(`
  SELECT *
  FROM estimates
  WHERE title LIKE ?
  ORDER BY id DESC
  LIMIT ?
  OFFSET ?
`);

const getLastEstimateNoStmt = db.prepare(`
  SELECT estimate_no
  FROM estimates
  WHERE estimate_no LIKE ?
  ORDER BY estimate_no DESC
  LIMIT 1
`);

// ==================== Repository 함수 ====================

// 단건 조회
function findById(id) {
  return getEstimateStmt.get(id);
}

function findItemsByEstimateId(id) {
  return getEstimateItemsStmt.all(id);
}

// 목록 + 카운트
function countByTitle(keywordLike) {
  return countByTitleStmt.get(keywordLike).cnt;
}

function findByTitlePaged(keywordLike, limit, offset) {
  return listByTitleStmt.all(keywordLike, limit, offset);
}

// 트랜잭션 포함 CUD
const createEstimateTx = db.transaction((header, items) => {
  const year = new Date().getFullYear();
  const estimateNo = header.estimate_no || getNextEstimateNo(year);

  const info = insertEstimateStmt.run(
    estimateNo,
    header.title,
    header.client_name,
    header.total_amount
  );
  const estimateId = info.lastInsertRowid;

  items.forEach((item, idx) => {
    insertEstimateItemStmt.run(
      estimateId,
      idx + 1,
      item.item_name || null,
      item.spec || null,
      item.unit || null,
      item.qty || 0,
      item.material_unit || 0,
      item.material_amount || 0,
      item.labor_unit || 0,
      item.labor_amount || 0,
      item.expense_unit || 0,
      item.expense_amount || 0,
      item.total_unit || 0,
      item.total_amount || 0,
      item.note || null
    );
  });

  return estimateId;
});

const updateEstimateTx = db.transaction((id, header, items) => {
  updateEstimateStmt.run(
    header.title,
    header.client_name,
    header.total_amount,
    id
  );

  deleteItemsStmt.run(id);

  items.forEach((item, idx) => {
    insertEstimateItemStmt.run(
      id,
      idx + 1,
      item.item_name || null,
      item.spec || null,
      item.unit || null,
      item.qty || 0,
      item.material_unit || 0,
      item.material_amount || 0,
      item.labor_unit || 0,
      item.labor_amount || 0,
      item.expense_unit || 0,
      item.expense_amount || 0,
      item.total_unit || 0,
      item.total_amount || 0,
      item.note || null
    );
  });
});

const copyEstimateTx = db.transaction((sourceId) => {
  const src = getEstimateStmt.get(sourceId);
  if (!src) throw new Error("원본 견적이 존재하지 않습니다.");

  const items = getEstimateItemsStmt.all(sourceId);

  const year = new Date().getFullYear();
  const estimateNo = getNextEstimateNo(year);

  const info = insertEstimateStmt.run(
    estimateNo,
    src.title + " (복사)",
    src.client_name,
    src.total_amount
  );
  const newId = info.lastInsertRowid;

  items.forEach((item) => {
    insertEstimateItemStmt.run(
      newId,
      item.row_no,
      item.item_name,
      item.spec,
      item.unit,
      item.qty,
      item.material_unit,
      item.material_amount,
      item.labor_unit,
      item.labor_amount,
      item.expense_unit,
      item.expense_amount,
      item.total_unit,
      item.total_amount,
      item.note
    );
  });

  return newId;
});

const deleteEstimateTx = db.transaction((id) => {
  deleteItemsStmt.run(id);
  deleteEstimateStmt.run(id);
});

function getNextEstimateNo(year) {
  const like = `est-${year}-%`;
  const row = getLastEstimateNoStmt.get(like);

  let nextSeq = 1;
  if (row && row.estimate_no) {
    const m = String(row.estimate_no).match(/est-\d{4}-(\d{3})$/);
    if (m) nextSeq = parseInt(m[1], 10) + 1;
  }

  return `est-${year}-${String(nextSeq).padStart(3, "0")}`;
}


module.exports = {
  findById,
  findItemsByEstimateId,
  countByTitle,
  findByTitlePaged,
  getNextEstimateNo,
  createEstimateTx,
  updateEstimateTx,
  copyEstimateTx,
  deleteEstimateTx,
};

