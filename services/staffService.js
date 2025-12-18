// services/staffService.js
const staffRepo = require("../repositories/staffRepository");

function toIntOrNull(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function toTextOrNull(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

module.exports = {
  list({ q, active }) {
    return staffRepo.list({ q, active });
  },

  create(body) {
    const payload = {
      name: String(body.name || "").trim(),
      role: toTextOrNull(body.role),
      daily_wage: toIntOrNull(body.daily_wage),
      start_date: toTextOrNull(body.start_date),
      end_date: toTextOrNull(body.end_date),
      is_active: body.is_active === "0" ? 0 : 1,
    };
    if (!payload.name) throw new Error("name is required");
    return staffRepo.create(payload);
  },

  getDetail(id) {
    return staffRepo.getDetail(id);
  },

  update(id, body) {
    const payload = {
      name: String(body.name || "").trim(),
      role: toTextOrNull(body.role),
      daily_wage: toIntOrNull(body.daily_wage),
      start_date: toTextOrNull(body.start_date),
      end_date: toTextOrNull(body.end_date),
      is_active: body.is_active === "0" ? 0 : 1,
    };
    if (!payload.name) throw new Error("name is required");
    staffRepo.update(id, payload);
  },

  toggleActive(id) {
    staffRepo.toggleActive(id);
  },

  addCertFiles(staffId, files) {
    const rows = (files || []).map((f) => ({
      filename: f.filename,
      original_name: f.originalname,
    }));
    if (rows.length === 0) return;
    staffRepo.insertCertFiles(staffId, rows);
  },

  deleteCertFile(staffId, fileId) {
    staffRepo.deleteCertFile(staffId, fileId);
  },
};
