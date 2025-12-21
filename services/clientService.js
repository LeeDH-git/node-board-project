const clientRepo = require("../repositories/clientRepository");
const { normalizeOriginalName } = require("../middlewares/utils/fileName"); // ✅ [추가] 파일명 정규화

function sanitize(body = {}) {
  const trim = (v) => (v ?? "").toString().trim();
  const name = trim(body.name);
  if (!name) throw new Error("거래처명은 필수입니다.");

  return {
    name,
    biz_no: trim(body.biz_no),
    ceo_name: trim(body.ceo_name),
    phone: trim(body.phone),
    email: trim(body.email),
    address: trim(body.address),
    memo: trim(body.memo),
  };
}

function listClients(q, page, perPage) {
  const p = Math.max(1, parseInt(page || "1", 10));
  const result = clientRepo.list({ q: q || "", page: p, perPage });

  const totalPages = Math.max(1, Math.ceil(result.total / perPage));

  return {
    q: q || "",
    page: p,
    perPage,
    total: result.total,
    totalPages,
    clients: result.rows,
  };
}

function getClient(id) {
  return clientRepo.findById(id);
}

/**
 * ✅ [수정] file.originalname 저장 전에 정규화 + 경로는 OS path가 아니라 웹 경로(/uploads/...)로 저장
 * - file: multer req.file (없을 수도 있음)
 */
function createClientFromRequest(body, file) {
  const data = sanitize(body);

  if (file) {
    data.biz_cert_name = normalizeOriginalName(file.originalname); // ✅ [정규화]
    data.biz_cert_path = `/uploads/bizcert/${file.filename}`; // ✅ [수정] 웹 접근 경로 저장
  }

  return clientRepo.create(data);
}

/**
 * ✅ [수정] "업로드 없을 때 기존 첨부 유지"를 위해 update를 2단계로 분리
 * 1) updateBase(): 텍스트 필드만 업데이트
 * 2) 업로드가 있을 때만 updateBizCert() 호출
 */
function updateClientFromRequest(id, body, file) {
  const data = sanitize(body);

  // 1) 텍스트 필드 업데이트 (첨부는 유지)
  clientRepo.updateBase(id, data);

  // 2) 업로드가 있을 때만 첨부 업데이트 (없으면 기존 첨부 유지)
  if (file) {
    clientRepo.updateBizCert(id, {
      biz_cert_name: normalizeOriginalName(file.originalname), // ✅ [정규화]
      biz_cert_path: `/uploads/bizcert/${file.filename}`, // ✅ [수정] 웹 접근 경로 저장
    });
  }
}

function deleteClient(id) {
  clientRepo.remove(id);
}

function bulkCreateClients(list) {
  list.forEach((c, idx) => {
    if (!c.name || !c.name.trim()) {
      throw new Error(`row ${idx + 2}: 거래처명(필수)이 비어있습니다.`);
    }
  });

  return clientRepo.bulkInsert(list);
}

module.exports = {
  listClients,
  getClient,
  createClientFromRequest,
  updateClientFromRequest,
  deleteClient,
  bulkCreateClients,
};
