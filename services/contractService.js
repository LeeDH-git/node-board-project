// services/contractService.js
const contractRepo = require("../repositories/contractRepository");
const progressRepo = require("../repositories/progressRepository");

function toIntOrNull(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? null : n;
}

// 목록 + 검색 + 페이징
function listContracts(searchQuery, pageParam, perPage) {
  const keywordRaw = (searchQuery || "").trim();
  const keywordLike = `%${keywordRaw}%`;

  const totalCount = contractRepo.countByKeyword(keywordLike);
  const totalPages = totalCount > 0 ? Math.ceil(totalCount / perPage) : 1;

  let currentPage = parseInt(pageParam || "1", 10);
  if (Number.isNaN(currentPage) || currentPage < 1) currentPage = 1;
  if (currentPage > totalPages) currentPage = totalPages;

  const offset = (currentPage - 1) * perPage;

  const rows = contractRepo.findPagedByKeyword(keywordLike, perPage, offset);

  const startNumber = totalCount - offset;
  const contracts = rows.map((c, idx) => ({
    ...c,
    row_no: startNumber - idx,
  }));

  return {
    contracts,
    totalCount,
    totalPages,
    currentPage,
    perPage,
    searchQuery: keywordRaw,
  };
}

// 신규 생성
function createContractFromRequest(body, file) {
  const { title, client_name, total_amount, start_date, end_date, body_text } =
    body;

  if (!title) throw new Error("계약명은 필수입니다.");
  if (!file && !body_text)
    throw new Error("PDF 또는 계약 내용을 입력해주세요.");

  const pdf_filename = file ? file.filename : null;

  // ✅ 계약번호 자동 생성 (ctr-YYYY-NNN)
  const year = new Date().getFullYear();
  const finalContractNo =
    body.contract_no && String(body.contract_no).trim()
      ? String(body.contract_no).trim()
      : contractRepo.getNextContractNo(year);

  const id = contractRepo.createContractTx({
    estimate_id: null,
    contract_no: finalContractNo,
    title,
    client_name,
    total_amount: toIntOrNull(total_amount),
    start_date,
    end_date,
    pdf_filename,
    body_text,
  });

  return id;
}

// 수정
function updateContractFromRequest(id, body, file) {
  const existing = contractRepo.findById(id);
  if (!existing) throw new Error("존재하지 않는 계약입니다.");

  const {
    contract_no,
    title,
    client_name,
    total_amount,
    start_date,
    end_date,
    body_text,
  } = body;

  if (!title) throw new Error("계약명은 필수입니다.");

  let pdf_filename = existing.pdf_filename;
  if (file) pdf_filename = file.filename;

  if (!pdf_filename && !body_text)
    throw new Error("PDF 또는 계약 내용을 입력해주세요.");

  contractRepo.updateContractTx(id, {
    estimate_id: null,
    contract_no,
    title,
    client_name,
    total_amount: toIntOrNull(total_amount),
    start_date,
    end_date,
    pdf_filename,
    body_text,
  });
}

// 상세 조회 (기성 이력/요약 포함)
function getContractDetail(id) {
  const contract = contractRepo.findById(id);
  if (!contract) return null;

  const progressHistory = progressRepo.findByContractId(id);
  const sumPaid = progressRepo.sumByContractId(id);
  const contractTotal = contract.total_amount
    ? Number(contract.total_amount)
    : 0;
  const balance = contractTotal - sumPaid;

  return {
    ...contract,
    progressHistory,
    progressSummary: {
      sumPaid,
      contractTotal,
      balance,
    },
  };
}

// 삭제
function deleteContract(id) {
  contractRepo.deleteContractTx(id);
}

function getNextContractNo(year) {
  return contractRepo.getNextContractNo(year);
}

module.exports = {
  listContracts,
  createContractFromRequest,
  updateContractFromRequest,
  getContractDetail,
  deleteContract,
  getNextContractNo,
};
