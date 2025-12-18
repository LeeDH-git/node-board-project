// db.js
const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "data.db");
const db = new Database(dbPath);

db.pragma("foreign_keys = ON");

// ==================== helpers ====================
function safeRun(sql) {
  try {
    db.exec(sql);
  } catch (e) {
    // 개발 중에는 필요하면 console.log(e.message);
  }
}

function safeAlter(sql) {
  try {
    db.prepare(sql).run();
  } catch (e) {
    // "duplicate column name" 등은 무시
  }
}

// ==================== schema ====================
db.exec(`
  /* =========================
     견적 / 견적상세
  ========================= */
  CREATE TABLE IF NOT EXISTS estimates (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    estimate_no   TEXT,                   -- est-YYYY-NNN
    title         TEXT NOT NULL,
    client_name   TEXT,
    total_amount  INTEGER,
    created_at    TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE UNIQUE INDEX IF NOT EXISTS ux_estimates_estimate_no
  ON estimates(estimate_no);

  CREATE TABLE IF NOT EXISTS estimate_items (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    estimate_id      INTEGER NOT NULL,
    row_no           INTEGER,
    item_name        TEXT,
    spec             TEXT,
    unit             TEXT,
    qty              REAL,
    material_unit    INTEGER,
    material_amount  INTEGER,
    labor_unit       INTEGER,
    labor_amount     INTEGER,
    expense_unit     INTEGER,
    expense_amount   INTEGER,
    total_unit       INTEGER,
    total_amount     INTEGER,
    note             TEXT,
    FOREIGN KEY (estimate_id) REFERENCES estimates(id) ON DELETE CASCADE
  );

  /* =========================
     계약
  ========================= */
  CREATE TABLE IF NOT EXISTS contracts (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    estimate_id    INTEGER,
    contract_no    TEXT,                  -- ctr-YYYY-NNN
    title          TEXT NOT NULL,
    client_name    TEXT,
    total_amount   INTEGER,
    start_date     TEXT,
    end_date       TEXT,
    pdf_filename   TEXT,
    body_text      TEXT,
    created_at     TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (estimate_id) REFERENCES estimates(id) ON DELETE SET NULL
  );

  CREATE UNIQUE INDEX IF NOT EXISTS ux_contracts_contract_no
  ON contracts(contract_no);

  /* =========================
     기성(progress)
  ========================= */
  CREATE TABLE IF NOT EXISTS progress (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    progress_no     TEXT NOT NULL UNIQUE,  -- prg-YYYY-NNN
    contract_id     INTEGER NOT NULL,
    progress_month  TEXT NOT NULL,         -- YYYY-MM
    progress_rate   REAL,
    progress_amount INTEGER NOT NULL DEFAULT 0,
    note            TEXT,
    created_at      TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_progress_contract_id ON progress(contract_id);
  CREATE INDEX IF NOT EXISTS idx_progress_month      ON progress(progress_month);

  -- 계약 + 월 중복 방지
  CREATE UNIQUE INDEX IF NOT EXISTS ux_progress_contract_month
  ON progress(contract_id, progress_month);

  /* =========================
     (레거시) progress_payments
  ========================= */
  CREATE TABLE IF NOT EXISTS progress_payments (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_id   INTEGER NOT NULL,
    seq           INTEGER,
    progress_date TEXT,
    amount        INTEGER,
    note          TEXT,
    created_at    TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
  );

  /* =========================
     직원 / 관리자(로그인)
     - "관리자도 직원"을 1:1로 표현 (staff_id optional)
  ========================= */
  CREATE TABLE IF NOT EXISTS staff (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    role          TEXT,
    daily_wage    INTEGER,
    start_date    TEXT,
    end_date      TEXT,
    is_active     INTEGER DEFAULT 1,
    created_at    TEXT DEFAULT (datetime('now','localtime'))
  );

  /* CREATE INDEX IF NOT EXISTS ix_staff_active ON staff(is_active); */

  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id      INTEGER UNIQUE,          -- 직원과 1:1 연결(선택)
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'admin',
    is_active     INTEGER DEFAULT 1,
    created_at    TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE SET NULL
  );

  /* CREATE INDEX IF NOT EXISTS ix_users_active ON users(is_active); */

  /* =========================
     직원 자격증 파일(다중 첨부)
  ========================= */
  CREATE TABLE IF NOT EXISTS staff_cert_files (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id      INTEGER NOT NULL,
    filename      TEXT NOT NULL,
    original_name TEXT NOT NULL,
    created_at    TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_staff_cert_files_staff_id
  ON staff_cert_files(staff_id);

  /* =========================
     계약-직원 매핑 (N:N)
  ========================= */
  CREATE TABLE IF NOT EXISTS contract_staff (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_id   INTEGER NOT NULL,
    staff_id      INTEGER NOT NULL,
    role          TEXT,
    start_date    TEXT,
    end_date      TEXT,
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
    FOREIGN KEY (staff_id)    REFERENCES staff(id)    ON DELETE CASCADE
  );

  /* =========================
     거래처(발주처)
  ========================= */
  CREATE TABLE IF NOT EXISTS clients (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    biz_no        TEXT,
    ceo_name      TEXT,
    phone         TEXT,
    email         TEXT,
    address       TEXT,
    memo          TEXT,
    created_at    TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE INDEX IF NOT EXISTS idx_clients_name   ON clients(name);
  CREATE INDEX IF NOT EXISTS idx_clients_biz_no ON clients(biz_no);
`);

// ==================== migrations (기존 DB 대비) ====================
// estimates
safeAlter("ALTER TABLE estimates ADD COLUMN estimate_no TEXT");
safeRun(`
  CREATE UNIQUE INDEX IF NOT EXISTS ux_estimates_estimate_no
  ON estimates(estimate_no)
`);

// contracts
safeAlter("ALTER TABLE contracts ADD COLUMN contract_no TEXT");
safeRun(`
  CREATE UNIQUE INDEX IF NOT EXISTS ux_contracts_contract_no
  ON contracts(contract_no)
`);

// progress
safeAlter("ALTER TABLE progress ADD COLUMN progress_rate REAL");
safeRun(`
  CREATE UNIQUE INDEX IF NOT EXISTS ux_progress_contract_month
  ON progress(contract_id, progress_month)
`);

// client_id 컬럼 (향후 FK로 쓰려는 의도 유지)
safeAlter("ALTER TABLE estimates ADD COLUMN client_id INTEGER");
safeAlter("ALTER TABLE contracts ADD COLUMN client_id INTEGER");

// staff 확장 컬럼
safeAlter("ALTER TABLE staff ADD COLUMN birth_date TEXT");
safeAlter("ALTER TABLE staff ADD COLUMN salary INTEGER");
safeAlter("ALTER TABLE staff ADD COLUMN photo_filename TEXT");
safeAlter("ALTER TABLE staff ADD COLUMN cert_text TEXT");

// ==================== migrations (기존 DB 대비) ====================

// staff: 예전 DB에 is_active 없을 수 있음 (✅ 추가)
safeAlter("ALTER TABLE staff ADD COLUMN is_active INTEGER DEFAULT 1");
safeRun("UPDATE staff SET is_active = 1 WHERE is_active IS NULL"); // 기존 NULL 보정(선택이지만 권장)
safeRun("CREATE INDEX IF NOT EXISTS ix_staff_active ON staff(is_active)"); // ✅ 인덱스는 여기서 생성

// users: 예전 DB에 is_active 없을 수 있음 (✅ 추가)
safeAlter("ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1");
safeRun("UPDATE users SET is_active = 1 WHERE is_active IS NULL");
safeRun("CREATE INDEX IF NOT EXISTS ix_users_active ON users(is_active)");

module.exports = db;
