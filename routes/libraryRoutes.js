// routes/libraryRoutes.js
const express = require("express");
const path = require("path");
const multer = require("multer");
const libraryService = require("../services/libraryService"); // 프로젝트 구조에 맞게 경로 확인

const router = express.Router();
const PER_PAGE = 15;

// 업로드 저장 경로
const storage = multer.diskStorage({
  destination: (req, file, cb) =>
    cb(null, path.join(__dirname, "..", "uploads", "library")),
  filename: (req, file, cb) => {
    const time = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `${time}${ext}`);
  },
});
const upload = multer({ storage });

function parseId(param) {
  return parseInt(param, 10);
}
function parsePage(param) {
  const p = parseInt(param, 10);
  if (Number.isNaN(p) || p < 1) return 1;
  return p;
}

// layout용 공통
router.use((req, res, next) => {
  res.locals.active = "library";
  res.locals.title = "현장 관리 시스템";
  res.locals.headerTitle = "서식 및 자료실";
  res.locals.headerSub = "서식/자료 업로드·검색·다운로드";
  next();
});

// 목록: GET /library?q=&type=&page=
router.get("/", (req, res) => {
  const q = req.query.q || "";
  const type = req.query.type || "all";
  const page = parsePage(req.query.page);

  const result = libraryService.list(q, type, page, PER_PAGE);
  res.render("library_list", {
    ...result,
    q,
    type,
    currentPage: page,
  });
});

// 신규 폼
router.get("/new", (req, res) => {
  res.render("library_form", { doc: null });
});

// 신규 저장
router.post("/", upload.single("file"), (req, res) => {
  try {
    libraryService.create(req.body, req.file);
    res.redirect("/library");
  } catch (e) {
    res.status(400).send(e.message);
  }
});

// 상세 보기
router.get("/:id", (req, res) => {
  const id = parseId(req.params.id);
  const doc = libraryService.get(id);
  if (!doc) return res.status(404).send("존재하지 않는 자료입니다.");

  const headerAction = `
    <a href="/library" class="btn">목록</a>
    <a href="/library/${doc.id}/edit" class="btn btn-primary">수정</a>
    <form action="/library/${doc.id}/delete" method="post" style="display:inline; margin:0;"
          onsubmit="return confirm('정말 삭제하시겠습니까?');">
      <button type="submit" class="btn btn-danger">삭제</button>
    </form>
  `;

  res.render("library_show", {
    doc,
    headerSub: "자료 정보 및 다운로드",
    headerAction, // ✅ layout 우측(빨간 박스)에 붙음
  });
});

// 수정 폼
router.get("/:id/edit", (req, res) => {
  const id = parseId(req.params.id);
  const doc = libraryService.get(id);
  if (!doc) return res.status(404).send("존재하지 않는 자료입니다.");
  res.render("library_form", { doc });
});

// 수정 저장
router.post("/:id/edit", upload.single("file"), (req, res) => {
  const id = parseId(req.params.id);
  try {
    libraryService.update(id, req.body, req.file);
    res.redirect(`/library/${id}`);
  } catch (e) {
    res.status(400).send(e.message);
  }
});

// 삭제
router.post("/:id/delete", (req, res) => {
  const id = parseId(req.params.id);
  try {
    libraryService.remove(id);
    res.redirect("/library");
  } catch (e) {
    res.status(500).send("삭제 중 오류가 발생했습니다.");
  }
});

module.exports = router;
