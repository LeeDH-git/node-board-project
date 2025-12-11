// app.js  (리팩토링 후)

const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

// 뷰 엔진 / 기본 설정
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// 라우터 불러오기
const estimateRouter = require("./routes/estimateRoutes");
const contractRouter = require("./routes/contractRoutes");

// 메인 화면
app.get("/", (req, res) => {
  res.render("index");
});

// 도메인별 라우터 연결
app.use("/estimate", estimateRouter);
app.use("/contract", contractRouter);

// 서버 시작
app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
