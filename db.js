// db.js
const Database = require("better-sqlite3");
const path = require("path");

// db 파일 경로 (프로젝트 폴더 안에 data.db 생성)
const dbPath = path.join(__dirname, "data.db");
const db = new Database(dbPath);

// 외래키 기능 켜기
db.pragma("foreign_keys = ON");

// ==================== 테이블 생성 (없으면 생성) ====================
db.exec(`
  -- 견적 테이블
  CREATE TABLE IF NOT EXISTS estimates (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    estimate_no   TEXT,                   -- est-YYYY-NNN (추가)
    title         TEXT NOT NULL,           -- 견적명/공사명
    client_name   TEXT,                   -- 발주처/거래처(문자열은 그대로 유지)
    total_amount  INTEGER,                -- 견적 금액
    created_at    TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE UNIQUE INDEX IF NOT EXISTS ux_estimates_estimate_no
  ON estimates(estimate_no);

  -- 견적 상세내역 테이블
  CREATE TABLE IF NOT EXISTS estimate_items (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    estimate_id      INTEGER NOT NULL,    -- 어느 견적에 속하는 내역인지
    row_no           INTEGER,             -- 행 번호(정렬용)
    item_name        TEXT,                -- 품명
    spec             TEXT,                -- 규격
    unit             TEXT,                -- 단위
    qty              REAL,                -- 수량

    material_unit    INTEGER,             -- 재료비 단가
    material_amount  INTEGER,             -- 재료비 금액
    labor_unit       INTEGER,             -- 노무비 단가
    labor_amount     INTEGER,             -- 노무비 금액
    expense_unit     INTEGER,             -- 경비 단가
    expense_amount   INTEGER,             -- 경비 금액
    total_unit       INTEGER,             -- 합계 단가
    total_amount     INTEGER,             -- 합계 금액

    note             TEXT,                -- 비고
    FOREIGN KEY (estimate_id) REFERENCES estimates(id) ON DELETE CASCADE
  );

  -- 계약 테이블 (견적과 연결)
  CREATE TABLE IF NOT EXISTS contracts (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    estimate_id    INTEGER,               -- 어떤 견적에서 나온 계약인지 (옵션)
    contract_no    TEXT,                  -- ctr-YYYY-NNN (자동부여용)
    title          TEXT NOT NULL,         -- 계약명
    client_name    TEXT,                  -- 발주처(문자열은 그대로 유지)
    total_amount   INTEGER,               -- 계약 금액
    start_date     TEXT,                  -- 착공일
    end_date       TEXT,                  -- 준공일
    pdf_filename   TEXT,                  -- 업로드된 계약서 PDF 파일 이름
    body_text      TEXT,                  -- 수기로 작성한 계약서 내용
    created_at     TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (estimate_id) REFERENCES estimates(id) ON DELETE SET NULL
  );

  CREATE UNIQUE INDEX IF NOT EXISTS ux_contracts_contract_no
  ON contracts(contract_no);

  -- ✅ 기성 테이블 (이번에 구현한 progress 코드와 1:1 매칭)
  CREATE TABLE IF NOT EXISTS progress (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    progress_no    TEXT NOT NULL UNIQUE,  -- prg-YYYY-NNN
    contract_id    INTEGER NOT NULL,
    progress_month TEXT NOT NULL,         -- YYYY-MM
    progress_rate  REAL,                  -- 기성률(%)
    progress_amount INTEGER NOT NULL DEFAULT 0,
    note           TEXT,
    created_at     TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_progress_contract_id ON progress(contract_id);
  CREATE INDEX IF NOT EXISTS idx_progress_month      ON progress(progress_month);

  -- ✅ 계약 + 월 중복 방지
  CREATE UNIQUE INDEX IF NOT EXISTS ux_progress_contract_month
  ON progress(contract_id, progress_month);

  -- ===== (기존/레거시) progress_payments 테이블: 남겨둬도 무방 =====
  -- 이미 만들었거나 앞으로 안 쓸 테이블이면 유지해도 되고, 사용 안 하면 무시하면 됩니다.
  CREATE TABLE IF NOT EXISTS progress_payments (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_id   INTEGER NOT NULL,
    seq           INTEGER,               -- 기성 차수 (1차, 2차...)
    progress_date TEXT,                  -- 기성일자
    amount        INTEGER,               -- 기성금액
    note          TEXT,
    created_at    TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
  );

    -- =========================
  -- ✅ 관리자 로그인(가입 노출 없음)
  -- =========================
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'admin',
    created_at    TEXT DEFAULT (datetime('now','localtime'))
  );

  -- =========================
  -- ✅ 직원(staff) 확장 컬럼을 쓰는 형태 권장
  --   (기존 staff 테이블은 아래 마이그레이션에서 컬럼 추가로 처리)
  -- =========================

  -- ✅ 직원 자격증 증빙 파일(다중 첨부)
  CREATE TABLE IF NOT EXISTS staff_cert_files (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id      INTEGER NOT NULL,
    filename      TEXT NOT NULL,      -- 저장 파일명
    original_name TEXT NOT NULL,      -- 원본 파일명
    created_at    TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_staff_cert_files_staff_id
  ON staff_cert_files(staff_id);


  -- 직원 테이블 (기존 정의 유지)
  CREATE TABLE IF NOT EXISTS staff (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,         -- 이름
    role          TEXT,                  -- 직책/공종
    daily_wage    INTEGER,               -- 일당
    start_date    TEXT,                  -- 입사일
    end_date      TEXT,                  -- 퇴사일
    is_active     INTEGER DEFAULT 1,     -- 1: 재직, 0: 퇴사
    created_at    TEXT DEFAULT (datetime('now','localtime'))
  );

  -- 계약-직원 매핑 (N:N)
  CREATE TABLE IF NOT EXISTS contract_staff (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_id   INTEGER NOT NULL,
    staff_id      INTEGER NOT NULL,
    role          TEXT,                  -- 해당 계약에서의 역할
    start_date    TEXT,
    end_date      TEXT,
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
    FOREIGN KEY (staff_id)    REFERENCES staff(id)    ON DELETE CASCADE
  );

  -- 거래처(발주처) 테이블
  CREATE TABLE IF NOT EXISTS clients (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,         -- 거래처명
    biz_no        TEXT,                  -- 사업자번호
    ceo_name      TEXT,                  -- 대표자
    phone         TEXT,                  -- 전화
    email         TEXT,                  -- 이메일
    address       TEXT,                  -- 주소
    memo          TEXT,                  -- 메모
    created_at    TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE INDEX IF NOT EXISTS idx_clients_name   ON clients(name);
  CREATE INDEX IF NOT EXISTS idx_clients_biz_no ON clients(biz_no);
`);

// ==================== 마이그레이션 (기존 DB 사용자 대비) ====================
// ✅ 이미 컬럼이 있으면 에러가 나므로 try/catch로 무시
try {
  db.prepare("ALTER TABLE estimates ADD COLUMN estimate_no TEXT").run();
} catch (e) {}
try {
  db.prepare(
    "CREATE UNIQUE INDEX IF NOT EXISTS ux_estimates_estimate_no ON estimates(estimate_no)"
  ).run();
} catch (e) {}

try {
  db.prepare("ALTER TABLE contracts ADD COLUMN contract_no TEXT").run();
} catch (e) {}
try {
  db.prepare(
    "CREATE UNIQUE INDEX IF NOT EXISTS ux_contracts_contract_no ON contracts(contract_no)"
  ).run();
} catch (e) {}

try {
  db.prepare("ALTER TABLE progress ADD COLUMN progress_rate REAL").run();
} catch (e) {}
try {
  db.prepare(
    "CREATE UNIQUE INDEX IF NOT EXISTS ux_progress_contract_month ON progress(contract_id, progress_month)"
  ).run();
} catch (e) {}

try {
  db.prepare("ALTER TABLE estimates ADD COLUMN client_id INTEGER").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE contracts ADD COLUMN client_id INTEGER").run();
} catch (e) {}

// ==================== 직원(staff) 확장 마이그레이션 ====================
try {
  db.prepare("ALTER TABLE staff ADD COLUMN birth_date TEXT").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE staff ADD COLUMN salary INTEGER").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE staff ADD COLUMN photo_filename TEXT").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE staff ADD COLUMN cert_text TEXT").run();
} catch (e) {}

module.exports = db;
