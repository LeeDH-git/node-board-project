// 파일 업로드 미들웨어 생성기

const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { normalizeOriginalName, sanitizeFileName } = require("./fileName");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// dir: 업로드 저장 폴더 (예: /uploads/bizcert)
// field: input name (예: "biz_cert")
// options: { maxMB, keepOriginalExt }
function makeUploader({ dir, maxMB = 10, keepOriginalExt = true }) {
  ensureDir(dir);

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, dir),
    filename: (req, file, cb) => {
      // 1) 원본명 인코딩 복원
      const original = sanitizeFileName(
        normalizeOriginalName(file.originalname)
      );

      // 2) 확장자 유지(권장)
      const ext = keepOriginalExt ? path.extname(original) : "";

      // 3) 충돌 방지 파일명 생성
      const rand = crypto.randomBytes(12).toString("hex");
      cb(null, `${Date.now()}_${rand}${ext}`);
    },
  });

  return multer({
    storage,
    limits: { fileSize: maxMB * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      // 여기서 MIME 제한도 “전역 정책”으로 넣을 수 있음(선택)
      cb(null, true);
    },
  });
}

module.exports = { makeUploader };
