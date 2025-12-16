// services/progressService.js
const progressRepo = require("../repositories/progressRepository");
const contractRepo = require("../repositories/contractRepository");

function toIntOrZero(v) {
  const n = parseInt(String(v ?? "").replace(/,/g, ""), 10);
  return Number.isNaN(n) ? 0 : n;
}

function mustMonth(v) {
  const s = String(v || "").trim();
  if (!/^\d{4}-\d{2}$/.test(s))
    throw new Error("기성월은 YYYY-MM 형식이어야 합니다.");
  return s;
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/**
 * 계약의 모든 기성 레코드를 (월 ASC, id ASC) 순으로 누적합을 계산해서
 * progress_rate(누적기성률)을 재계산/갱신한다.
 */
function recalcContractCumulativeRates(contractId, contractTotal) {
  const total = toIntOrZero(contractTotal);
  const rows = progressRepo.findByContractIdAsc(contractId);

  let cum = 0;
  rows.forEach((r) => {
    cum += toIntOrZero(r.progress_amount);
    const rate = total > 0 ? round2((cum / total) * 100) : 0;
    progressRepo.updateProgressRateTx(r.id, rate);
  });

  return {
    sumPaid: cum,
    contractTotal: total,
    balance: total - cum,
    cumulativeRate: total > 0 ? round2((cum / total) * 100) : 0,
  };
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

/** 신규등록 화면에서, 선택 계약의 “이전 누적/잔액/이전 누적률” 표시용 */
function getContractProgressBase(contractId) {
  const cid = toIntOrZero(contractId);
  if (!cid) return null;

  const contract = contractRepo.findById(cid);
  if (!contract) return null;

  const contractTotal = toIntOrZero(contract.total_amount);
  const sumPaid = progressRepo.sumByContractId(cid);
  const balance = contractTotal - sumPaid;
  const prevRate =
    contractTotal > 0 ? round2((sumPaid / contractTotal) * 100) : 0;

  return {
    contractId: cid,
    contractTotal,
    sumPaid,
    balance,
    prevRate,
  };
}

function createProgressFromRequest(body) {
  const contract_id = toIntOrZero(body.contract_id);
  const progress_month = mustMonth(body.progress_month);
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

  // ✅ 이제 “누적률 자동”이므로, 사용자 입력은 금액 위주로 받는다.
  // (금액이 0이면 의미가 없으니 에러 처리)
  const progress_amount = toIntOrZero(body.progress_amount);
  if (!progress_amount) throw new Error("기성금액(원)을 입력해야 합니다.");

  const year = new Date().getFullYear();
  const progress_no = progressRepo.getNextProgressNo(year);

  const id = progressRepo.createProgressTx({
    progress_no,
    contract_id,
    progress_month,
    progress_rate: null, // 재계산으로 채움
    progress_amount,
    note,
  });

  // ✅ 저장 후 전체 누적률 재계산(순서 보장)
  recalcContractCumulativeRates(contract_id, contractTotal);

  return id;
}

function updateProgressFromRequest(id, body) {
  const progressId = toIntOrZero(id);

  const contract_id = toIntOrZero(body.contract_id);
  const progress_month = mustMonth(body.progress_month);
  const note = (body.note || "").trim();

  if (!contract_id) throw new Error("계약을 선택해야 합니다.");

  const contract = contractRepo.findById(contract_id);
  if (!contract) throw new Error("존재하지 않는 계약입니다.");

  // 자기 자신 제외 월 중복 체크
  if (
    progressRepo.existsByContractMonthExceptId(
      contract_id,
      progress_month,
      progressId
    )
  ) {
    throw new Error(
      "해당 계약의 해당 기성월(YYYY-MM)은 이미 등록되어 있습니다."
    );
  }

  const contractTotal = toIntOrZero(contract.total_amount);

  const progress_amount = toIntOrZero(body.progress_amount);
  if (!progress_amount) throw new Error("기성금액(원)을 입력해야 합니다.");

  progressRepo.updateProgressTx(progressId, {
    contract_id,
    progress_month,
    progress_rate: null, // 재계산으로 채움
    progress_amount,
    note,
  });

  // ✅ 수정 후에도 전체 누적률 재계산
  recalcContractCumulativeRates(contract_id, contractTotal);
}

function getProgressDetail(id) {
  const row = progressRepo.findById(id);
  if (!row) return null;

  const contractTotal = toIntOrZero(row.contract_total_amount);

  // 전체 누적
  const sumPaid = progressRepo.sumByContractId(row.contract_id);
  const balance = contractTotal - sumPaid;

  // “이 레코드까지의 누적/잔액”도 표시하고 싶으면 계산
  const asc = progressRepo.findByContractIdAsc(row.contract_id);
  let cumAtThis = 0;
  for (const r of asc) {
    cumAtThis += toIntOrZero(r.progress_amount);
    if (String(r.id) === String(row.id)) break;
  }
  const balanceAtThis = contractTotal - cumAtThis;

  return {
    progress: row,
    summary: {
      contractTotal,
      sumPaid,
      balance,
      cumAtThis,
      balanceAtThis,
      cumulativeRateAtThis:
        contractTotal > 0 ? round2((cumAtThis / contractTotal) * 100) : 0,
    },
  };
}

function deleteProgress(id) {
  const row = progressRepo.findById(id);
  if (!row) return;

  const contractId = row.contract_id;
  const contractTotal = toIntOrZero(row.contract_total_amount);

  progressRepo.deleteProgressTx(id);

  // ✅ 삭제 후에도 전체 누적률 재계산
  recalcContractCumulativeRates(contractId, contractTotal);
}

module.exports = {
  listProgress,
  getContractProgressBase,
  createProgressFromRequest,
  updateProgressFromRequest,
  getProgressDetail,
  deleteProgress,
};
