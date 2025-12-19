// routes/progressRoutes.js
const express = require("express");
const progressService = require("../services/progressService");
const contractRepo = require("../repositories/contractRepository");

const router = express.Router();

function parseId(param) {
  return parseInt(param, 10);
}

// sidebar active
router.use((req, res, next) => {
  res.locals.active = "progress";
  next();
});

// 목록
router.get("/", async (req, res) => {
  try {
    const perPage = 16;

    const result = await progressService.listProgress(
      req.query.q || "",
      req.query.page || "1",
      perPage
    );

    return res.render("progress_list", {
      ...result,
      title: "기성 관리 | 현장 관리 시스템",
      headerTitle: "기성 관리",
      headerSub: "계약별 기성 등록 / 누적 현황 조회",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send("목록 조회 중 오류");
  }
});

// 신규 폼
router.get("/new", (req, res) => {
  const contracts = contractRepo.findAllForSelect
    ? contractRepo.findAllForSelect()
    : [];

  const selectedContractId = req.query.contract_id || "";
  const base = selectedContractId
    ? progressService.getContractProgressBase(selectedContractId)
    : null;

  return res.render("progress_form", {
    title: "기성 등록 | 현장 관리 시스템",
    headerTitle: "기성 등록",
    headerSub: "기성은 회차별로 등록되며, 누적률은 자동 계산됩니다.",
    headerAction: `<a href="/progress" class="btn">목록</a>`,
    mode: "create",
    progress: {
      contract_id: selectedContractId,
      progress_round: "", // ✅ 추가
      progress_month: "",
      progress_amount: "",
      note: "",
    },
    contracts,
    base,
    error: null,
  });
});

// 신규 저장
router.post("/", (req, res) => {
  try {
    const id = progressService.createProgressFromRequest(req.body);
    return res.redirect(`/progress/${id}`);
  } catch (err) {
    const contracts = contractRepo.findAllForSelect
      ? contractRepo.findAllForSelect()
      : [];
    const base = req.body.contract_id
      ? progressService.getContractProgressBase(req.body.contract_id)
      : null;

    return res.status(400).render("progress_form", {
      title: "기성 등록 | 현장 관리 시스템",
      headerTitle: "기성 등록",
      headerSub: "기성은 회차별로 등록되며, 누적률은 자동 계산됩니다.",
      headerAction: `<a href="/progress" class="btn">목록</a>`,
      mode: "create",
      progress: { ...req.body },
      contracts,
      base,
      error: err.message,
    });
  }
});

// 상세
router.get("/:id", (req, res) => {
  const id = parseId(req.params.id);
  const detail = progressService.getProgressDetail(id);
  if (!detail) return res.status(404).send("존재하지 않는 기성입니다.");

  return res.render("progress_show", {
    ...detail,
    title: "기성 상세 | 현장 관리 시스템",
    headerTitle: "기성 상세",
    headerSub: "기성 정보 및 누적 현황",
    headerAction: `
      <a href="/progress" class="btn">목록</a>
      <a href="/progress/${id}/edit" class="btn">수정</a>
      <form method="post" action="/progress/${id}/delete" style="display:inline;" onsubmit="return confirm('삭제하시겠습니까?');">
        <button class="btn btn-danger" type="submit">삭제</button>
      </form>
    `,
  });
});

// 수정 폼
router.get("/:id/edit", (req, res) => {
  const id = parseId(req.params.id);
  const detail = progressService.getProgressDetail(id);
  if (!detail) return res.status(404).send("존재하지 않는 기성입니다.");

  const contracts = contractRepo.findAllForSelect
    ? contractRepo.findAllForSelect()
    : [];

  const base = detail.progress.contract_id
    ? progressService.getContractProgressBase(detail.progress.contract_id)
    : null;

  return res.render("progress_form", {
    title: "기성 수정 | 현장 관리 시스템",
    headerTitle: "기성 수정",
    headerSub: "저장 시 누적 기성률이 자동으로 재계산됩니다.",
    headerAction: `
      <a href="/progress" class="btn">목록</a>
      <a href="/progress/${id}" class="btn">상세</a>
    `,
    mode: "edit",
    progress: detail.progress,
    contracts,
    base,
    error: null,
  });
});

// 수정 저장
router.post("/:id/edit", (req, res) => {
  const id = parseId(req.params.id);
  try {
    progressService.updateProgressFromRequest(id, req.body);
    return res.redirect(`/progress/${id}`);
  } catch (err) {
    const detail = progressService.getProgressDetail(id);
    const contracts = contractRepo.findAllForSelect
      ? contractRepo.findAllForSelect()
      : [];
    const base = req.body.contract_id
      ? progressService.getContractProgressBase(req.body.contract_id)
      : null;

    return res.status(400).render("progress_form", {
      title: "기성 수정 | 현장 관리 시스템",
      headerTitle: "기성 수정",
      headerSub: "저장 시 누적 기성률이 자동으로 재계산됩니다.",
      headerAction: `
        <a href="/progress" class="btn">목록</a>
        <a href="/progress/${id}" class="btn">상세</a>
      `,
      mode: "edit",
      progress: { ...(detail ? detail.progress : {}), ...req.body, id },
      contracts,
      base,
      error: err.message,
    });
  }
});

// 삭제
router.post("/:id/delete", (req, res) => {
  const id = parseId(req.params.id);
  try {
    progressService.deleteProgress(id);
    return res.redirect("/progress");
  } catch (err) {
    console.error(err);
    return res.status(500).send("삭제 중 오류");
  }
});

module.exports = router;
