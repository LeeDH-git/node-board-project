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

// 라우터 불러오기
const estimateRouter = require("./routes/estimateRoutes");
const contractRouter = require("./routes/contractRoutes");
const libraryRouter = require("./routes/libraryRoutes");
const clientRouter = require("./routes/clientRoutes");
const progressRouter = require("./routes/progressRoutes");

// 로그인 세션
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true },
  })
);

// 로그인 정보를 모든 EJS에서 쓰도록
app.use((req, res, next) => {
  res.locals.me = req.session?.user || null;
  next();
});

// 메인 화면
app.get("/", (req, res) => {
  res.render("index", {
    title: "현장 관리 시스템",
    active: "home",
    headerTitle: "현장 관리 시스템",
    headerSub: "메뉴를 선택하세요",
    //headerAction: `<button class="btn btn-primary" onclick="location.href='/estimate'">Start</button>`
  });
});

// 도메인별 라우터 연결
app.use("/estimate", estimateRouter);
app.use("/contract", contractRouter);
app.use("/library", libraryRouter);
app.use("/client", clientRouter);
app.use("/progress", progressRouter);

// 서버 시작
app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
