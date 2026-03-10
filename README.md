# AI 일정 비서 네이티브 앱

## 0) 현재 구현 상태
아래 기능은 **실제 코드로 구현되어 실행 가능**합니다.

### 서버 구현 기능
- `GET /health`: 서버 상태 확인
- `GET /api/calendar/events`: 일정 조회
- `POST /api/calendar/events`: 일정 생성 + 충돌 이벤트 반환
- `GET /api/mail/inbox`: 메일 목록 + 요약 + 영어 본문 번역(초기 버전)
- `POST /api/mail/:id/reply-draft`: 메일 답장 초안 생성
- `POST /api/mail/send`: 답장 발송(모의 발송) + 상태 업데이트
- `GET /api/assistant/brief`: 비서 브리핑(미응답/우선순위/Top3)
- `POST /api/slack/daily-brief`: Slack DM 브리핑용 메시지 생성(모의)

### 모바일 구현 기능
- 서버 데이터 로드(일정/메일/브리핑)
- 일정 생성 및 충돌 건수 확인
- 메일 요약/번역 결과 표시
- 답장 초안 생성 및 발송
- 비서 브리핑 카드 표시

---

## 1) 빠른 실행 (Mac)
```bash
./scripts/setup-mac.sh
```

실행 후 터미널 2개에서:
```bash
cd mobile && npm install && npx expo start
cd server && npm install && npm run dev
```

> 모바일 에뮬레이터/실기기에서 서버 호출이 안 되면 `mobile/App.tsx`의 `BASE_URL`을
> 본인 Mac IP(예: `http://192.168.0.10:4000`)로 변경하세요.

---

## 2) 수동 실행
### 2-1. 인프라
```bash
docker compose up -d
```

### 2-2. 서버
```bash
cd server
cp ../.env.example .env
npm install
npm run dev
```

### 2-3. 모바일
```bash
cd mobile
npm install
npx expo start
```

---

## 3) 파일 구조
- `mobile/App.tsx`: 앱 UI 및 API 연동
- `server/src/index.ts`: REST API 및 비서 로직
- `scripts/setup-mac.sh`: 원클릭 부트스트랩
- `docker-compose.yml`: Postgres/Redis 로컬 인프라
- `.env.example`: 서버 기본 환경변수

---

## 4) 다음 확장 우선순위
1. Microsoft Graph OAuth + 실제 Outlook 연동
2. Slack OAuth + 실제 DM 발송
3. DB 영속화(현재는 메모리 저장)
4. 실제 LLM 기반 번역/요약/우선순위 고도화
