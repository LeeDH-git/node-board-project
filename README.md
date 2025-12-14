## README.md

```text

주소: https://github.com/LeeDH-git/node-board-project.git

본 프로젝트는 Express + EJS + SQLite 기반의
현장 관리 시스템으로, 다음과 같은 계층 구조를 따른다.

1) routes/
   - HTTP 요청 처리 및 URL 라우팅
   - 화면 전환, 요청 파라미터 수신
   - Controller 역할

2) services/
   - 비즈니스 로직 계층
   - 유효성 검사
   - 자동 번호 생성 (est / ctr / prg)
   - 기성률 → 금액 계산
   - 트랜잭션 흐름 제어

3) repositories/
   - SQLite DB 직접 접근 계층
   - CRUD 전담
   - Prepared Statement 기반 쿼리 관리

4) views/
   - EJS 기반 화면 템플릿
   - 공통 레이아웃(layout.ejs) 사용
   - 계약/기성/견적 화면 UI 테마 통일

5) public/
   - 정적 리소스 (아이콘 등)

6) uploads/
   - 계약서 PDF 및 자료실 파일 저장소

NODE-BOARD-PROJECT
├─ app.js                     # Express 서버 진입점
├─ app_old.js                 # 이전 버전 백업
├─ db.js                      # SQLite DB 스키마 및 연결 설정
├─ data.db                    # SQLite 데이터베이스 파일
├─ package.json
├─ package-lock.json
├─ README.md
├─ .gitignore
│
├─ public
│  └─ icons                   # UI 아이콘 리소스
│
├─ uploads
│  ├─ contracts               # 계약서 PDF 파일
│  └─ library                 # 자료실 파일
│
├─ repositories               # DB 접근 계층
│  ├─ estimateRepository.js   # 견적 DB 처리
│  ├─ contractRepository.js   # 계약 DB 처리
│  └─ progressRepository.js   # 기성 DB 처리
│
├─ services                   # 비즈니스 로직 계층
│  ├─ estimateService.js
│  ├─ estimateExcelService.js
│  ├─ contractService.js
│  ├─ progressService.js
│  └─ libraryService.js
│
├─ routes                     # 라우팅 / 컨트롤러 계층
│  ├─ estimateRoutes.js
│  ├─ contractRoutes.js
│  ├─ progressRoutes.js
│  └─ libraryRoutes.js
│
└─ views                      # EJS View 템플릿
   ├─ layout.ejs              # 공통 레이아웃 (OpenAI 콘솔 스타일)
   ├─ index.ejs               # 메인 메뉴
   │
   ├─ estimate_list.ejs       # 견적 목록
   ├─ estimate_form.ejs       # 견적 등록/수정
   ├─ estimate_show.ejs       # 견적 상세
   ├─ estimate_print.ejs      # 견적 인쇄 전용 화면
   │
   ├─ contract_list.ejs       # 계약 목록
   ├─ contract_form.ejs       # 계약 등록/수정 공용 폼
   ├─ contract_show.ejs       # 계약 상세 (기성 이력 포함)
   │
   ├─ progress_list.ejs       # 기성 목록
   ├─ progress_form.ejs       # 기성 등록/수정
   ├─ progress_show.ejs       # 기성 상세
   │
   ├─ library_list.ejs        # 자료실 목록
   ├─ library_form.ejs        # 자료 등록/수정
   └─ library_show.ejs        # 자료 상세

