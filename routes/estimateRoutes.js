// routes/estimateRoutes.js
const express = require("express");

const estimateService = require("../services/estimateService");
const estimateExcelService = require("../services/estimateExcelService");

const estimateRepo = require("../repositories/estimateRepository"); // 엑셀 다운로드용(조회만)
const puppeteer = require("puppeteer");
const router = express.Router();

function parseId(param) {
  return parseInt(param, 10);
}

// 목록
router.get("/", async (req, res) => {
  try {
    const perPage = 16;
    const result = await estimateService.listEstimates(
      req.query.q || "",
      req.query.page || "1",
      perPage
    );

    res.render("estimate_list", result);
  } catch (err) {
    console.error(err);
    res.status(500).send("목록 조회 중 오류");
  }
});

// 신규 폼 (통합 폼)
router.get("/new", (req, res) => {
  const ROWS = 15;
  res.render("estimate_form", {
    mode: "create",
    pageTitle: "견적 등록",
    estimate: { title: "", client_name: "" },
    items: Array.from({ length: ROWS }, () => ({})),
  });
});

// 신규 저장
router.post("/", (req, res) => {
  try {
    estimateService.createEstimateFromRequest(req.body);
    res.redirect("/estimate");
  } catch (err) {
    res.status(400).send(err.message);
  }
});

// 수정 폼 (통합 폼)
router.get("/:id/edit", (req, res) => {
  const id = parseId(req.params.id);
  const detail = estimateService.getEstimateDetail(id, { fillRowCount: 15 });
  if (!detail) return res.status(404).send("존재하지 않는 견적입니다.");

  res.render("estimate_form", {
    ...detail,
    mode: "edit",
    pageTitle: "견적 수정",
  });
});

// 수정 저장
router.post("/:id/edit", (req, res) => {
  const id = parseId(req.params.id);
  try {
    estimateService.updateEstimateFromRequest(id, req.body);
    res.redirect("/estimate");
  } catch (err) {
    res.status(400).send(err.message);
  }
});

// 복사
router.post("/:id/copy", (req, res) => {
  const id = parseId(req.params.id);
  try {
    estimateService.copyEstimate(id);
    res.redirect("/estimate");
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

  res.render("estimate_show", detail);
});

//  인쇄 전용 페이지 (견적서만 출력)
router.get("/:id/print", (req, res) => {
  const id = parseId(req.params.id);
  const detail = estimateService.getEstimateDetail(id);
  if (!detail) return res.status(404).send("존재하지 않는 견적입니다.");

  // 레이아웃 없는 독립 문서(견적서만) 렌더
  res.render("estimate_print", detail);
});

// PDF 생성 (브라우저 헤더/푸터 없이 PDF 문서로 출력)
router.get("/:id/pdf", async (req, res) => {
  const id = parseId(req.params.id);

  // 존재 여부 확인(불필요한 크로미움 실행 방지)
  const detail = estimateService.getEstimateDetail(id);
  if (!detail) return res.status(404).send("존재하지 않는 견적입니다.");

  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const targetUrl = `${baseUrl}/estimate/${id}/print`;

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      // 서버/도커에서 막히면 아래 args를 켜세요
      // args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.goto(targetUrl, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      landscape: true,          // 너는 @page에서 landscape 쓰고 있으니 PDF도 동일하게
      printBackground: true,    // 파란 헤더 배경 등 색상 포함
      margin: { top: "12mm", right: "12mm", bottom: "12mm", left: "12mm" },
      displayHeaderFooter: false, // 상단/하단(시간/URL 같은) 없음
    });

    res.setHeader("Content-Type", "application/pdf");
    // inline: 브라우저에서 열기 / attachment: 다운로드
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

  const workbook = await estimateExcelService.buildEstimateWorkbook(
    estimate,
    items
  );

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
