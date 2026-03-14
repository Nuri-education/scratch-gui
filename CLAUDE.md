# 누리 스크래치 에디터

TurboWarp/scratch-gui 포크. 누리 AI 코딩 센터 플랫폼의 스크래치 실습 환경.

## 기반

- **TurboWarp/scratch-gui** 포크 (GPLv3)
- React + Redux + Webpack
- Node.js 20+

## 빌드 & 실행

```bash
npm install
npm start        # 개발 서버 → http://localhost:8601
npm run build    # 프로덕션 빌드 → build/
```

## 폴더 구조

```
src/
├── components/   # 프레젠테이션 컴포넌트
│   ├── gui/      # 전체 레이아웃
│   └── menu-bar/ # 상단 메뉴바 (누리 로고 등 커스텀)
├── containers/   # Redux-connected 컨테이너
├── lib/
│   ├── nuri-bridge.js       ← 누리 플랫폼 통신 (신규)
│   ├── vm-manager-hoc.jsx   ← nuri-bridge 초기화 지점
│   └── ...
└── reducers/
build/            # 빌드 결과물 (정적 파일)
```

## 누리 플랫폼 통신 규약 (postMessage)

### 에디터 → 부모 플랫폼 (송신)
| 타입 | 데이터 | 설명 |
|------|--------|------|
| `SCRATCH_READY` | — | VM 초기화 완료, 메시지 수신 준비됨 |
| `SCRATCH_SAVE` | `{ payload: string }` | base64 인코딩된 .sb3 파일 데이터 |
| `SCRATCH_LOADED` | — | 프로젝트 URL 로드 완료 |
| `SCRATCH_ERROR` | `{ error: string }` | 저장/로드 오류 |

### 부모 플랫폼 → 에디터 (수신)
| 타입 | 데이터 | 설명 |
|------|--------|------|
| `REQUEST_SAVE` | — | 현재 프로젝트를 .sb3로 저장 요청 |
| `LOAD_PROJECT_URL` | `{ url: string }` | 지정 URL에서 .sb3 템플릿 로드 |

### 구현 파일
- `src/lib/nuri-bridge.js` — 브릿지 전체 로직
- `src/lib/vm-manager-hoc.jsx` — `initNuriBridge()` / `destroyNuriBridge()` 호출

## 커스터마이징 가이드

### 메뉴바 로고 변경
`src/components/menu-bar/menu-bar.jsx` 에서 로고 이미지 교체

### 기능 제한 (학생 환경)
`src/components/menu-bar/menu-bar.jsx` 에서 불필요한 메뉴 항목 숨기기:
- 파일 > 공유하기 (숨기기)
- 투터리얼 (숨기기)

### iframe X-Frame-Options
배포 시 `vercel.json` (또는 Cloudflare Pages `_headers`) 에 헤더 설정 필요:
```
Content-Security-Policy: frame-ancestors *
```

## 배포

### Vercel
```bash
npx vercel --prod
```

`vercel.json` (루트에 있음):
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Content-Security-Policy", "value": "frame-ancestors *" }
      ]
    }
  ]
}
```

### 메인 플랫폼 연동
메인 플랫폼 `.env.local`:
```
NEXT_PUBLIC_SCRATCH_EDITOR_URL=https://scratch.nuri-coding.com
```

## 주의사항
- `npm run build` 후 `build/` 폴더를 배포 (SPA, `index.html` 엔트리)
- 개발 서버 포트: **8601** (scratch-gui 기본값)
- TurboWarp 원본 커밋을 upstream으로 유지해 업스트림 변경사항 머지 가능하게 유지
