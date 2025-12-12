// services/estimateExcelService.js
const ExcelJS = require("exceljs");

async function buildEstimateWorkbook(estimate, items) {
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
  // 0. 열 너비 고정 설정
  // ============================================
  sheet.columns = [
    { width: 22 }, // 품명
    { width: 16 }, // 규격
    { width: 7 },  // 단위
    { width: 7 },  // 수량
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
  sheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
  sheet.getCell("A1").font = { size: 18, bold: true };
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

  sheet.getRow(3).height = 20;
  sheet.getRow(4).height = 20;

  // =========================
  // 3. 헤더 만들기
  // =========================
  const headerRow1 = ["품명","규격","단위","수량","재료비","","노무비","","경비","","합계","","비고"];
  const headerRow2 = ["","","","","단가","금액","단가","금액","단가","금액","단가","금액",""];

  sheet.addRow([]);
  const row6 = sheet.addRow(headerRow1);
  const row7 = sheet.addRow(headerRow2);

  row6.height = 22;
  row7.height = 20;

  sheet.mergeCells("A6:A7");
  sheet.mergeCells("B6:B7");
  sheet.mergeCells("C6:C7");
  sheet.mergeCells("D6:D7");
  sheet.mergeCells("E6:F6");
  sheet.mergeCells("G6:H6");
  sheet.mergeCells("I6:J6");
  sheet.mergeCells("K6:L6");
  sheet.mergeCells("M6:M7");

  [row6, row7].forEach((r) => {
    r.eachCell((cell) => {
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.font = { bold: true };
      cell.border = allBorder;
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDEEAF6" } };
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

    row.height = 18;

    row.eachCell((cell, colNum) => {
      cell.border = allBorder;

      if (colNum >= 5 && colNum <= 12 && !isNaN(cell.value)) {
        cell.alignment = { horizontal: "right", vertical: "middle" };
        cell.numFmt = "#,###";
      } else {
        cell.alignment = { horizontal: "left", vertical: "middle" };
      }
    });
  });

  // =========================
  // 5. 합계 행
  // =========================
  const sumMaterial = items.reduce((a, b) => a + (b.material_amount || 0), 0);
  const sumLabor = items.reduce((a, b) => a + (b.labor_amount || 0), 0);
  const sumExpense = items.reduce((a, b) => a + (b.expense_amount || 0), 0);
  const sumTotal = items.reduce((a, b) => a + (b.total_amount || 0), 0);

  const sumRow = sheet.addRow(["합계","","","","",sumMaterial,"",sumLabor,"",sumExpense,"",sumTotal,""]);
  sumRow.height = 20;

  sumRow.eachCell((cell) => {
    cell.border = allBorder;
    cell.font = { bold: true };
    cell.alignment = { horizontal: "right" };
    cell.numFmt = "#,###";
  });

  return workbook;
}

module.exports = { buildEstimateWorkbook };
