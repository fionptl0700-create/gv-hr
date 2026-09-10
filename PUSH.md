# 推到你的 GitHub repo

我這邊的環境沒有安裝 git，也沒有連 GitHub，沒辦法直接幫你 push。
解壓這個 zip 後，在資料夾內執行下列指令即可（把 URL 換成你開好的 repo）：

## Windows PowerShell

```powershell
cd gv-hr-repo
git init
git add .
git commit -m "初版：綠谷國際人資考勤系統（Demo + Next.js 骨架）"
git branch -M main
git remote add origin https://github.com/<你的帳號>/<你的repo>.git
git push -u origin main
```

若 repo 已有內容（例如 GitHub 建立時加了 README）：

```powershell
git pull origin main --allow-unrelated-histories
git push -u origin main
```

## 之後每次更新 Demo

用最新的 `demo/index.html` 覆蓋，然後：

```powershell
git add demo/index.html
git commit -m "update demo"
git push
```

---
🤖 Generated with [Claude Code](https://claude.com/claude-code)
