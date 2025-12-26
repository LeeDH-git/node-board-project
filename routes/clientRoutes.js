const express = require("express");
const clientService = require("../services/clientService");

const multer = require("multer");
const path = require("path");
const fs = require("fs");
const clientExcelService = require("../services/clientExcelService");
const { normalizeOriginalName } = require("../middlewares/utils/fileName"); // ✅ [추가] 파일명 정규화

const router = express.Router();

function parseId(param) {
  return parseInt(param, 10);
}

/* ============================
   ✅ [수정] multer 설정 (엑셀용 / 사업자등록증용 분리)
   - client_form.ejs가 multipart/form-data 이므로, create/edit POST에도 multer가 꼭 필요
   - 사업자등록증 저장 폴더: /uploads/bizcert
   - 엑셀 임시 폴더: /uploads/tmp
============================ */

// 1) 엑셀 임시 폴더
const tmpDir = path.join(__dirname, "../uploads/tmp");
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

// 2) 사업자등록증 저장 폴더
const bizDir = path.join(__dirname, "../uploads/bizcert");
if (!fs.existsSync(bizDir)) fs.mkdirSync(bizDir, { recursive: true });

// 엑셀 업로드(임시)
const uploadExcel = multer({
  dest: tmpDir,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// 사업자등록증 업로드(보관) - 확장자 유지 + filename은 랜덤(충돌 방지)
const bizStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, bizDir),
  filename: (req, file, cb) => {
    // ✅ [정규화] 한글 originalname 깨짐 복원 후 확장자 추출
    const original = normalizeOriginalName(file.originalname);
    const ext = path.extname(original);
    cb(null, `${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`);
  },
});

const uploadBiz = multer({
  storage: bizStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

/* ============================
   거래처 선택 팝업
============================ */
router.get("/picker", (req, res) => {
  const clients = clientService.listClients("", "1", 200).clients;
  res.render("client_picker", { clients, layout: false });
});

/* ============================
   엑셀 양식 다운로드
============================ */
router.get("/template", async (req, res) => {
  const wb = await clientExcelService.buildTemplateWorkbook();

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=client_template.xlsx"
  );

  await wb.xlsx.write(res);
  res.end();
});

/* ============================
   엑셀 업로드 (대량 등록)
============================ */
router.post("/upload", uploadExcel.single("file"), async (req, res) => {
  try {
    if (!req.file) throw new Error("엑셀 파일이 없습니다.");

    await clientExcelService.importClientsFromExcel(req.file.path);
    fs.unlink(req.file.path, () => {});

    res.redirect("/client");
  } catch (err) {
    if (req.file?.path) fs.unlink(req.file.path, () => {});
    res.status(400).send(err.message);
  }
});

/* ============================
   목록
============================ */
router.get("/", (req, res) => {
  const perPage = 16;
  const result = clientService.listClients(
    req.query.q || "",
    req.query.page || "1",
    perPage
  );

  res.render("client_list", {
    ...result,
    title: "거래처 관리",
    headerTitle: "거래처 관리",
    headerSub: "거래처 등록 / 검색 / 수정 / 삭제",
  });
});

/* ============================
   신규
============================ */
router.get("/new", (req, res) => {
  res.render("client_form", {
    mode: "create",
    pageTitle: "거래처 등록",
    client: {},
    active: "client",
    headerTitle: "거래처 등록",
    headerSub: "거래처 추가",
  });
});

// ✅ [수정] multipart/form-data 파싱 + 업로드 처리를 위해 multer 적용
router.post("/", uploadBiz.single("biz_cert"), (req, res) => {
  try {
    clientService.createClientFromRequest(req.body, req.file);
    res.redirect("/client");
  } catch (err) {
    res.status(400).send(err.message);
  }
});

/* ============================
   상세 보기 (READ ONLY)
============================ */
router.get("/:id", (req, res) => {
  const client = clientService.getClient(parseId(req.params.id));
  if (!client) return res.status(404).send("존재하지 않는 거래처입니다.");

  res.render("client_show", {
    pageTitle: "거래처 상세",
    client,
    active: "client",
    headerTitle: "거래처 상세",
    headerSub: client.name || "",
  });
});

/* ============================
   수정
============================ */
router.get("/:id/edit", (req, res) => {
  const client = clientService.getClient(parseId(req.params.id));
  if (!client) return res.status(404).send("존재하지 않는 거래처입니다.");

  res.render("client_form", {
    mode: "edit",
    pageTitle: "거래처 수정",
    client,
    active: "client",
    headerTitle: "거래처 관리",
    headerSub: "거래처 수정 및 관리",
  });
});

// ✅ [수정] 중복 POST 라우트 제거 + multer 적용 + 업데이트 후 redirect
router.post("/:id/edit", uploadBiz.single("biz_cert"), (req, res) => {
  try {
    clientService.updateClientFromRequest(
      parseId(req.params.id),
      req.body,
      req.file
    );
    res.redirect("/client");
  } catch (err) {
    res.status(400).send(err.message);
  }
});

/* ============================
   삭제
============================ */
router.post("/:id/delete", (req, res) => {
  clientService.deleteClient(parseId(req.params.id));
  res.redirect("/client");
});

module.exports = router;
