const express = require("express");
const clientService = require("../services/clientService");

const multer = require("multer");
const path = require("path");
const fs = require("fs");
const clientExcelService = require("../services/clientExcelService");

const router = express.Router();

function parseId(param) {
  return parseInt(param, 10);
}

/* ============================
   ✅ multer 초기화 (가장 위!)
============================ */
const uploadDir = path.join(__dirname, "../uploads/tmp");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  dest: uploadDir,
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
   엑셀 양식 다운로드 (✅ 하나만 유지)
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
   엑셀 업로드 (대량 등록) (✅ 하나만 사용)
============================ */
router.post("/upload", upload.single("file"), async (req, res) => {
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
    active: "client",
    headerTitle: "거래처 관리",
  });
});

/* ============================
   신규 / 수정 / 삭제
============================ */
router.get("/new", (req, res) => {
  res.render("client_form", {
    mode: "create",
    pageTitle: "거래처 등록",
    client: {},
    active: "client",
    headerTitle: "거래처 등록",
  });
});

router.post("/", (req, res) => {
  clientService.createClientFromRequest(req.body);
  res.redirect("/client");
});

router.get("/:id/edit", (req, res) => {
  const client = clientService.getClient(parseId(req.params.id));
  if (!client) return res.status(404).send("존재하지 않는 거래처입니다.");

  res.render("client_form", {
    mode: "edit",
    pageTitle: "거래처 수정",
    client,
    active: "client",
    headerTitle: "거래처 수정",
  });
});

router.post("/:id/edit", (req, res) => {
  clientService.updateClientFromRequest(parseId(req.params.id), req.body);
  res.redirect("/client");
});

router.post("/:id/delete", (req, res) => {
  clientService.deleteClient(parseId(req.params.id));
  res.redirect("/client");
});

module.exports = router;