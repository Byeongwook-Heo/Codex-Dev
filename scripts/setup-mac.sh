#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "[ERROR] '$1' 명령이 필요합니다. 설치 후 다시 실행해주세요."
    exit 1
  fi
}

echo "[1/6] 필수 도구 확인"
need_cmd node
need_cmd npm
need_cmd docker

if ! docker info >/dev/null 2>&1; then
  echo "[ERROR] Docker Desktop이 실행 중인지 확인해주세요."
  exit 1
fi

echo "[2/6] 로컬 인프라 시작 (PostgreSQL/Redis)"
docker compose -f "$ROOT_DIR/docker-compose.yml" up -d

echo "[3/6] 모바일 앱 준비"
if [ ! -d "$ROOT_DIR/mobile" ]; then
  echo "- Expo 앱 생성 중..."
  npx create-expo-app@latest "$ROOT_DIR/mobile" --yes
else
  echo "- mobile 디렉터리가 이미 존재하여 생성 단계를 건너뜁니다."
fi

echo "[4/6] 백엔드 서버 준비"
if [ ! -f "$ROOT_DIR/server/package.json" ]; then
  cat > "$ROOT_DIR/server/package.json" <<'JSON'
{
  "name": "ai-assistant-server",
  "version": "0.1.0",
  "private": true,
  "type": "commonjs",
  "scripts": {
    "dev": "nodemon --watch src --exec ts-node src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^22.5.4",
    "nodemon": "^3.1.4",
    "ts-node": "^10.9.2",
    "typescript": "^5.5.4"
  }
}
JSON
fi

if [ ! -f "$ROOT_DIR/server/tsconfig.json" ]; then
  cat > "$ROOT_DIR/server/tsconfig.json" <<'JSON'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
JSON
fi

if [ ! -f "$ROOT_DIR/server/src/index.ts" ]; then
  cat > "$ROOT_DIR/server/src/index.ts" <<'TS'
import cors from "cors";
import dotenv from "dotenv";
import express from "express";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "ai-assistant-server" });
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
TS
fi

cp -n "$ROOT_DIR/.env.example" "$ROOT_DIR/server/.env" 2>/dev/null || true

echo "[5/6] 패키지 설치"
( cd "$ROOT_DIR/mobile" && npm install )
( cd "$ROOT_DIR/server" && npm install )

echo "[6/6] 완료"
echo
echo "다음 단계:"
echo "  1) 터미널 A: cd mobile && npx expo start"
echo "  2) 터미널 B: cd server && npm run dev"
echo "  3) API 상태 확인: curl http://localhost:4000/health"
