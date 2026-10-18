# Render PostgreSQL 연결

현재 서비스는 `https://helldivers2.onrender.com`, Oregon 리전입니다. 기존 웹 서비스는 재사용하고 별도 PostgreSQL을 같은 리전에 연결합니다.

## 기존 서비스 설정

- Build Command: `npm ci && npm run build`
- Start Command: `npm run start:render`
- Health Check Path: `/api/health`
- `NODE_VERSION=22`
- `DATABASE_URL`: DB의 **Internal Database URL** (비공개 환경변수)
- `COOKIE_SECURE=true`
- `APP_ORIGIN=https://helldivers2.onrender.com` (미설정 시 Render 주소 자동 사용)
- `DEMO_AUTH_ENABLED=false`: 외부 서비스에서는 카카오 로그인 사용
- `SEED_PASSWORD`: 최초 예시 계정의 비밀번호. 운영용에서는 충분히 긴 임의 값 사용

`start:render`는 스키마를 초기화하고 `0.0.0.0:$PORT`로 실행합니다. DB 주소가 없으면 임시 파일 저장소로 대신 실행하지 않고 오류를 반환합니다. `/api/health`는 실제 DB 연결을 확인하며 개인정보와 비밀키를 반환하지 않습니다.

카카오를 실제 사용하려면 `KAKAO_REST_API_KEY`, `KAKAO_CLIENT_SECRET` 및 `https://helldivers2.onrender.com/api/auth/kakao/callback`을 카카오 개발자 앱에 등록해야 합니다. DB 연결만으로 카카오 앱 설정이 완료되지는 않습니다. 운영자 계정의 카카오 연결 및 임시 로그인 종료는 별도로 확인해야 합니다.

## 로컬 개발

`.env.local`의 `DATABASE_URL`을 로컬 PostgreSQL 주소로 설정하면 기존 JSON 대신 DB를 사용합니다. 로컬 개발 DB와 Render 운영 DB는 분리합니다. 현재 PC의 개발 DB는 PostgreSQL 17, `127.0.0.1:55432`입니다. 접속 비밀값은 `.env.local`에만 보관합니다.

```powershell
# 현재 PC의 로컬 PostgreSQL 시작 (이미 실행 중이면 생략)
& './work/pg-runtime/pgsql/bin/pg_ctl.exe' -D './work/pg-dev-data' -l './work/pg-local.log' -o '-h 127.0.0.1 -p 55432' -w start
npm run db:migrate
npm run dev
```

로컬 설치 파일은 공식 EDB PostgreSQL 바이너리이며 `work/`에 있어 Git에는 포함되지 않습니다. 다른 PC에서는 PostgreSQL 17을 설치하거나 Docker의 공식 PostgreSQL 이미지를 사용한 뒤 해당 PC의 접속 주소를 설정합니다.

외부 Render DB에 직접 접속할 필요가 있는 경우 External Database URL과 허용된 클라이언트 IP를 사용합니다. 외부 연결은 TLS 인증서를 검증하며, DB URL은 저장소나 채팅에 올리지 않습니다. 운영 서버는 Internal Database URL을 사용하며 외부 접근은 기본 차단합니다.

## 초기화와 JSON 이전

```bash
npm run db:migrate
npm run db:import -- data/db.json
npm run test:postgres
```

가져오기는 비어 있는 DB에서만 실행되며 기존 DB를 덮어쓰지 않습니다. 세션과 카카오 가입 대기 티켓은 이전하지 않아 재로그인이 필요합니다. 원본 JSON은 그대로 유지합니다. 현재 로컬 예시 데이터는 이미 개발 DB에 이전했습니다.

`users`, `posts`, `comments`, `votes`, `requests`, `sessions`, `audit`, `pendingRegistrations`는 각각 `hd_` 접두어의 별도 테이블에 저장됩니다. 기존 기능의 필드를 유지하기 위해 각 레코드의 데이터는 JSONB 컬럼을 사용합니다. 회원 로그인 ID·카카오 ID에는 고유 인덱스가 있고 게시판·댓글·세션 조회용 인덱스가 있습니다. 관리용 테이블 `hd_meta`에는 스키마 정보와 트랜잭션 잠금 행이 있습니다.

현재 도메인 API와의 호환을 위해 트랜잭션에서 컬렉션을 읽고 변경된 레코드만 저장합니다. 여러 서버 프로세스 간에는 DB 행 잠금으로 경쟁을 방지합니다. 작은 커뮤니티를 위한 구현이며 대규모 데이터에서는 목록/검색을 SQL로 옮기는 추가 최적화가 필요합니다. 실패한 요청의 본문 변경은 롤백하지만 견습회원 만료 처리는 보존합니다.

## 배포 템플릿

`render.yaml`은 **새 서비스 생성용 예시**입니다. 기존 서비스를 대체하거나 중복 생성하기 위해 적용하지 않습니다. 기존 웹 서비스의 현재 컴퓨트 요금제는 유지합니다. DB 요금제와 저장 용량은 생성 전 확인합니다. 저장 용량 자동 확장은 기본 꺼져 있습니다.

GitHub Pages는 계속 화면 확인용으로 유지되며 PostgreSQL 접속 코드·실제 데이터·환경변수는 정적 번들에 포함되지 않습니다.
