# 일반화학검사 대시보드

React와 Vite로 만든 일반화학검사 대시보드 화면입니다.

## 로컬 실행

```bash
npm.cmd install
npm.cmd run dev
```

브라우저에서 `http://127.0.0.1:5173/`로 확인할 수 있습니다.

## 페이지 URL

별도 페이지는 해시 URL로 이동합니다. 대시보드 안의 탭은 URL을 바꾸지 않고 화면 안에서만 전환됩니다.

```text
http://127.0.0.1:5173/
http://127.0.0.1:5173/#/new-page
```

새 페이지를 추가할 때는 `src/App.jsx`의 `pageRoutes`에 URL path를 추가하고, `App` 컴포넌트에서 해당 page id에 맞는 페이지 컴포넌트를 렌더링합니다.

## GitHub Pages 배포

이 프로젝트는 GitHub Pages의 `main /docs` 배포 방식에 맞춰져 있습니다.

배포용 파일을 다시 만들 때는 아래 명령을 실행합니다.

```bash
npm.cmd run build:pages
```

그러면 `docs` 폴더에 GitHub Pages가 바로 보여줄 수 있는 정적 파일이 생성됩니다.

GitHub 저장소에서는 아래처럼 설정합니다.

1. 저장소에서 `Settings > Pages`로 이동합니다.
2. `Build and deployment`의 `Source`를 `Deploy from a branch`로 선택합니다.
3. `Branch`를 `main`, 폴더를 `/docs`로 선택합니다.
4. `Save`를 누릅니다.

배포 주소는 아래입니다.

```text
https://minju29.github.io/New-project/
```
