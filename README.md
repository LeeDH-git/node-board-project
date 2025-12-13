## README.md

```text

본 프로젝트는 Express + EJS + SQLite 기반의
현장 관리 시스템으로, 다음과 같은 계층 구조를 따른다.

- routes/
  : HTTP 요청 처리 및 화면 라우팅 (Controller 역할)

- services/
  : 비즈니스 로직 처리 계층
    (유효성 검사, 데이터 가공, 트랜잭션 흐름 제어)

- repositories/
  : SQLite DB 직접 접근 계층
    (CRUD 쿼리 전담)

- views/
  : EJS 기반 화면 템플릿
    OpenAI 콘솔 스타일 UI 적용

- uploads/
  : 계약서 PDF, 자료실 파일 저장소

- public/
  : 정적 리소스 (아이콘 등)

NODE-BOARD-PROJECT
├─ app.js                     # Express 서버 진입점
├─ app_old.js                 # 이전 버전 백업
├─ db.js                      # SQLite DB 연결 설정
├─ data.db                    # SQLite 데이터베이스 파일
├─ package.json
├─ package-lock.json
├─ README.md
├─ .gitignore
│
├─ public
│  └─ icons                   # UI 아이콘 이미지 리소스
│
├─ uploads                    # 업로드 파일 저장소
│  ├─ contracts               # 계약서 PDF 파일
│  └─ library                 # 자료실 파일
│
├─ repositories               # DB 접근 계층 (Repository)
│  ├─ estimateRepository.js
│  └─ contractRepository.js
│
├─ services                   # 비즈니스 로직 계층 (Service)
│  ├─ estimateService.js
│  ├─ estimateExcelService.js
│  ├─ contractService.js
│  └─ libraryService.js
│
├─ routes                     # 라우팅 / 컨트롤러 계층
│  ├─ estimateRoutes.js
│  ├─ contractRoutes.js
│  └─ libraryRoutes.js
│
└─ views                      # EJS View 템플릿
   ├─ layout.ejs              # 공통 레이아웃 (OpenAI 콘솔 스타일)
   ├─ index.ejs               # 메인 메뉴 화면
   │
   ├─ estimate_list.ejs       # 견적 목록
   ├─ estimate_new.ejs        # 견적 등록
   ├─ estimate_edit.ejs       # 견적 수정
   ├─ estimate_show.ejs       # 견적 상세
   │
   ├─ contract_list.ejs       # 계약 목록
   ├─ contract_form.ejs       # 계약 등록/수정 공용 폼
   ├─ contract_show.ejs       # 계약 상세
   │
   ├─ library_list.ejs        # 서식·자료실 목록
   ├─ library_form.ejs        # 자료 등록/수정
   └─ library_show.ejs        # 자료 상세
