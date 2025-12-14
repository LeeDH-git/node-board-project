// routes/progressRoutes.js
const express = require("express");
const progressService = require("../services/progressService");
const contractRepo = require("../repositories/contractRepository");

const router = express.Router();

function parseId(param) {
  return parseInt(param, 10);
}

// 목록
router.get("/", async (req, res) => {
  try {
    const perPage = 16;
    const result = await progressService.listProgress(
      req.query.q || "",
      req.query.page || "1",
      perPage
    );
    res.render("progress_list", result);
  } catch (err) {
    console.error(err);
    res.status(500).send("목록 조회 중 오류");
  }
});

// 신규 폼
router.get("/new", (req, res) => {
  const contracts = contractRepo.findAllForSelect ? contractRepo.findAllForSelect() : [];

  res.render("progress_form", {
    mode: "create",
    pageTitle: "기성 등록",
    progress: {
      contract_id: req.query.contract_id || "",
      progress_month: "",
      progress_rate: "",
      progress_amount: "",
      note: "",
    },
    contracts,
  });
});

// 신규 저장
router.post("/", (req, res) => {
  try {
    progressService.createProgressFromRequest(req.body);
    res.redirect("/progress");
  } catch (err) {
    res.status(400).send(err.message);
  }
});

// 상세
router.get("/:id", (req, res) => {
  const id = parseId(req.params.id);
  const detail = progressService.getProgressDetail(id);
  if (!detail) return res.status(404).send("존재하지 않는 기성입니다.");
  res.render("progress_show", detail);
});

// 수정 폼
router.get("/:id/edit", (req, res) => {
  const id = parseId(req.params.id);
  const detail = progressService.getProgressDetail(id);
  if (!detail) return res.status(404).send("존재하지 않는 기성입니다.");

  const contracts = contractRepo.findAllForSelect ? contractRepo.findAllForSelect() : [];

  res.render("progress_form", {
    mode: "edit",
    pageTitle: "기성 수정",
    progress: detail.progress,
    contracts,
  });
});

// 수정 저장
router.post("/:id/edit", (req, res) => {
  const id = parseId(req.params.id);
  try {
    progressService.updateProgressFromRequest(id, req.body);
    res.redirect(`/progress/${id}`);
  } catch (err) {
    res.status(400).send(err.message);
  }
});

// 삭제
router.post("/:id/delete", (req, res) => {
  const id = parseId(req.params.id);
  try {
    progressService.deleteProgress(id);
    res.redirect("/progress");
  } catch (err) {
    res.status(500).send("삭제 중 오류");
  }
});

module.exports = router;
