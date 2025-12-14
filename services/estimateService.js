// services/estimateService.js

const estimateRepo = require("../repositories/estimateRepository");

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

  const rows = estimateRepo.findByTitlePaged(
    keyword,
    perPage,
    offset
  );

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
function createEstimateFromRequest(body) {
  const { title, client_name } = body;
  const itemsRaw = normalizeItems(body.items);

  if (!title) {
    throw new Error("견적명은 필수입니다.");
  }

  // 숫자형 캐스팅
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

  // 빈 행은 Repo 안쪽에서 그냥 다 넣어도 되지만,
  // 여기서 아예 제거하고 넘기고 싶다면 filter 추가
  const filteredItems = items.filter((item) => {
    return (
      item.item_name ||
      item.spec ||
      item.unit ||
      item.qty ||
      item.total_amount
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
      item.item_name ||
      item.spec ||
      item.unit ||
      item.qty ||
      item.total_amount
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

  if (options.fillRowCount) {
    return {
      estimate,
      items: fillItemsForEditView(items, options.fillRowCount),
    };
  }
  return { estimate, items };
}

// 복사 / 삭제
function copyEstimate(id) {
  return estimateRepo.copyEstimateTx(id);
}
function deleteEstimate(id) {
  return estimateRepo.deleteEstimateTx(id);
}

module.exports = {
  listEstimates,
  createEstimateFromRequest,
  updateEstimateFromRequest,
  getEstimateDetail,
  copyEstimate,
  deleteEstimate,
};
