//  업로드 파일명(한글) 깨짐 방지용 정규화 유틸

function normalizeOriginalName(name) {
  if (!name) return "";
  // multer/busboy 환경에서 latin1로 들어오는 한글 파일명 복원
  try {
    const fixed = Buffer.from(name, "latin1").toString("utf8");
    // 복원 결과에 대체문자(�)가 많이 생기면 원본 유지
    const bad = (fixed.match(/�/g) || []).length;
    return bad >= 2 ? name : fixed;
  } catch {
    return name;
  }
}

// (선택) 파일명에 들어가면 위험한 문자 제거 (윈도우/경로 안전)
function sanitizeFileName(name) {
  if (!name) return "";
  return name.replace(/[\\/:*?"<>|]/g, "_").trim();
}

module.exports = { normalizeOriginalName, sanitizeFileName };
