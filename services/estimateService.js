// services/estimateService.js

const estimateRepo = require("../repositories/estimateRepository");
const path = require("path");
const fs = require("fs");
const { normalizeOriginalName } = require("../middlewares/utils/fileName"); // 경로는 프로젝트에 맞게 유지

// ===== 공통 유틸 =====
function toInt(value) {
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? 0 : n;
}
function toFloat(value) {
  const n = parseFloat(value);
  return Number.isNaN(n) ? 0 : n;
}

function normalizeItems(items) {
  if (!items) return [];
  if (Array.isArray(items)) return items;
  return Object.values(items);
}

function calculateTotalAmount(items) {
  return items.reduce((sum, item) => {
    return sum + toInt(item.total_amount);
  }, 0);
}

function fillItemsForEditView(items, rowCount) {
  const filled = [];
  for (let i = 0; i < rowCount; i++) {
    filled.push(
      items[i] || {
        item_name: "",
        spec: "",
        unit: "",
        qty: "",
        material_unit: "",
        material_amount: "",
        labor_unit: "",
        labor_amount: "",
        expense_unit: "",
        expense_amount: "",
        total_unit: "",
        total_amount: "",
        note: "",
      }
    );
  }
  return filled;
}

// ===== Service 함수 =====

// 목록 + 페이징
async function listEstimates(searchQuery, page, perPage) {
  const keyword = `%${(searchQuery || "").trim()}%`;

  const totalCount = estimateRepo.countByTitle(keyword);
  const totalPages = totalCount > 0 ? Math.ceil(totalCount / perPage) : 1;

  let currentPage = parseInt(page || "1", 10);
  if (Number.isNaN(currentPage) || currentPage < 1) currentPage = 1;
  if (currentPage > totalPages) currentPage = totalPages;

  const offset = (currentPage - 1) * perPage;

  const rows = estimateRepo.findByTitlePaged(keyword, perPage, offset);

  const startNumber = totalCount - offset;
  const estimates = rows.map((e, idx) => ({
    ...e,
    row_no: startNumber - idx,
  }));

  return {
    estimates,
    totalCount,
    totalPages,
    currentPage,
    perPage,
    searchQuery: searchQuery || "",
  };
}

// 신규 저장
function createEstimateFromRequest(body, files = []) {
  const { title, client_name } = body;
  const itemsRaw = normalizeItems(body.items);

  if (!title) {
    throw new Error("견적명은 필수입니다.");
  }

  const items = itemsRaw.map((i) => ({
    ...i,
    qty: toFloat(i.qty),
    material_unit: toInt(i.material_unit),
    material_amount: toInt(i.material_amount),
    labor_unit: toInt(i.labor_unit),
    labor_amount: toInt(i.labor_amount),
    expense_unit: toInt(i.expense_unit),
    expense_amount: toInt(i.expense_amount),
    total_unit: toInt(i.total_unit),
    total_amount: toInt(i.total_amount),
  }));

  const totalAmount = calculateTotalAmount(items);

  const filteredItems = items.filter((item) => {
    return (
      item.item_name || item.spec || item.unit || item.qty || item.total_amount
    );
  });

  const year = new Date().getFullYear();
  const estimate_no = estimateRepo.getNextEstimateNo(year);

  const id = estimateRepo.createEstimateTx(
    {
      estimate_no,
      title,
      client_name: client_name || null,
      total_amount: totalAmount,
    },
    filteredItems
  );

  // ✅ 첨부 파일 저장(신규에서도 첨부 가능)
  if (Array.isArray(files) && files.length > 0) {
    for (const file of files) {
      estimateRepo.insertEstimateFile(id, {
        original_name: normalizeOriginalName(file.originalname), // 한글 파일명 깨짐 방지
        stored_name: file.filename,
        stored_path: `/uploads/estimate_files/${file.filename}`,
        size_bytes: file.size,
      });
    }
  }

  return id;
}

// 수정 저장
function updateEstimateFromRequest(id, body) {
  const estimate = estimateRepo.findById(id);
  if (!estimate) throw new Error("존재하지 않는 견적입니다.");

  const { title, client_name } = body;
  const itemsRaw = normalizeItems(body.items);

  if (!title) throw new Error("견적명은 필수입니다.");

  const items = itemsRaw.map((i) => ({
    ...i,
    qty: toFloat(i.qty),
    material_unit: toInt(i.material_unit),
    material_amount: toInt(i.material_amount),
    labor_unit: toInt(i.labor_unit),
    labor_amount: toInt(i.labor_amount),
    expense_unit: toInt(i.expense_unit),
    expense_amount: toInt(i.expense_amount),
    total_unit: toInt(i.total_unit),
    total_amount: toInt(i.total_amount),
  }));

  const totalAmount = calculateTotalAmount(items);

  const filteredItems = items.filter((item) => {
    return (
      item.item_name || item.spec || item.unit || item.qty || item.total_amount
    );
  });

  estimateRepo.updateEstimateTx(
    id,
    {
      title,
      client_name: client_name || null,
      total_amount: totalAmount,
    },
    filteredItems
  );
}

// 상세 + 수정폼용 조회
function getEstimateDetail(id, options = {}) {
  const estimate = estimateRepo.findById(id);
  if (!estimate) return null;

  const items = estimateRepo.findItemsByEstimateId(id);
  const files = estimateRepo.listFilesByEstimateId(id);

  if (options.fillRowCount) {
    return {
      estimate,
      items: fillItemsForEditView(items, options.fillRowCount),
      files,
    };
  }
  return { estimate, items, files };
}

// 복사 / 삭제
function copyEstimate(id) {
  return estimateRepo.copyEstimateTx(id);
}
function deleteEstimate(id) {
  return estimateRepo.deleteEstimateTx(id);
}

function addEstimateFileFromRequest(estimateId, file) {
  const estimate = estimateRepo.findById(estimateId);
  if (!estimate) throw new Error("존재하지 않는 견적입니다.");
  if (!file) throw new Error("업로드 파일이 없습니다.");

  // stored_path는 웹 접근 경로로 저장
  const storedPath = `/uploads/estimate_files/${file.filename}`;

  const rowId = estimateRepo.insertEstimateFile(estimateId, {
    original_name: normalizeOriginalName(file.originalname), // ✅ 한글 깨짐 방지
    stored_name: file.filename,
    stored_path: storedPath,
    size_bytes: file.size,
  });

  return rowId;
}

function getEstimateFile(fileId) {
  const f = estimateRepo.findEstimateFileById(fileId);
  if (!f) return null;
  return f;
}

// 첨부 업로드/조회/삭제 함수
function deleteEstimateFile(fileId) {
  const f = estimateRepo.findEstimateFileById(fileId);
  if (!f) throw new Error("첨부파일이 존재하지 않습니다.");

  // 물리 파일 삭제(실패해도 DB는 삭제 진행 가능하게 처리)
  if (f.stored_path) {
    const abs = path.join(process.cwd(), f.stored_path.replace(/^\//, ""));
    fs.unlink(abs, () => {});
  }

  estimateRepo.deleteEstimateFileById(fileId);
  return f.estimate_id; // 라우트에서 상세로 리다이렉트 용
}

module.exports = {
  listEstimates,
  createEstimateFromRequest,
  updateEstimateFromRequest,
  getEstimateDetail,
  copyEstimate,
  deleteEstimate,
  addEstimateFileFromRequest,
  getEstimateFile,
  deleteEstimateFile,
};
