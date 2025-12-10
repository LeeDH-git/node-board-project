const Database = require("better-sqlite3");
const path = require("path");

// db 파일 경로 (프로젝트 폴더 안에 data.db 생성)
const dbPath = path.join(__dirname, "data.db");
const db = new Database(dbPath);

// 외래키 기능 켜기
db.pragma("foreign_keys = ON");

// 테이블 생성 (없으면 생성)
db.exec(`
  -- 견적 테이블
  CREATE TABLE IF NOT EXISTS estimates (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    title         TEXT NOT NULL,          -- 견적명/공사명
    client_name   TEXT,                   -- 발주처/거래처
    total_amount  INTEGER,                -- 견적 금액
    created_at    TEXT DEFAULT (datetime('now','localtime'))
  );

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
    estimate_id    INTEGER,              -- 어떤 견적에서 나온 계약인지 (옵션)
    contract_no    TEXT,                 -- 계약번호
    title          TEXT NOT NULL,        -- 계약명
    client_name    TEXT,                 -- 발주처
    total_amount   INTEGER,              -- 계약 금액
    start_date     TEXT,                 -- 착공일
    end_date       TEXT,                 -- 준공일
    pdf_filename   TEXT,                 -- 업로드된 계약서 PDF 파일 이름
    body_text      TEXT,                 -- 수기로 작성한 계약서 내용
    created_at     TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (estimate_id) REFERENCES estimates(id) ON DELETE SET NULL
  );

  -- 기성 테이블 (계약과 연결)
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

  -- 직원 테이블
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

`);

module.exports = db;
