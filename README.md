# 綠谷國際 GV STUDIO — 線上人資考勤系統

台北同仁正常班（勞基法）· 上班 09:00–18:00 · 特休**週年制** · 兩階簽核（一階 郭銘柔 → 二階 Johnson）· 通知走 **LINE**

## 內容

| 路徑 | 說明 |
|---|---|
| `demo/index.html` | **互動 Demo（單檔前端）** — 直接用瀏覽器開，或部署為靜態網頁。含登入、打卡、請假（勞基法 23 假別＋附件）、加班費、出差＋出差津貼、月薪試算（伙食／主管／其他津貼、遲到早退按比例扣，無全勤獎金）、考勤與異常、簽核中心、人資大表、員工管理。核心計算與 `app/` 一致。 |
| `app/` | **正式系統骨架** — Next.js 14 + TypeScript + Prisma（開發 SQLite、正式 PostgreSQL）。M1 範圍見 `app/README.md`。 |
| `docs/` | 系統規格書、勞基法假別規範 |

## Demo 帳號（密碼皆 `gv1234`）

| 帳號 | 姓名 | 角色 |
|---|---|---|
| `admin` | 郭銘柔 | 管理員 / 一階主管 |
| `johnson` | Johnson | 主管 / 二階 |
| `test` | 測試員 test | 一般同仁 |

## 本機跑正式系統

```bash
cd app
npm install
npm run setup      # prisma generate + db push + 種子資料
npm run dev        # http://localhost:3000
```

## 部署 Demo 到 Netlify

`demo/` 是純靜態，Netlify 直接指定 `demo` 為發佈目錄即可（無 build 指令）。

---
🤖 Generated with [Claude Code](https://claude.com/claude-code)
