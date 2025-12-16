// routes/contractRoutes.js
const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const contractService = require("../services/contractService");

const router = express.Router();

// layout.ejs 사이드바 active 표시
router.use((req, res, next) => {
  res.locals.active = "contract";
  next();
});

// 업로드 폴더 (프로젝트 루트/uploads/contracts)
const uploadDir = path.join(__dirname, "..", "uploads", "contracts");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    cb(null, `${base}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") return cb(new Error("PDF만 업로드 가능합니다."));
    cb(null, true);
  },
});

// 목록
router.get("/", (req, res) => {
  const perPage = 10;
  const data = contractService.listContracts(req.query.q, req.query.page, perPage);

  res.render("contract_list", {
    ...data,
    title: "계약 관리 | 현장 관리 시스템",
    headerTitle: "계약 관리",
    headerSub: "하도급·자재·용역 계약서 관리",
    //headerAction: `<a href="/contract/new" class="btn btn-primary">신규 계약등록</a>`,
  });
});

// 신규 등록 화면
router.get("/new", (req, res) => {
  const year = new Date().getFullYear();
  const nextContractNo = contractService.getNextContractNo(year);

  res.render("contract_form", {
    title: "신규 계약 등록 | 현장 관리 시스템",
    headerTitle: "신규 계약 등록",
    headerSub: "계약 기본정보를 입력하고 저장하세요.",
    headerAction: `<a href="/contract" class="btn">목록</a>`,
    contract: null,
    nextContractNo,
    error: null,
  });
});

// 신규 등록 처리
router.post("/", upload.single("pdf"), (req, res) => {
  try {
    const id = contractService.createContractFromRequest(req.body, req.file);
    return res.redirect(`/contract/${id}`);
  } catch (err) {
    const year = new Date().getFullYear();
    const nextContractNo = contractService.getNextContractNo(year);

    return res.status(400).render("contract_form", {
      title: "신규 계약 등록 | 현장 관리 시스템",
      headerTitle: "신규 계약 등록",
      headerSub: "계약 기본정보를 입력하고 저장하세요.",
      headerAction: `<a href="/contract" class="btn">목록</a>`,
      contract: { ...req.body },
      nextContractNo,
      error: err.message,
    });
  }
});

// 상세
router.get("/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const detail = contractService.getContractDetail(id);

  if (!detail) return res.status(404).send("계약을 찾을 수 없습니다.");

  const headerAction = `
    <a href="/contract" class="btn">목록</a>
    <a href="/contract/${detail.id}/edit" class="btn">수정</a>
    <a href="/progress/new?contract_id=${detail.id}" class="btn btn-primary">기성 등록</a>
    <form action="/contract/${detail.id}/delete" method="post"
          onsubmit="return confirm('정말 이 계약을 삭제하시겠습니까?');"
          style="display:inline; margin:0;">
      <button type="submit" class="btn-danger">삭제</button>
    </form>
  `;

  res.render("contract_show", {
    title: "계약 상세 | 현장 관리 시스템",
    headerTitle: "계약 상세",
    headerSub: detail.title || "",
    headerAction,
    contract: detail,
  });
});

// 수정 화면
router.get("/:id/edit", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const detail = contractService.getContractDetail(id);

  if (!detail) return res.status(404).send("계약을 찾을 수 없습니다.");

  const headerAction = `
    <a href="/contract" class="btn">목록</a>
    <a href="/contract/${detail.id}" class="btn">상세</a>
    <form action="/contract/${detail.id}/delete" method="post"
          onsubmit="return confirm('정말 이 계약을 삭제하시겠습니까?');"
          style="display:inline; margin:0;">
      <button type="submit" class="btn-danger">삭제</button>
    </form>
  `;

  res.render("contract_form", {
    title: "계약 수정 | 현장 관리 시스템",
    headerTitle: "계약 수정",
    headerSub: "저장 시 기존 데이터가 업데이트됩니다.",
    headerAction,
    contract: detail,
    nextContractNo: null, // 수정은 contract.contract_no를 사용
    error: null,
  });
});

// 수정 처리
router.post("/:id/edit", upload.single("pdf"), (req, res) => {
  const id = parseInt(req.params.id, 10);

  try {
    contractService.updateContractFromRequest(id, req.body, req.file);
    return res.redirect(`/contract/${id}`);
  } catch (err) {
    const detail = contractService.getContractDetail(id);

    const headerAction = `
      <a href="/contract" class="btn">목록</a>
      <a href="/contract/${id}" class="btn">상세</a>
      <form action="/contract/${id}/delete" method="post"
            onsubmit="return confirm('정말 이 계약을 삭제하시겠습니까?');"
            style="display:inline; margin:0;">
        <button type="submit" class="btn-danger">삭제</button>
      </form>
    `;

    return res.status(400).render("contract_form", {
      title: "계약 수정 | 현장 관리 시스템",
      headerTitle: "계약 수정",
      headerSub: "저장 시 기존 데이터가 업데이트됩니다.",
      headerAction,
      contract: { ...(detail || {}), ...req.body, id },
      nextContractNo: null,
      error: err.message,
    });
  }
});

// 삭제
router.post("/:id/delete", (req, res) => {
  const id = parseInt(req.params.id, 10);
  contractService.deleteContract(id);
  res.redirect("/contract");
});

module.exports = router;
