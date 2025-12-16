// services/progressService.js
const progressRepo = require("../repositories/progressRepository");
const contractRepo = require("../repositories/contractRepository");

function toIntOrZero(v) {
  const n = parseInt(String(v ?? "").replace(/,/g, ""), 10);
  return Number.isNaN(n) ? 0 : n;
}

function toFloatOrNull(v) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = parseFloat(s);
  return Number.isNaN(n) ? null : n;
}

function mustMonth(v) {
  const s = String(v || "").trim();
  if (!/^\d{4}-\d{2}$/.test(s))
    throw new Error("기성월은 YYYY-MM 형식이어야 합니다.");
  return s;
}

function calcAmountByRate(contractTotal, rate) {
  if (rate === null || rate === undefined) return null;
  const r = Number(rate);
  if (Number.isNaN(r)) return null;
  return Math.round((contractTotal * r) / 100);
}

// 목록 + 검색 + 페이징
async function listProgress(q, page, perPage) {
  const keyword = `%${(q || "").trim()}%`;

  const totalCount = progressRepo.countByKeyword(keyword);
  const totalPages = totalCount > 0 ? Math.ceil(totalCount / perPage) : 1;

  let currentPage = parseInt(page || "1", 10);
  if (Number.isNaN(currentPage) || currentPage < 1) currentPage = 1;
  if (currentPage > totalPages) currentPage = totalPages;

  const offset = (currentPage - 1) * perPage;
  const rows = progressRepo.findPaged(keyword, perPage, offset);

  const startNumber = totalCount - offset;

  // ✅ 기존 코드 치명적 오타 수정: ({ .p ... }) → ({ ...p ... })
  const progressList = rows.map((p, idx) => ({
    ...p,
    row_no: startNumber - idx,
  }));

  return {
    progressList,
    totalCount,
    totalPages,
    currentPage,
    perPage,
    searchQuery: q || "",
  };
}

function createProgressFromRequest(body) {
  const contract_id = toIntOrZero(body.contract_id);
  const progress_month = mustMonth(body.progress_month);
  const progress_rate = toFloatOrNull(body.progress_rate);
  const note = (body.note || "").trim();

  if (!contract_id) throw new Error("계약을 선택해야 합니다.");

  const contract = contractRepo.findById(contract_id);
  if (!contract) throw new Error("존재하지 않는 계약입니다.");

  // 월 중복 체크
  if (progressRepo.existsByContractMonth(contract_id, progress_month)) {
    throw new Error(
      "해당 계약의 해당 기성월(YYYY-MM)은 이미 등록되어 있습니다."
    );
  }

  const contractTotal = toIntOrZero(contract.total_amount);

  // 기성률이 있으면 자동 계산, 없으면 입력값 사용
  let progress_amount = toIntOrZero(body.progress_amount);
  const autoAmount = calcAmountByRate(contractTotal, progress_rate);
  if (autoAmount !== null) progress_amount = autoAmount;

  const year = new Date().getFullYear();
  const progress_no = progressRepo.getNextProgressNo(year);

  return progressRepo.createProgressTx({
    progress_no,
    contract_id,
    progress_month,
    progress_rate,
    progress_amount,
    note,
  });
}

function updateProgressFromRequest(id, body) {
  const contract_id = toIntOrZero(body.contract_id);
  const progress_month = mustMonth(body.progress_month);
  const progress_rate = toFloatOrNull(body.progress_rate);
  const note = (body.note || "").trim();

  if (!contract_id) throw new Error("계약을 선택해야 합니다.");

  const contract = contractRepo.findById(contract_id);
  if (!contract) throw new Error("존재하지 않는 계약입니다.");

  // 자기 자신 제외 중복 체크
  if (
    progressRepo.existsByContractMonthExceptId(contract_id, progress_month, id)
  ) {
    throw new Error(
      "해당 계약의 해당 기성월(YYYY-MM)은 이미 등록되어 있습니다."
    );
  }

  const contractTotal = toIntOrZero(contract.total_amount);

  let progress_amount = toIntOrZero(body.progress_amount);
  const autoAmount = calcAmountByRate(contractTotal, progress_rate);
  if (autoAmount !== null) progress_amount = autoAmount;

  progressRepo.updateProgressTx(id, {
    contract_id,
    progress_month,
    progress_rate,
    progress_amount,
    note,
  });
}

function getProgressDetail(id) {
  const row = progressRepo.findById(id);
  if (!row) return null;

  const sumPaid = progressRepo.sumByContractId(row.contract_id);
  const contractTotal = toIntOrZero(row.contract_total_amount);
  const balance = contractTotal - sumPaid;

  return { progress: row, summary: { sumPaid, contractTotal, balance } };
}

function deleteProgress(id) {
  progressRepo.deleteProgressTx(id);
}

module.exports = {
  listProgress,
  createProgressFromRequest,
  updateProgressFromRequest,
  getProgressDetail,
  deleteProgress,
};
