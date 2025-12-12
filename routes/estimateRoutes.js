// routes/estimateRoutes.js
const express = require("express");

const estimateService = require("../services/estimateService");
const estimateExcelService = require("../services/estimateExcelService");

const estimateRepo = require("../repositories/estimateRepository"); // 엑셀 다운로드용(조회만)

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

// 신규 폼
router.get("/new", (req, res) => {
  res.render("estimate_new");
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

// 수정 폼
router.get("/:id/edit", (req, res) => {
  const id = parseId(req.params.id);
  const detail = estimateService.getEstimateDetail(id, { fillRowCount: 15 });
  if (!detail) return res.status(404).send("존재하지 않는 견적입니다.");

  res.render("estimate_edit", detail);
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
