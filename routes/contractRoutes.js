// routes/contractRoutes.js

const express = require("express");
const path = require("path");
const multer = require("multer");
const contractService = require("../services/contractService");

const router = express.Router();
const PER_PAGE = 15;

// id 파싱 헬퍼
function parseId(param) {
  return parseInt(param, 10);
}

// page 파싱 헬퍼 (1 미만 방지)
function parsePage(param) {
  const p = parseInt(param, 10);
  if (Number.isNaN(p) || p < 1) return 1;
  return p;
}

// ===== multer: PDF 업로드 설정 =====
const contractStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "..", "uploads", "contracts"));
  },
  filename: (req, file, cb) => {
    const time = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `${time}${ext}`);
  },
});

const uploadContractPdf = multer({
  storage: contractStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("PDF 파일만 업로드 가능합니다."));
    }
    cb(null, true);
  },
});

// ================== 공통 locals (레이아웃용) ==================
router.use((req, res, next) => {
  // layout.ejs에서 메뉴 활성화/헤더에 사용
  res.locals.active = "contract";

  // 안전하게 기본값 제공 (layout.ejs에서 typeof 체크를 해도 되고, 이렇게 넣어도 됩니다)
  res.locals.title = "현장 관리 시스템";
  res.locals.headerTitle = "계약 관리";
  res.locals.headerSub = "하도급·자재·용역 계약서 관리";
  res.locals.headerAction = ""; // 필요 시 버튼 HTML 문자열 넣기

  next();
});

// ================== 라우트 ==================

// 목록 + 검색 + 페이징: GET /contract
router.get("/", (req, res) => {
  try {
    const q = req.query.q || "";
    const page = parsePage(req.query.page);

    const result = contractService.listContracts(q, String(page), PER_PAGE);

    // 리스트 화면 헤더/타이틀 세팅
    res.render("contract_list", {
      ...result,
      title: "계약 관리 | 현장 관리 시스템",
      headerTitle: "계약 관리",
      headerSub: "하도급·자재·용역 계약서 관리",
      // headerAction: `<a href="/contract/new" class="btn btn-primary">신규 계약 등록</a>`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("계약 목록 조회 중 오류가 발생했습니다.");
  }
});

// 신규 입력 폼: GET /contract/new
router.get("/new", (req, res) => {
  res.render("contract_form", {
    contract: null,
    title: "신규 계약 등록 | 현장 관리 시스템",
    headerTitle: "신규 계약 등록",
    headerSub: "계약 기본정보를 입력하고 저장하세요",
    // headerAction: `<a href="/contract" class="btn">목록</a>`,
  });
});

// 신규 저장: POST /contract
router.post("/", uploadContractPdf.single("pdf"), (req, res) => {
  try {
    contractService.createContractFromRequest(req.body, req.file);
    res.redirect("/contract");
  } catch (err) {
    res.status(400).send(err.message);
  }
});

// 상세 보기: GET /contract/:id
router.get("/:id", (req, res) => {
  const id = parseId(req.params.id);
  const contract = contractService.getContractDetail(id);

  if (!contract) {
    return res.status(404).send("존재하지 않는 계약입니다.");
  }

  res.render("contract_show", {
    contract,
    title: "계약 상세 | 현장 관리 시스템",
    headerTitle: "계약 상세",
    headerSub: contract.title || "계약 정보",
    // headerAction: `<a href="/contract/${id}/edit" class="btn btn-primary">수정</a>`,
  });
});

// 수정 폼: GET /contract/:id/edit
router.get("/:id/edit", (req, res) => {
  const id = parseId(req.params.id);
  const contract = contractService.getContractDetail(id);

  if (!contract) {
    return res.status(404).send("존재하지 않는 계약입니다.");
  }

  res.render("contract_form", {
    contract,
    title: "계약 수정 | 현장 관리 시스템",
    headerTitle: "계약 수정",
    headerSub: contract.title || "계약 내용 수정",
    // headerAction: `<a href="/contract/${id}" class="btn">상세</a>`,
  });
});

// 수정 저장: POST /contract/:id/edit
router.post("/:id/edit", uploadContractPdf.single("pdf"), (req, res) => {
  const id = parseId(req.params.id);
  try {
    contractService.updateContractFromRequest(id, req.body, req.file);
    res.redirect("/contract");
  } catch (err) {
    if (err.message.includes("존재하지 않는 계약")) {
      return res.status(404).send(err.message);
    }
    res.status(400).send(err.message);
  }
});

// 삭제: POST /contract/:id/delete
router.post("/:id/delete", (req, res) => {
  const id = parseId(req.params.id);
  try {
    contractService.deleteContract(id);
    res.redirect("/contract");
  } catch (err) {
    console.error(err);
    res.status(500).send("계약 삭제 중 오류가 발생했습니다.");
  }
});

module.exports = router;
