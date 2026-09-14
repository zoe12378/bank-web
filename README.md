# Bank Web

[![Frontend CI](https://github.com/zoe12378/bank-web/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/zoe12378/bank-web/actions/workflows/frontend-ci.yml)

Bank API 的 React 操作介面，用來展示後端的 JWT 驗證、帳戶所有權、交易紀錄分頁與安全轉帳功能。

- 後端 API：[Bank API](https://github.com/zoe12378/bank-api)
- 一鍵啟動整套服務：[Bank Stack](https://github.com/zoe12378/bank-stack)

## 功能

- 使用帳密登入並在瀏覽器分頁中暫存 access token 與 refresh token。
- Access token 過期時自動呼叫 refresh API，換取新的一組 token 後重送原請求。
- 登出時撤銷 refresh token 並清除瀏覽器分頁資料。
- 管理者登入後可建立帳戶、指派既有使用者，並建立開戶稽核紀錄。
- 查看登入使用者自己的帳戶與餘額。
- 查看交易紀錄、切換頁數及依日期篩選。
- 從自己的帳戶進行轉帳，成功後重新讀取餘額與紀錄。
- 顯示後端回傳的權限、餘額或驗證錯誤。

## 啟動

先讓 Bank API 在 `http://localhost:8080` 運行，再於此資料夾執行：

```powershell
npm.cmd run dev
```

瀏覽器開啟 `http://localhost:5173`。Vite 開發代理會將 `/api` 請求轉送到後端，因此本機開發不需額外 CORS 設定。

## 建置檢查

```powershell
npm.cmd run build
```

## Docker 執行

若要同時啟動 MySQL、後端與本前端，請依照 [Bank Stack](https://github.com/zoe12378/bank-stack) 的說明操作。啟動完成後由 Docker 對外提供 `http://localhost:8081`，瀏覽器請求會由 Nginx 轉送到 API；前端不需要知道資料庫帳密或 API 容器位址。

## 技術

- React 19
- Vite
- Fetch API
- CSS
