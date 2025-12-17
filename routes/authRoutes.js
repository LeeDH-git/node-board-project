// routes/authRoutes.js
const express = require("express");
const router = express.Router();

// 로그인 화면
router.get("/login", (req, res) => {
  if (req.session?.user) return res.redirect("/");

  return res.render("login", {
    title: "로그인",
    active: "login",
    headerTitle: "로그인",
    headerSub: "계정 정보를 입력하세요",
    error: null,
  });
});

// 로그인 처리 (현재는 예시 계정)
// 나중에 SQLite 사용자 테이블로 교체하면 됨
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  const ok = username === "admin" && password === "1234";
  if (!ok) {
    return res.status(401).render("login", {
      title: "로그인",
      active: "login",
      headerTitle: "로그인",
      headerSub: "계정 정보를 입력하세요",
      error: "아이디 또는 비밀번호가 올바르지 않습니다.",
    });
  }

  req.session.user = { username };
  return res.redirect("/");
});

// 로그아웃
router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

module.exports = router;
