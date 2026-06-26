# 일반화학검사 대시보드

React와 Vite로 만든 일반화학검사 대시보드 화면입니다.

## 로컬 실행

```bash
npm.cmd install
npm.cmd run dev
```

브라우저에서 `http://127.0.0.1:5173/`로 확인할 수 있습니다.

## GitHub Pages 배포

이 프로젝트는 GitHub Pages 자동 배포가 설정되어 있습니다.

1. GitHub에 저장소를 만듭니다.
2. 이 프로젝트를 저장소에 push합니다.
3. GitHub 저장소에서 `Settings > Pages`로 이동합니다.
4. `Build and deployment`의 `Source`를 `GitHub Actions`로 선택합니다.
5. `Actions` 탭에서 `Deploy to GitHub Pages` 작업이 성공하면 배포 주소가 생성됩니다.

주소는 보통 아래 형식입니다.

```text
https://깃허브계정.github.io/저장소명/
```

## 처음 GitHub에 올리는 경우

```bash
git init
git add .
git commit -m "Initial dashboard"
git branch -M main
git remote add origin https://github.com/깃허브계정/저장소명.git
git push -u origin main
```
