import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1];
const isGitHubPagesBuild = process.env.GITHUB_ACTIONS === "true";
const isUserPage = repositoryName?.endsWith(".github.io");
const base = isGitHubPagesBuild && repositoryName && !isUserPage ? `/${repositoryName}/` : "/";
const rootIndexHtml = fileURLToPath(new URL("./index.html", import.meta.url));

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    rollupOptions: {
      input: rootIndexHtml,
    },
  },
  server: {
    port: 5173,
  },
});
