const express = require("express");
const multer = require("multer");
const path = require("path");
const { requireAdmin } = require("../middleware/auth");
const employeeService = require("../services/employeeService");

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "photo") cb(null, "uploads/employees/photos");
    else cb(null, "uploads/employees/certs");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + "_" + Math.random().toString(16).slice(2) + ext);
  },
});

const upload = multer({ storage });

router.get("/", requireAdmin, async (req, res) => {
  const list = await employeeService.listEmployees();
  res.render("employee_list", { employees: list });
});

router.get("/new", requireAdmin, (req, res) => {
  res.render("employee_form", { employee: null, error: null });
});

// photo 1개 + certFiles 여러개
router.post(
  "/",
  requireAdmin,
  upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "certFiles", maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      await employeeService.createEmployee(req.body, req.files);
      res.redirect("/employee");
    } catch (e) {
      res.render("employee_form", { employee: req.body, error: e.message });
    }
  }
);

module.exports = router;
