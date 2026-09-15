# 綠谷國際 GV STUDIO — 線上人資考勤系統

台北同仁正常班（勞基法）· 上班 09:00–18:00（中午 12:00–13:00 休息不計工時）· 特休**週年制** · 兩階簽核（一階 郭銘柔 → 二階 Johnson）。

## ⚠️ 正式使用請走這個連結，不是這個 repo

同仁實際打卡／請假／薪資試算，請用 **Claude Artifact 版本**：資料存在雲端資料庫，帳號各自登入只看得到自己的資料，改版不會覆蓋資料。

👉 正式連結由管理員保管（Claude Artifact 連結）。

**這個 GitHub repo 是原始碼備份／版本紀錄，`demo/index.html` 若直接用 GitHub Pages 開啟，因為離開了 Claude Artifact 環境、拿不到雲端資料庫，每次整理重新整理都是「離線示範模式」（資料不會保存、看到的是種子假資料），僅供程式碼參考或未來自架使用，不要拿來實際登記出勤。**

## 內容

| 路徑 | 說明 |
|---|---|
| `demo/index.html` | 單檔前端原始碼快照（與 Claude Artifact 上線版本同步）。含登入、打卡（含外出簽到／簽退）、請假（勞基法相關假別＋附件上傳、部分假別可按小時）、加班費（§24 分段加成＋補休時數池）、出差＋出差津貼、月薪試算與確認定版薪酬明細、勞健保 2026 級距、考勤與異常、簽核中心、人資大表、員工管理、稽核軌跡。 |
| `app/` | 正式系統骨架（Next.js 14 + TypeScript + Prisma）。尚未同步 demo 最新規則，之後要自架時再對齊。 |
| `docs/` | 系統規格書、勞基法假別規範（早期版本，實際規則以 `demo/index.html` 為準）。 |

## Demo 帳號（密碼皆 `gv1234`，僅在離線示範模式下可登入示範資料）

| 帳號 | 姓名 | 角色 |
|---|---|---|
| `admin` | 郭銘柔 | 管理員 / 一階主管 |
| `johnson` | Johnson | 主管 / 二階 |
| `test` | 測試員 test | 一般同仁 |

## 本機跑正式系統骨架（Next.js，尚未對齊 demo 最新規則）

```bash
cd app
npm install
npm run setup      # prisma generate + db push + 種子資料
npm run dev        # http://localhost:3000
```

---
🤖 Generated with [Claude Code](https://claude.com/claude-code)
