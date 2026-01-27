# Pi-Browser

**다중 AI 모델 기반 브라우저 자동화 CLI**

자연어 명령으로 브라우저를 제어합니다. Google Gemini, OpenAI, Anthropic Claude, Ollama 등 다양한 AI 모델을 지원합니다.

## 주요 기능

| 기능 | 설명 |
|------|------|
| **자연어 제어** | "쿠팡에서 아이폰 가격 알려줘" |
| **다중 AI 모델** | Gemini, GPT, Claude, Ollama 등 20+ 제공자 |
| **Extension 모드** | 기존 Chrome 로그인 상태 유지 |
| **병렬 처리** | 여러 브라우저로 동시 작업 |
| **로컬 AI** | Ollama로 오프라인 실행 |

## 빠른 시작

```bash
# 설치
git clone https://github.com/johunsang/pi-browser.git
cd pi-browser
npm install

# API 키 설정
cp .env.example .env
# .env 파일에 GOOGLE_API_KEY 입력

# 실행
npm start '네이버에서 오늘 날씨 알려줘'
```

## 실행 모드

### 1. 기본 모드 (CDP)

새 Chrome 인스턴스를 실행합니다.

```bash
npm start '쿠팡에서 아이폰 16 가격 알려줘'
npm start  # 대화형 모드
```

### 2. Extension 모드 (로그인 유지)

기존 Chrome의 로그인 상태를 유지합니다.

```bash
# Extension 설치 (최초 1회)
# 1. chrome://extensions 열기
# 2. 개발자 모드 ON
# 3. "압축해제된 확장 프로그램 로드" → extension 폴더 선택

# 실행
npm start /ext
> 네이버 메일에서 최근 메일 3개 제목 알려줘
> Gmail에서 안 읽은 메일 개수 알려줘
```

### 3. 병렬 모드 (Multi-Browser)

여러 브라우저로 동시에 작업합니다.

```bash
# 익명 브라우저 3개로 병렬 실행
npm start '/parallel 3 "구글에서 날씨" "네이버에서 뉴스" "다음에서 영화"'

# 프로필 브라우저로 병렬 실행 (로그인 유지)
npm start '/parallel "Default,Profile 1" "네이버 메일 확인" "Gmail 확인"'

# 프로필 목록 확인
npm start /profiles
```

#### 병렬 모드 비교

| 모드 | 명령 | 로그인 | 용도 |
|------|------|--------|------|
| 익명 | `/parallel 3 "작업"...` | 없음 | 검색, 크롤링 |
| 프로필 | `/parallel "P1,P2" "작업"...` | 유지 | 메일, SNS |

## 명령어

| 명령어 | 설명 |
|--------|------|
| `/ext` | Extension 모드 (로그인 유지) |
| `/parallel N "작업"...` | 익명 브라우저 N개 병렬 |
| `/parallel "프로필" "작업"...` | 프로필 브라우저 병렬 |
| `/profiles` | Chrome 프로필 목록 |
| `/models` | AI 모델 목록 |
| `/set <provider> <model>` | 모델 변경 |
| `/config` | 설정 확인 |
| `exit` | 종료 |

## AI 모델 설정

### 클라우드 모델

```bash
# Google Gemini (기본, 무료 티어 있음)
npm start '/set google gemini-2.5-flash'

# OpenAI
npm start '/set openai gpt-4o'

# Anthropic Claude
npm start '/set anthropic claude-sonnet-4-20250514'

# Groq (빠른 추론, 무료)
npm start '/set groq llama-3.3-70b-versatile'
```

### 로컬 모델 (Ollama)

```bash
# Ollama 설치 및 모델 다운로드
brew install ollama
ollama run llama3.2

# Pi-Browser에서 사용
npm start '/set ollama llama3.2'
npm start '구글 열어줘'
```

## 환경 변수

`.env` 파일:

```env
GOOGLE_API_KEY=your-google-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
OPENAI_API_KEY=your-openai-api-key
GROQ_API_KEY=your-groq-api-key
```

### API 키 발급

| 제공자 | 링크 | 무료 |
|--------|------|------|
| Google | [aistudio.google.com](https://aistudio.google.com/apikey) | O |
| Groq | [console.groq.com](https://console.groq.com/) | O |
| OpenAI | [platform.openai.com](https://platform.openai.com/api-keys) | X |
| Anthropic | [console.anthropic.com](https://console.anthropic.com/) | X |

## 브라우저 도구

AI가 사용하는 도구:

| 도구 | 설명 |
|------|------|
| `browser_navigate` | URL 이동 |
| `browser_click` | 요소 클릭 |
| `browser_fill` | 텍스트 입력 |
| `browser_press` | 키 입력 (Enter, Tab 등) |
| `browser_screenshot` | 스크린샷 |
| `browser_snapshot` | 페이지 요소 목록 |
| `browser_scroll` | 스크롤 |
| `browser_get_text` | 텍스트 추출 |
| `browser_wait` | 대기 (시간/텍스트) |
| `browser_download` | 파일 다운로드 |

## 사용 예시

```bash
# 쇼핑
npm start '쿠팡에서 에어팟 프로 가격 비교해줘'

# 정보 검색
npm start '네이버에서 서울 날씨 알려줘'

# SNS (Extension 모드)
npm start /ext
> 네이버 카페 옥토퍼스맨에 테스트 글 써줘

# 병렬 크롤링
npm start '/parallel 5 "사이트1 크롤링" "사이트2 크롤링" "사이트3 크롤링" "사이트4 크롤링" "사이트5 크롤링"'
```

## 프로젝트 구조

```
pi-browser/
├── src/cli.ts        # 메인 CLI
├── extension/        # Chrome Extension
│   ├── manifest.json
│   ├── background.js
│   └── popup.html
├── .env              # API 키
└── package.json
```

## 문제 해결

```bash
# Extension 연결 안됨
lsof -i :9876  # WebSocket 포트 확인

# Chrome 실행 안됨
lsof -i :9444  # CDP 포트 확인

# Ollama 연결 안됨
curl http://localhost:11434/api/tags
```

## 지원 AI 제공자

**클라우드**: Google, OpenAI, Anthropic, Mistral, Groq, xAI, OpenRouter, AWS Bedrock, Google Vertex

**로컬**: Ollama (Llama, Mistral, Qwen, Gemma 등)

## 라이선스

MIT License

## 크레딧

- [@mariozechner/pi-ai](https://github.com/nicklockwood/pi-ai) - 다중 AI 통합
- [Playwright](https://playwright.dev/) - 브라우저 자동화
