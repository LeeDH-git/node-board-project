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

// ================== 라우트 ==================

// 목록 + 검색 + 페이징: GET /contract
router.get("/", (req, res) => {
  try {
    const result = contractService.listContracts(
      req.query.q || "",
      req.query.page || "1",
      PER_PAGE
    );
    res.render("contract_list", result);
  } catch (err) {
    console.error(err);
    res.status(500).send("계약 목록 조회 중 오류가 발생했습니다.");
  }
});

// 신규 입력 폼: GET /contract/new
router.get("/new", (req, res) => {
  res.render("contract_form", { contract: null });
});

// 신규 저장: POST /contract
router.post(
  "/",
  uploadContractPdf.single("pdf"),
  (req, res) => {
    try {
      contractService.createContractFromRequest(req.body, req.file);
      res.redirect("/contract");
    } catch (err) {
      res.status(400).send(err.message);
    }
  }
);

// 상세 보기: GET /contract/:id
router.get("/:id", (req, res) => {
  const id = parseId(req.params.id);
  const contract = contractService.getContractDetail(id);

  if (!contract) {
    return res.status(404).send("존재하지 않는 계약입니다.");
  }

  res.render("contract_show", { contract });
});

// 수정 폼: GET /contract/:id/edit
router.get("/:id/edit", (req, res) => {
  const id = parseId(req.params.id);
  const contract = contractService.getContractDetail(id);

  if (!contract) {
    return res.status(404).send("존재하지 않는 계약입니다.");
  }

  res.render("contract_form", { contract });
});

// 수정 저장: POST /contract/:id/edit
router.post(
  "/:id/edit",
  uploadContractPdf.single("pdf"),
  (req, res) => {
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
  }
);

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
