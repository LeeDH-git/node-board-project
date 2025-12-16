// routes/estimateRoutes.js
const express = require("express");

const estimateService = require("../services/estimateService");
const estimateExcelService = require("../services/estimateExcelService");

const estimateRepo = require("../repositories/estimateRepository"); // 엑셀 다운로드/번호 생성용(조회만)
const puppeteer = require("puppeteer");

const router = express.Router();

function parseId(param) {
  return parseInt(param, 10);
}

// layout.ejs 사이드바 active 표시
router.use((req, res, next) => {
  res.locals.active = "estimate";
  next();
});

// 목록
router.get("/", async (req, res) => {
  try {
    const perPage = 16;
    const result = await estimateService.listEstimates(
      req.query.q || "",
      req.query.page || "1",
      perPage
    );

    res.render("estimate_list", {
      ...result,
      title: "견적 관리 | 현장 관리 시스템",
      headerTitle: "견적 관리",
      headerSub: "공사별·거래처별 견적 등록 / 조회",
      //headerAction: `<a href="/estimate/new" class="btn btn-primary">견적 등록</a>`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("목록 조회 중 오류");
  }
});

// 신규 폼
router.get("/new", (req, res) => {
  const ROWS = 15;
  const year = new Date().getFullYear();
  const nextEstimateNo = estimateRepo.getNextEstimateNo(year);

  res.render("estimate_form", {
    title: "견적 등록 | 현장 관리 시스템",
    headerTitle: "견적 등록",
    headerSub: "견적 기본정보 및 내역을 입력하고 저장하세요.",
    headerAction: `<a href="/estimate" class="btn">목록</a>`,
    mode: "create",
    estimate: { title: "", client_name: "", estimate_no: nextEstimateNo },
    items: Array.from({ length: ROWS }, () => ({})),
    nextEstimateNo,
    error: null,
  });
});

// 신규 저장
router.post("/", (req, res) => {
  try {
    const id = estimateService.createEstimateFromRequest(req.body);
    // 기존 동작은 목록으로 갔지만, UX상 상세로 보내는 게 보통 자연스러움
    return res.redirect(`/estimate/${id}`);
  } catch (err) {
    const ROWS = 15;
    const year = new Date().getFullYear();
    const nextEstimateNo = estimateRepo.getNextEstimateNo(year);

    return res.status(400).render("estimate_form", {
      title: "견적 등록 | 현장 관리 시스템",
      headerTitle: "견적 등록",
      headerSub: "견적 기본정보 및 내역을 입력하고 저장하세요.",
      headerAction: `<a href="/estimate" class="btn">목록</a>`,
      mode: "create",
      estimate: { ...req.body, estimate_no: nextEstimateNo },
      items: Array.isArray(req.body.items) ? req.body.items : (req.body.items ? Object.values(req.body.items) : []),
      nextEstimateNo,
      error: err.message,
    });
  }
});

// 수정 폼
router.get("/:id/edit", (req, res) => {
  const id = parseId(req.params.id);
  const detail = estimateService.getEstimateDetail(id, { fillRowCount: 15 });
  if (!detail) return res.status(404).send("존재하지 않는 견적입니다.");

  const headerAction = `
    <a href="/estimate" class="btn">목록</a>
    <a href="/estimate/${id}" class="btn">상세</a>
  `;

  res.render("estimate_form", {
    title: "견적 수정 | 현장 관리 시스템",
    headerTitle: "견적 수정",
    headerSub: "저장 시 기존 데이터가 업데이트됩니다.",
    headerAction,
    ...detail,
    mode: "edit",
    nextEstimateNo: null,
    error: null,
  });
});

// 수정 저장
router.post("/:id/edit", (req, res) => {
  const id = parseId(req.params.id);

  try {
    estimateService.updateEstimateFromRequest(id, req.body);
    return res.redirect(`/estimate/${id}`);
  } catch (err) {
    const detail = estimateService.getEstimateDetail(id, { fillRowCount: 15 });

    const headerAction = `
      <a href="/estimate" class="btn">목록</a>
      <a href="/estimate/${id}" class="btn">상세</a>
    `;

    return res.status(400).render("estimate_form", {
      title: "견적 수정 | 현장 관리 시스템",
      headerTitle: "견적 수정",
      headerSub: "저장 시 기존 데이터가 업데이트됩니다.",
      headerAction,
      estimate: { ...(detail?.estimate || {}), ...req.body, id },
      items: Array.isArray(req.body.items) ? req.body.items : (req.body.items ? Object.values(req.body.items) : []),
      mode: "edit",
      nextEstimateNo: null,
      error: err.message,
    });
  }
});

// 복사
router.post("/:id/copy", (req, res) => {
  const id = parseId(req.params.id);
  try {
    const newId = estimateService.copyEstimate(id);
    return res.redirect(`/estimate/${newId}`);
  } catch (err) {
    res.status(500).send("복사 중 오류");
  }
});

// 삭제
router.post("/:id/delete", (req, res) => {
  const id = parseId(req.params.id);
  try {
    estimateService.deleteEstimate(id);
    res.redirect("/estimate");
  } catch (err) {
    res.status(500).send("삭제 중 오류");
  }
});

// 상세 보기
router.get("/:id", (req, res) => {
  const id = parseId(req.params.id);
  const detail = estimateService.getEstimateDetail(id);
  if (!detail) return res.status(404).send("존재하지 않는 견적입니다.");

  const headerAction = `
    <a href="/estimate" class="btn">목록</a>
    <a href="/estimate/${id}/edit" class="btn">수정</a>
    <a href="/estimate/${id}/pdf" class="btn btn-primary" target="_blank">PDF 출력</a>
    <a href="/estimate/${id}/excel" class="btn">엑셀</a>
    <form action="/estimate/${id}/delete" method="post"
          onsubmit="return confirm('정말로 이 견적을 삭제하시겠습니까?');"
          style="display:inline; margin:0;">
      <button type="submit" class="btn-danger">삭제</button>
    </form>
  `;

  res.render("estimate_show", {
    ...detail,
    title: "견적 상세 | 현장 관리 시스템",
    headerTitle: "견적 상세",
    headerSub: detail.estimate?.title || "",
    headerAction,
  });
});

// 인쇄 전용 페이지(레이아웃 없음)
router.get("/:id/print", (req, res) => {
  const id = parseId(req.params.id);
  const detail = estimateService.getEstimateDetail(id);
  if (!detail) return res.status(404).send("존재하지 않는 견적입니다.");
  res.render("estimate_print", detail);
});

// PDF 생성
router.get("/:id/pdf", async (req, res) => {
  const id = parseId(req.params.id);

  const detail = estimateService.getEstimateDetail(id);
  if (!detail) return res.status(404).send("존재하지 않는 견적입니다.");

  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const targetUrl = `${baseUrl}/estimate/${id}/print`;

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      // args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.goto(targetUrl, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      landscape: true,
      printBackground: true,
      margin: { top: "12mm", right: "12mm", bottom: "12mm", left: "12mm" },
      displayHeaderFooter: false,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="estimate_${id}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).send("PDF 생성 중 오류");
  } finally {
    if (browser) await browser.close();
  }
});

// 엑셀 다운로드
router.get("/:id/excel", async (req, res) => {
  const id = parseId(req.params.id);

  const estimate = estimateRepo.findById(id);
  if (!estimate) return res.status(404).send("존재하지 않는 견적입니다.");

  const items = estimateRepo.findItemsByEstimateId(id);

  const workbook = await estimateExcelService.buildEstimateWorkbook(estimate, items);

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

module.exports = router;
