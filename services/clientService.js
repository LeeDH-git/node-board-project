const clientRepo = require("../repositories/clientRepository");

function sanitize(body) {
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

function createClientFromRequest(body) {
  const data = sanitize(body);
  return clientRepo.create(data);
}

function updateClientFromRequest(id, body) {
  const data = sanitize(body);
  clientRepo.update(id, data);
}

function deleteClient(id) {
  clientRepo.remove(id);
}

function bulkCreateClients(list) {
  // list: [{name,biz_no,ceo_name,phone,email,address,memo}, ...]
  // 기본 검증(최소)
  list.forEach((c, idx) => {
    if (!c.name || !c.name.trim()) throw new Error(`row ${idx + 2}: 거래처명(필수)이 비어있습니다.`);
  });

  // 일괄 삽입(트랜잭션)
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
