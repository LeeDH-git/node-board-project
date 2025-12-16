const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();
const userRepo = require("../repositories/userRepository");

router.get("/login", (req, res) => {
  res.render("login", { error: null });
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await userRepo.findByUsername(username);
  if (!user)
    return res.render("login", {
      error: "아이디/비밀번호가 올바르지 않습니다.",
    });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok)
    return res.render("login", {
      error: "아이디/비밀번호가 올바르지 않습니다.",
    });

  req.session.user = { id: user.id, username: user.username, role: user.role };
  res.redirect("/");
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

module.exports = router;
