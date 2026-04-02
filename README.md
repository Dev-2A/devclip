# 🌐 DevClip

웹 페이지의 코드 블록을 원클릭 복사하고, 스니펫으로 로컬 저장·태그·검색하는 개발자용 Chrome 익스텐션입니다.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue?logo=googlechrome&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

### 📋 원클릭 코드 복사 & 저장

웹 페이지의 `<pre>` 코드 블록 위에 마우스를 올리면 **복사/저장 버튼**이 자동으로 나타납니다.
클릭 한 번으로 클립보드 복사 또는 로컬 저장이 완료됩니다.

### 🗣️ 언어 자동 감지

클래스명 기반 감지에 더해, 코드 내용을 분석하여 **20개 이상의 언어를 자동 추론**합니다.
Python, JavaScript, TypeScript, Java, Go, Rust, SQL, Bash, Dockerfile 등을 지원합니다.

### 🏷️ 태그 기반 분류

스니펫마다 태그를 추가하여 분류할 수 있습니다.
태그별 자동 색상 배정, 카운트 표시, 필터링을 지원합니다.

### 🔍 통합 검색

코드 내용, 제목, 태그, 언어를 한꺼번에 검색합니다.
검색 결과 **하이라이팅**, 디바운스, 키보드 단축키(`Ctrl+F`)를 지원합니다.

### ✏️ 인라인 편집

팝업에서 **제목 클릭으로 제목 편집**, **코드 더블클릭으로 코드 편집**이 가능합니다.
별도 편집 화면 없이 목록에서 바로 수정할 수 있습니다.

### 🌙 다크모드

라이트/다크 테마 전환을 지원하며, 선택한 테마가 자동 저장됩니다.

### 📦 내보내기 & 가져오기

저장된 스니펫을 **JSON** 또는 **Markdown** 형식으로 내보내거나, JSON 파일을 가져올 수 있습니다.

## 🛠️ 기술 스택

| 구분 | 기술 |
| --- | --- |
| 플랫폼 | Chrome Extension (Manifest V3) |
| 언어 | Vanilla JavaScript |
| 스타일 | Tailwind CSS 3.x |
| 저장소 | Chrome Storage API (local) |
| 빌드 | Tailwind CLI |

## 📦 설치 방법

### 개발자 모드 설치 (로컬)

1. 이 레포지토리를 클론합니다:

```bash
git clone https://github.com/Dev-2A/devclip.git
cd devclip
```

2. 의존성 설치 및 빌드:

```bash
npm install
npm run build
```

3. Chrome에서 익스텐션 로드:

- `chrome://extensions/` 접속
- 우측 상단 **개발자 모드** 활성화
- **압축해제된 확장 프로그램을 로드합니다** 클릭
- `devclip` 폴더 선택

4. 툴바에 🌐 DevClip 아이콘이 나타나면 설치 완료!

## 🎯 사용법

### 코드 블록 복사 & 저장

1. 코드 블록이 있는 웹 페이즈 방문
2. 코드 블록 위에 마우스 호버
3. **📋 복사** → 클립보드에 복사
4. **💾 저장** → DevClip에 스니펫 저장

### 스니펫 관리 (팝업)

1. 툴바의 DevClip 아이콘 클릭
2. 저장된 스니펫 목록 확인
3. **검색**: 상단 검색바에 키워드 입력
4. **태그 추가**: 스니펫의 `+` 버튼 클릭
5. **태그 필터**: 태그 버튼 클릭으로 필터링
6. **제목 편집**: 제목 텍스트 클릭
7. **코드 편집**: 코드 영역 더블클릭
8. **삭제**: X 버튼 클릭 → 확인 클릭

### 단축키

| 동작 | 단축키 |
| --- | ---|
| 검색 포커스 | `Ctrl+F` |
| 검색 초기화 | `Esc` |
| 코드 편집 저장 | `Ctrl+Enter` |
| 코드 편집 취소 | `Esc` |

## 📁 프로젝트 구조

```text
devclip/
├── manifest.json           # Chrome 익스텐션 설정 (Manifest V3)
├── popup/
│   ├── popup.html          # 팝업 UI
│   ├── popup.js            # 팝업 로직
│   └── popup.css           # Tailwind 빌드 결과
├── content/
│   ├── content.js          # 코드 블록 감지 + 버튼 주입
│   └── content.css         # 복사/저장 버튼 스타일
├── background/
│   └── background.js       # 서비스 워커 (뱃지 업데이트)
├── utils/
│   └── storage.js          # Chrome Storage CRUD 래퍼
├── icons/
│   ├── icon.svg            # 원본 아이콘
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── src/
│   └── input.css           # Tailwind 소스
├── tailwind.config.js
└── package.json
```

## 📄 라이선스

MIT License
