// repositories/staffRepository.js
const db = require("../db");

module.exports = {
  list({ q, active }) {
    const where = [];
    const params = {};

    if (q) {
      where.push("(s.name LIKE @q OR s.role LIKE @q OR u.username LIKE @q)");
      params.q = `%${q}%`;
    }
    if (active === "1" || active === "0") {
      where.push("s.is_active = @active");
      params.active = Number(active);
    }

    const sql = `
      SELECT
        s.*,
        u.username AS user_username,
        u.role     AS user_role
      FROM staff s
      LEFT JOIN users u ON u.staff_id = s.id
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY s.is_active DESC, s.id DESC
    `;
    return db.prepare(sql).all(params);
  },

  create(payload) {
    const stmt = db.prepare(`
      INSERT INTO staff (name, role, daily_wage, start_date, end_date, is_active)
      VALUES (@name, @role, @daily_wage, @start_date, @end_date, @is_active)
    `);
    const info = stmt.run(payload);
    return info.lastInsertRowid;
  },

  getDetail(id) {
    const staff = db
      .prepare(
        `
        SELECT
          s.*,
          u.username AS user_username,
          u.role     AS user_role,
          u.is_active AS user_is_active
        FROM staff s
        LEFT JOIN users u ON u.staff_id = s.id
        WHERE s.id = ?
      `
      )
      .get(id);

    if (!staff) return null;

    const certs = db
      .prepare(
        `
        SELECT id, staff_id, filename, original_name, created_at
        FROM staff_cert_files
        WHERE staff_id = ?
        ORDER BY id DESC
      `
      )
      .all(id);

    return { ...staff, certs };
  },

  update(id, payload) {
    db.prepare(
      `
      UPDATE staff
      SET
        name=@name,
        role=@role,
        daily_wage=@daily_wage,
        start_date=@start_date,
        end_date=@end_date,
        is_active=@is_active
      WHERE id=@id
    `
    ).run({ ...payload, id });
  },

  toggleActive(id) {
    db.prepare(
      `
      UPDATE staff
      SET is_active = CASE WHEN is_active=1 THEN 0 ELSE 1 END
      WHERE id = ?
    `
    ).run(id);
  },

  insertCertFiles(staffId, rows) {
    const insert = db.prepare(`
      INSERT INTO staff_cert_files (staff_id, filename, original_name)
      VALUES (@staff_id, @filename, @original_name)
    `);

    const tx = db.transaction((items) => {
      for (const r of items) insert.run({ staff_id: staffId, ...r });
    });
    tx(rows);
  },

  deleteCertFile(staffId, fileId) {
    // staffId 확인 포함(타 직원 파일 삭제 방지)
    db.prepare(
      `
      DELETE FROM staff_cert_files
      WHERE id = ? AND staff_id = ?
    `
    ).run(fileId, staffId);
  },
};
