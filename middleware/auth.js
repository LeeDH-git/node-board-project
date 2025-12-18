// // middleware/auth.js
// function requireAdmin(req, res, next) {
//   const u = req.session.user;
//   if (!u) return res.redirect("/admin/login");
//   if (u.role !== "admin") return res.status(403).send("Forbidden");
//   if (u.is_active !== 1) return res.redirect("/admin/login");
//   next();
// }

// module.exports = { requireAdmin };
