// ==============================================
// 기본 모듈 로드
// ==============================================
const express = require("express");
const path = require("path");
const db = require("./db"); // better-sqlite3 등으로 만든 db 인스턴스
const ExcelJS = require("exceljs");

// ==============================================
// Express 기본 설정
// ==============================================
const app = express();
const PORT = 3000;

// EJS 템플릿 엔진 설정
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// POST 폼 바디 파싱 (x-www-form-urlencoded)
app.use(express.urlencoded({ extended: true }));

// (옵션) 정적 파일 서빙하려면 이거 주석 해제
app.use(express.static(path.join(__dirname, "public")));

// ==============================================
// 공통 유틸 함수 (뉴비용 헬퍼)
// ==============================================

// 숫자 파싱 헬퍼 (파싱 실패 시 기본값 사용)
function toInt(value, defaultValue = 0) {
  const parsed = parseInt(value);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

function toFloat(value, defaultValue = 0) {
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

// id 파싱 헬퍼
function parseId(param) {
  return parseInt(param, 10);
}

// form으로 받은 items를 항상 배열 형태로 맞추기
function normalizeItems(items) {
  if (!items) return [];
  return Array.isArray(items) ? items : Object.values(items);
}

// 전체 견적 금액 계산
function calculateEstimateTotalAmount(items) {
  return items.reduce((sum, item) => {
    return sum + (toInt(item.total_amount) || 0);
  }, 0);
}

// 수정 화면용: 정해진 행 수만큼 채우기
function fillItemsForEditView(items, rowCount) {
  const filled = [];
  for (let i = 0; i < rowCount; i++) {
    filled.push(
      items[i] || {
        item_name: "",
        spec: "",
        unit: "",
        qty: "",
        material_unit: "",
        material_amount: "",
        labor_unit: "",
        labor_amount: "",
        expense_unit: "",
        expense_amount: "",
        total_unit: "",
        total_amount: "",
        note: "",
      }
    );
  }
  return filled;
}

// ==============================================
// DB Prepare (SQL 문 미리 준비)
// ==============================================

// 1) estimates(견적 헤더) INSERT
const insertEstimate = db.prepare(`
  INSERT INTO estimates (title, client_name, total_amount)
  VALUES (?, ?, ?)
`);

// 2) estimate_items(견적 상세행) INSERT
const insertEstimateItem = db.prepare(`
  INSERT INTO estimate_items (
    estimate_id, row_no, item_name, spec, unit, qty,
    material_unit, material_amount,
    labor_unit, labor_amount,
    expense_unit, expense_amount,
    total_unit, total_amount,
    note
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// 3) 견적 1건 조회 (헤더)
const getEstimate = db.prepare(`
  SELECT * FROM estimates WHERE id = ?
`);

// 4) 견적 1건의 상세행 전체 조회
const getEstimateItems = db.prepare(`
  SELECT *
  FROM estimate_items
  WHERE estimate_id = ?
  ORDER BY row_no ASC
`);

// 5) 견적 헤더 수정
const updateEstimate = db.prepare(`
  UPDATE estimates
  SET title = ?, client_name = ?, total_amount = ?
  WHERE id = ?
`);

// 6) 견적에 속한 상세행 전체 삭제
const deleteItemsByEstimate = db.prepare(`
  DELETE FROM estimate_items WHERE estimate_id = ?
`);

// 7) 견적 헤더 삭제
const deleteEstimateHeader = db.prepare(`
  DELETE FROM estimates WHERE id = ?
`);

// ==============================================
// Transactions (여러 쿼리를 하나의 트랜잭션으로 묶기)
// ==============================================

// ■ 신규 견적 생성 트랜잭션
// - estimates에 헤더 1건 INSERT
// - estimate_items에 상세행 여러 건 INSERT
const createEstimateTx = db.transaction((header, items) => {
  // 헤더 저장
  const info = insertEstimate.run(
    header.title,
    header.client_name,
    header.total_amount
  );
  const estimateId = info.lastInsertRowid; // 방금 INSERT된 견적 id

  // 상세행들 저장
  items.forEach((item, idx) => {
    // 완전히 빈 줄(아무 데이터도 없는 경우)은 스킵
    if (
      !item.item_name &&
      !item.spec &&
      !item.unit &&
      !item.qty &&
      !item.total_amount
    )
      return;

    insertEstimateItem.run(
      estimateId, // 방금 생성한 견적 id
      idx + 1, // row_no (1부터 시작)
      item.item_name || null,
      item.spec || null,
      item.unit || null,
      toFloat(item.qty) || 0,
      toInt(item.material_unit) || 0,
      toInt(item.material_amount) || 0,
      toInt(item.labor_unit) || 0,
      toInt(item.labor_amount) || 0,
      toInt(item.expense_unit) || 0,
      toInt(item.expense_amount) || 0,
      toInt(item.total_unit) || 0,
      toInt(item.total_amount) || 0,
      item.note || null
    );
  });
});

// ■ 기존 견적 수정 트랜잭션
// - estimates 헤더 UPDATE
// - 기존 상세행 전체 삭제
// - 새 상세행들 INSERT
const updateEstimateTx = db.transaction((id, header, items) => {
  // 헤더 수정
  updateEstimate.run(
    header.title,
    header.client_name,
    header.total_amount,
    id
  );

  // 해당 견적의 기존 상세행 전부 삭제
  deleteItemsByEstimate.run(id);

  // 새 상세행들 다시 INSERT
  items.forEach((item, idx) => {
    if (
      !item.item_name &&
      !item.spec &&
      !item.unit &&
      !item.qty &&
      !item.total_amount
    )
      return;

    insertEstimateItem.run(
      id, // 수정 대상 견적 id
      idx + 1,
      item.item_name || null,
      item.spec || null,
      item.unit || null,
      toFloat(item.qty) || 0,
      toInt(item.material_unit) || 0,
      toInt(item.material_amount) || 0,
      toInt(item.labor_unit) || 0,
      toInt(item.labor_amount) || 0,
      toInt(item.expense_unit) || 0,
      toInt(item.expense_amount) || 0,
      toInt(item.total_unit) || 0,
      toInt(item.total_amount) || 0,
      item.note || null
    );
  });
});

// ■ 견적 복사 트랜잭션
// - 원본 견적 헤더/상세를 그대로 복사하여 새 견적 생성
const copyEstimateTx = db.transaction((sourceId) => {
  // 1) 원본 헤더 조회
  const src = getEstimate.get(sourceId);
  if (!src) throw new Error("원본 견적이 존재하지 않습니다.");

  // 2) 원본 상세행 전체 조회
  const items = getEstimateItems.all(sourceId);

  // 3) 새 헤더 INSERT (제목 뒤에 "(복사)" 붙이기)
  const info = insertEstimate.run(
    src.title + " (복사)",
    src.client_name,
    src.total_amount
  );
  const newId = info.lastInsertRowid;

  // 4) 상세행들 그대로 새 견적에 INSERT
  items.forEach((item) => {
    insertEstimateItem.run(
      newId,
      item.row_no,
      item.item_name,
      item.spec,
      item.unit,
      item.qty,
      item.material_unit,
      item.material_amount,
      item.labor_unit,
      item.labor_amount,
      item.expense_unit,
      item.expense_amount,
      item.total_unit,
      item.total_amount,
      item.note
    );
  });

  // 새로 생성된 견적 id 반환
  return newId;
});

// ■ 견적 삭제 트랜잭션
// - 상세행 먼저 삭제 → 헤더 삭제
const deleteEstimateTx = db.transaction((id) => {
  deleteItemsByEstimate.run(id);
  deleteEstimateHeader.run(id);
});

// ==============================================
// 견적서 엑셀 파일 다운로드 라우트
// ==============================================
app.get("/estimate/:id/excel", async (req, res) => {
  const id = parseId(req.params.id);
  const estimate = getEstimate.get(id);
  const items = getEstimateItems.all(id);

  if (!estimate) return res.status(404).send("존재하지 않는 견적입니다.");

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("견적서");

  // ===== 공통 스타일 =====
  const thinBorder = { style: "thin", color: { argb: "FF999999" } };
  const allBorder = {
    top: thinBorder,
    left: thinBorder,
    bottom: thinBorder,
    right: thinBorder,
  };

  // ============================================
  // ⭐ 0. 열 너비 고정 설정 (자동조정 제거)
  // ============================================
  sheet.columns = [
    { width: 22 }, // 품명
    { width: 16 }, // 규격
    { width: 7 }, // 단위
    { width: 7 }, // 수량

    { width: 10 }, // 재료 단가
    { width: 14 }, // 재료 금액

    { width: 10 }, // 노무 단가
    { width: 14 }, // 노무 금액

    { width: 10 }, // 경비 단가
    { width: 14 }, // 경비 금액

    { width: 10 }, // 합계 단가
    { width: 15 }, // 합계 금액

    { width: 15 }, // 비고
  ];

  // =========================
  // 1. 제목
  // =========================
  sheet.mergeCells("A1:N1");
  sheet.getCell("A1").value = "견    적    내    역    서";
  sheet.getCell("A1").alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  sheet.getCell("A1").font = { size: 18, bold: true };

  // ⭐ 제목 행 높이 조정
  sheet.getRow(1).height = 28;

  // =========================
  // 2. 공사명 / 발주처
  // =========================
  sheet.getCell("A3").value = "공사명 :";
  sheet.mergeCells("B3:N3");
  sheet.getCell("B3").value = estimate.title;

  sheet.getCell("A4").value = "발주처 :";
  sheet.mergeCells("B4:N4");
  sheet.getCell("B4").value = estimate.client_name || "";

  // ⭐ 공사명/발주처 행 높이
  sheet.getRow(3).height = 20;
  sheet.getRow(4).height = 20;

  // =========================
  // 3. 헤더 만들기
  // =========================
  const headerRow1 = [
    "품명",
    "규격",
    "단위",
    "수량",
    "재료비",
    "",
    "노무비",
    "",
    "경비",
    "",
    "합계",
    "",
    "비고",
  ];

  const headerRow2 = [
    "",
    "",
    "",
    "",
    "단가",
    "금액",
    "단가",
    "금액",
    "단가",
    "금액",
    "단가",
    "금액",
    "",
  ];

  sheet.addRow([]);
  const row6 = sheet.addRow(headerRow1);
  const row7 = sheet.addRow(headerRow2);

  // ⭐ 헤더 행 높이 추가
  row6.height = 22;
  row7.height = 20;

  // 병합
  sheet.mergeCells("A6:A7");
  sheet.mergeCells("B6:B7");
  sheet.mergeCells("C6:C7");
  sheet.mergeCells("D6:D7");

  sheet.mergeCells("E6:F6");
  sheet.mergeCells("G6:H6");
  sheet.mergeCells("I6:J6");
  sheet.mergeCells("K6:L6");

  sheet.mergeCells("M6:M7");

  // 스타일 (헤더)
  [row6, row7].forEach((r) => {
    r.eachCell((cell) => {
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.font = { bold: true };
      cell.border = allBorder;
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFDEEAF6" },
      };
    });
  });

  // =========================
  // 4. 본문 데이터 입력
  // =========================
  items.forEach((item) => {
    const row = sheet.addRow([
      item.item_name,
      item.spec,
      item.unit,
      item.qty,
      item.material_unit,
      item.material_amount,
      item.labor_unit,
      item.labor_amount,
      item.expense_unit,
      item.expense_amount,
      item.total_unit,
      item.total_amount,
      item.note,
    ]);

    // ⭐ 본문 행 높이 고정
    row.height = 18;

    row.eachCell((cell, colNum) => {
      cell.border = allBorder;

      // 숫자 정렬 및 숫자 포맷 (#,###)
      if (colNum >= 5 && colNum <= 12 && !isNaN(cell.value)) {
        cell.alignment = { horizontal: "right", vertical: "middle" };
        cell.numFmt = "#,###"; // ⭐ 숫자 콤마 적용
      } else {
        cell.alignment = { horizontal: "left", vertical: "middle" };
      }
    });
  });

  // =========================
  // 5. 합계 행
  // =========================
  const sumMaterial = items.reduce(
    (a, b) => a + (b.material_amount || 0),
    0
  );
  const sumLabor = items.reduce((a, b) => a + (b.labor_amount || 0), 0);
  const sumExpense = items.reduce(
    (a, b) => a + (b.expense_amount || 0),
    0
  );
  const sumTotal = items.reduce((a, b) => a + (b.total_amount || 0), 0);

  const sumRow = sheet.addRow([
    "합계",
    "",
    "",
    "",
    "",
    sumMaterial,
    "",
    sumLabor,
    "",
    sumExpense,
    "",
    sumTotal,
    "",
  ]);

  // ⭐ 합계 행 높이
  sumRow.height = 20;

  sumRow.eachCell((cell) => {
    cell.border = allBorder;
    cell.font = { bold: true };
    cell.alignment = { horizontal: "right" };
    cell.numFmt = "#,###"; // ⭐ 콤마 자동 적용
  });

  // =========================
  // 7. 파일 다운로드
  // =========================
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=estimate_${id}.xlsx`
  );

  await workbook.xlsx.write(res);
  res.end();
});

// ==============================================
// 메인 화면
// ==============================================
app.get("/", (req, res) => {
  res.render("index"); // views/index.ejs 렌더링
});

// ==============================================
// 1. 견적관리 관련 라우트
// ==============================================

// ▷ 견적 목록 + 검색 + 페이징
app.get("/estimate", (req, res) => {
  const perPage = 16; // 한 페이지당 18개
  const rawPage = parseId(req.query.page || "1");
  let page = Number.isNaN(rawPage) ? 1 : rawPage; // 현재 페이지
  const searchQuery = (req.query.q || "").trim(); // 검색어 (견적명)

  // 검색어가 있으면 title LIKE '%검색어%' 로 조회
  const keyword = `%${searchQuery}%`;

  const countStmt = db.prepare(`
    SELECT COUNT(*) AS cnt
    FROM estimates
    WHERE title LIKE ?
  `);

  const listStmt = db.prepare(`
    SELECT *
    FROM estimates
    WHERE title LIKE ?
    ORDER BY id DESC
    LIMIT ?
    OFFSET ?
  `);

  const totalCount = countStmt.get(keyword).cnt; // 총 개수
  const totalPages =
    totalCount > 0 ? Math.ceil(totalCount / perPage) : 1;

  if (page < 1) page = 1;
  if (page > totalPages) page = totalPages;

  const offset = (page - 1) * perPage;

  const rows = listStmt.all(keyword, perPage, offset);

  // ---------- 번호(글번호) 재정렬 ----------
  // 가장 최신글이 번호 totalCount, 그 다음 totalCount-1 ... 이 되도록
  const startNumber = totalCount - offset;
  const estimates = rows.map((e, idx) => ({
    ...e,
    row_no: startNumber - idx, // 화면에 보이는 "번호"
  }));

  res.render("estimate_list", {
    estimates,
    currentPage: page,
    totalPages,
    searchQuery,
    totalCount,
    perPage,
  });
});

// ▷ 견적 신규 입력 폼
app.get("/estimate/new", (req, res) => {
  res.render("estimate_new"); // 신규 작성용 양식
});

// ▷ 견적 신규 저장 처리
app.post("/estimate", (req, res) => {
  const { title, client_name } = req.body;
  const items = normalizeItems(req.body.items);

  // 제목은 필수
  if (!title) return res.send("견적명은 필수입니다.");

  // 전체 견적금액 = 각 행의 total_amount 합계
  const totalAmount = calculateEstimateTotalAmount(items);

  // 트랜잭션으로 헤더 + 상세행 저장
  createEstimateTx(
    { title, client_name: client_name || null, total_amount: totalAmount },
    items
  );

  // 저장 후 목록으로 이동
  res.redirect("/estimate");
});

// ▷ 견적 수정 폼
app.get("/estimate/:id/edit", (req, res) => {
  const id = parseId(req.params.id);

  // 헤더 조회
  const estimate = getEstimate.get(id);
  if (!estimate) return res.status(404).send("존재하지 않는 견적입니다.");

  // 상세행 조회
  const items = getEstimateItems.all(id);

  // 화면에서 15행을 고정으로 사용하므로
  // 부족한 부분은 빈 행 객체를 채워서 넘김
  const rowCount = 15;
  const filled = fillItemsForEditView(items, rowCount);

  res.render("estimate_edit", { estimate, items: filled });
});

// ▷ 견적 수정 저장 처리
app.post("/estimate/:id/edit", (req, res) => {
  const id = parseId(req.params.id);

  // 기존 견적 존재 여부 확인
  const estimate = getEstimate.get(id);
  if (!estimate) return res.status(404).send("존재하지 않는 견적입니다.");

  const { title, client_name } = req.body;
  const items = normalizeItems(req.body.items);

  if (!title) return res.send("견적명은 필수입니다.");

  // 전체 견적금액 재계산
  const totalAmount = calculateEstimateTotalAmount(items);

  // 트랜잭션으로 헤더/상세 갱신
  updateEstimateTx(
    id,
    { title, client_name: client_name || null, total_amount: totalAmount },
    items
  );

  res.redirect("/estimate");
});

// ▷ 견적 복사 처리
// - confirm → fetch POST 요청을 받는 라우트
app.post("/estimate/:id/copy", (req, res) => {
  const id = parseId(req.params.id);
  try {
    // 복사만 수행
    copyEstimateTx(id);

    // ✅ 복사 후 목록 화면으로 이동
    res.redirect("/estimate");
  } catch (err) {
    console.error(err);
    res.status(500).send("복사 중 오류 발생");
  }
});

// ▷ 견적 삭제 처리
// - confirm → fetch POST 요청을 받는 라우트
app.post("/estimate/:id/delete", (req, res) => {
  const id = parseId(req.params.id);
  try {
    // 트랜잭션으로 상세행 + 헤더 삭제
    deleteEstimateTx(id);
    // 삭제 후 목록으로 이동
    res.redirect("/estimate");
  } catch (err) {
    console.error(err);
    res.status(500).send("삭제 중 오류 발생");
  }
});

// ▷ 견적 상세(읽기 전용 화면)
// - 목록에서 제목 클릭 시 이동
app.get("/estimate/:id", (req, res) => {
  const id = parseId(req.params.id);

  // 헤더 조회
  const estimate = getEstimate.get(id);
  if (!estimate) return res.status(404).send("존재하지 않는 견적입니다.");

  // 상세행 조회
  const items = getEstimateItems.all(id);

  // 읽기 전용 템플릿에 데이터 전달
  res.render("estimate_show", { estimate, items });
});

// ==============================================
// 서버 시작
// ==============================================
app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
