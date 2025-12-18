// routes/staffRoutes.js
const express = require("express");
const path = require("path");
const multer = require("multer");
const staffService = require("../services/staffService");

const router = express.Router();

const uploadDir = path.join(__dirname, "..", "uploads", "staff_certs");
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^\w.\-가-힣\s]/g, "_");
    const unique = `${Date.now()}_${Math.random()
      .toString(16)
      .slice(2)}_${safe}`;
    cb(null, unique);
  },
});
const upload = multer({ storage });

/** 목록 */
router.get("/", (req, res) => {
  const q = (req.query.q || "").trim();
  const active = req.query.active;
  const staffs = staffService.list({ q, active });
  res.render("staff_list", {
    headerTitle: "직원관리",
    headerSub: "직원 정보 관리",
    active: "staff",
    staffs,
    q,
    active: req.query.active,
  });
});

/** 신규(공용 폼) */
router.get("/new", (req, res) => {
  const staff = {
    id: null,
    name: "",
    role: "",
    daily_wage: "",
    start_date: "",
    end_date: "",
    is_active: 1,
  };
  res.render("staff_form", {
    title: "직원 등록",
    mode: "new",
    staff,
  });
});

/** 신규 저장 */
router.post("/", (req, res) => {
  const id = staffService.create(req.body);
  res.redirect(`/staff/${id}`);
});

/** 상세 */
router.get("/:id", (req, res) => {
  const id = Number(req.params.id);
  const staff = staffService.getDetail(id);
  if (!staff) return res.status(404).send("Not Found");
  res.render("staff_show", {
    title: "직원 상세",
    headerTitle: "직원관리",
    headerSub: "직원 상세 정보",
    active: "staff",
    staff,
  });
});

/** 수정(공용 폼) */
router.get("/:id/edit", (req, res) => {
  const id = Number(req.params.id);
  const staff = staffService.getDetail(id);
  if (!staff) return res.status(404).send("Not Found");

  // form에 certs 등 상세필드가 섞여도 문제는 없지만, 폼에서는 기본값만 쓰면 됨
  res.render("staff_form", {
    title: "직원 수정",
    mode: "edit",
    staff,
  });
});

/** 수정 저장 */
router.post("/:id", (req, res) => {
  const id = Number(req.params.id);
  staffService.update(id, req.body);
  res.redirect(`/staff/${id}`);
});

/** 재직/퇴사 토글 */
router.post("/:id/toggle-active", (req, res) => {
  const id = Number(req.params.id);
  staffService.toggleActive(id);
  res.redirect(`/staff/${id}`);
});

/** 자격증 파일 업로드(다중) */
router.post("/:id/certs", upload.array("cert_files", 20), (req, res) => {
  const id = Number(req.params.id);
  staffService.addCertFiles(id, req.files || []);
  res.redirect(`/staff/${id}`);
});

/** 자격증 파일 삭제 */
router.post("/:id/certs/:fileId/delete", (req, res) => {
  const staffId = Number(req.params.id);
  const fileId = Number(req.params.fileId);
  staffService.deleteCertFile(staffId, fileId);
  res.redirect(`/staff/${staffId}`);
});

module.exports = router;
