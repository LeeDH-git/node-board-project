// routes/authRoutes.js
const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../db"); // ✅ db.js (better-sqlite3) 연결
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

// 로그인 처리 (SQLite users 테이블 + bcrypt)
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  // 1) 입력값 최소 검증
  if (!username || !password) {
    return res.status(400).render("login", {
      title: "로그인",
      active: "login",
      headerTitle: "로그인",
      headerSub: "계정 정보를 입력하세요",
      error: "아이디와 비밀번호를 입력하세요.",
    });
  }

  // 2) 사용자 조회 (활성 계정만) + staff 이름 조인
  const user = db
    .prepare(
      `
    SELECT
      u.id,
      u.username,
      u.password_hash,
      u.role,
      u.is_active,
      s.name AS staff_name
    FROM users u
    LEFT JOIN staff s ON s.id = u.staff_id
    WHERE u.username = ?
    LIMIT 1
  `
    )
    .get(username);

  // 계정 없음 / 비활성
  if (!user || user.is_active !== 1) {
    return res.status(401).render("login", {
      title: "로그인",
      active: "login",
      headerTitle: "로그인",
      headerSub: "계정 정보를 입력하세요",
      error: "아이디 또는 비밀번호가 올바르지 않습니다.",
    });
  }

  // 3) bcrypt 비교
  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) {
    return res.status(401).render("login", {
      title: "로그인",
      active: "login",
      headerTitle: "로그인",
      headerSub: "계정 정보를 입력하세요",
      error: "아이디 또는 비밀번호가 올바르지 않습니다.",
    });
  }

  // 4) 세션 저장 (필요 최소 정보)
  req.session.user = {
    id: user.id,
    username: user.username,
    role: user.role,
    name: user.staff_name || user.username, // ✅ name이 있으면 그걸 우선
  };

  return res.redirect("/");
});

// 로그아웃
router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

module.exports = router;
