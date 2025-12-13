const ExcelJS = require("exceljs");
const clientService = require("./clientService");

// 양식 다운로드용
async function buildTemplateWorkbook() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("거래처");

  ws.columns = [
    { header: "거래처명*", key: "name", width: 24 },
    { header: "사업자번호", key: "biz_no", width: 18 },
    { header: "대표자", key: "ceo_name", width: 14 },
    { header: "전화", key: "phone", width: 16 },
    { header: "이메일", key: "email", width: 22 },
    { header: "주소", key: "address", width: 30 },
    { header: "메모", key: "memo", width: 24 },
  ];

  // 헤더 강조(필수는 * 표시)
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).alignment = { vertical: "middle", horizontal: "center" };

  // 예시 1줄
  ws.addRow({
    name: "OO건설(주)",
    biz_no: "134-86-00379",
    ceo_name: "홍길동",
    phone: "010-1234-5678",
    email: "test@example.com",
    address: "경기도 용인시 처인구 ...",
    memo: "예시",
  });

  return wb;
}

// 업로드용(엑셀 -> 클라이언트 생성)
async function importClientsFromExcel(filepath) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filepath);

  const ws = wb.getWorksheet("거래처") || wb.worksheets[0];
  if (!ws) throw new Error("엑셀 시트가 없습니다.");

  // 1행: 헤더
  // 2행부터 데이터
  const rows = [];
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const name = (row.getCell(1).text || "").trim();
    const biz_no = (row.getCell(2).text || "").trim();
    const ceo_name = (row.getCell(3).text || "").trim();
    const phone = (row.getCell(4).text || "").trim();
    const email = (row.getCell(5).text || "").trim();
    const address = (row.getCell(6).text || "").trim();
    const memo = (row.getCell(7).text || "").trim();

    // 완전 빈 줄은 스킵
    if (!name && !biz_no && !phone && !ceo_name && !email && !address && !memo) return;

    rows.push({ name, biz_no, ceo_name, phone, email, address, memo, rowNumber });
  });

  if (rows.length === 0) throw new Error("업로드할 데이터가 없습니다.");

  // 검증: 거래처명 필수
  const errors = [];
  const payload = rows.map(r => {
    if (!r.name) errors.push(`row ${r.rowNumber}: 거래처명(필수)이 비어있습니다.`);
    return {
      name: r.name,
      biz_no: r.biz_no,
      ceo_name: r.ceo_name,
      phone: r.phone,
      email: r.email,
      address: r.address,
      memo: r.memo,
    };
  });

  if (errors.length) throw new Error(errors.slice(0, 20).join("\n"));

  // 저장(일괄)
  // clientService에 batch 메서드를 추가해도 되고,
  // 여기서 clientService.createClientFromRequest를 반복 호출해도 되지만,
  // 성능/원자성 때문에 batch 권장.
  return clientService.bulkCreateClients(payload);
}

module.exports = { buildTemplateWorkbook, importClientsFromExcel };
