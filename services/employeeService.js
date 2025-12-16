const employeeRepo = require("../repositories/employeeRepository");

function toInt(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : def;
}

async function createEmployee(body, files) {
  const name = (body.name || "").trim();
  const birth_date = body.birth_date || "";
  const join_date = body.join_date || "";
  const leave_date = body.leave_date || null;
  const salary = toInt(body.salary, 0);
  const cert_text = (body.cert_text || "").trim();

  if (!name) throw new Error("이름은 필수입니다.");
  if (!birth_date) throw new Error("생년월일은 필수입니다.");
  if (!join_date) throw new Error("입사일은 필수입니다.");
  if (salary < 0) throw new Error("급여는 0 이상이어야 합니다.");

  const photoFile = files?.photo?.[0];
  const photo_filename = photoFile ? photoFile.filename : null;

  const certFiles = files?.certFiles || [];

  return employeeRepo.insertEmployeeWithCertFiles({
    employee: { name, birth_date, join_date, leave_date, salary, photo_filename, cert_text },
    certFiles: certFiles.map(f => ({
      filename: f.filename,
      original_name: f.originalname
    }))
  });
}

async function listEmployees() {
  return employeeRepo.listEmployees();
}

module.exports = { createEmployee, listEmployees };
