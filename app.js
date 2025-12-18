// app.js  (리팩토링 후)

const express = require("express");
const session = require("express-session");
const path = require("path");

const app = express();
const PORT = 3000;

// 뷰 엔진 / 기본 설정
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

const expressLayouts = require("express-ejs-layouts");
app.use(expressLayouts);
app.set("layout", "layout"); // views/layout.ejs

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// 로그인 세션
app.use(
  session({
    secret: "change-this-to-a-long-random-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      // https 환경이면 true 권장
      secure: false,
    },
  })
);

// 로그인 정보를 모든 EJS에서 쓰도록
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  next();
});

// ✅ 로그인 필요 미들웨어
const requireAuth = (req, res, next) => {
  if (req.session?.user) return next();
  return res.redirect("/login");
};

// 라우터 불러오기
const authRouter = require("./routes/authRoutes"); // ✅ 추가
const estimateRouter = require("./routes/estimateRoutes");
const contractRouter = require("./routes/contractRoutes");
const libraryRouter = require("./routes/libraryRoutes");
const clientRouter = require("./routes/clientRoutes");
const progressRouter = require("./routes/progressRoutes");
const staffRouter = require("./routes/staffRoutes");

// ✅ 인증 라우터 연결
app.use("/", authRouter);

// ✅ 홈: 로그인한 사람만 접근
app.get("/", requireAuth, (req, res) => {
  res.render("index", {
    title: "현장 관리 시스템",
    active: "home",
    headerTitle: "현장 관리 시스템",
    headerSub: "메뉴를 선택하세요",
  });
});

// ✅ 도메인별 라우터 연결: 로그인 보호
app.use("/estimate", requireAuth, estimateRouter);
app.use("/contract", requireAuth, contractRouter);
app.use("/library", requireAuth, libraryRouter);
app.use("/client", requireAuth, clientRouter);
app.use("/progress", requireAuth, progressRouter);
app.use("/staff", requireAuth, staffRouter);

// 서버 시작
app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
