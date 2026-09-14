import { useCallback, useEffect, useState } from 'react'
import './App.css'

// 本機開發走 Vite 代理；部署後由 Vercel 的建置環境提供 Railway API 網址。
const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '/api'

async function apiRequest(path, options = {}, token) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const error = new Error(data?.message || `Request failed (${response.status})`)
    error.status = response.status
    throw error
  }
  return data
}

const money = (value) => new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 2 }).format(value)

function Login({ onLogin }) {
  const [username, setUsername] = useState('huang_demo')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event) {
    event.preventDefault(); setError(''); setLoading(true)
    try {
      const result = await apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) })
      onLogin(result)
    } catch (requestError) { setError(requestError.message) } finally { setLoading(false) }
  }

  return <main className="login-layout">
    <section className="login-copy"><p className="eyebrow">BANK API DEMO</p><h1>把後端規則，變成看得見的金融體驗。</h1><p>這個介面串接 Spring Boot 後端，展示 JWT 登入、帳戶所有權、交易稽核與安全轉帳。</p><div className="feature-list"><span>JWT 驗證</span><span>安全轉帳</span><span>交易分頁</span></div></section>
    <section className="login-card"><div className="bank-mark">B</div><p className="eyebrow">WELCOME BACK</p><h2>登入銀行後台</h2><p className="muted">請使用已註冊的測試帳號登入。</p><form onSubmit={submit}><label>使用者名稱<input value={username} onChange={(event) => setUsername(event.target.value)} required /></label><label>密碼<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>{error && <p className="message error">{error}</p>}<button className="primary-button" disabled={loading}>{loading ? '登入中…' : '安全登入'}</button></form></section>
  </main>
}

function Dashboard({ session, onSessionUpdated, onLogout }) {
  const token = session.accessToken
  const [accounts, setAccounts] = useState([])
  const [selected, setSelected] = useState(null)
  const [history, setHistory] = useState(null)
  const [page, setPage] = useState(0)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [recipient, setRecipient] = useState('B001')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [newAccount, setNewAccount] = useState({
    accountNumber: '', ownerName: '', ownerUsername: session.username || '', openingBalance: '0.00',
  })
  const [creatingAccount, setCreatingAccount] = useState(false)

  // Access token 過期時，前端用 refresh token 換取新的一組 token，再重送原請求一次。
  const request = useCallback(async (path, options = {}) => {
    try {
      return await apiRequest(path, options, token)
    } catch (requestError) {
      if (requestError.status !== 401 || !session.refreshToken) throw requestError

      try {
        const nextSession = await apiRequest('/auth/refresh', {
          method: 'POST',
          body: JSON.stringify({ refreshToken: session.refreshToken }),
        })
        onSessionUpdated(nextSession)
        return await apiRequest(path, options, nextSession.accessToken)
      } catch {
        onLogout()
        throw new Error('登入已過期，請重新登入。')
      }
    }
  }, [onLogout, onSessionUpdated, session.refreshToken, token])

  const loadAccounts = useCallback(async () => {
    const data = await request('/accounts')
    setAccounts(data); setSelected((current) => current || data[0]?.accountNumber || null)
  }, [request])
  const loadHistory = useCallback(async () => {
    if (!selected) return
    const params = new URLSearchParams({ page: String(page), size: '5' })
    if (from) params.set('from', from); if (to) params.set('to', to)
    setHistory(await request(`/accounts/${selected}/transactions?${params}`))
  }, [from, page, request, selected, to])

  useEffect(() => { loadAccounts().catch((e) => setError(e.message)).finally(() => setLoading(false)) }, [loadAccounts])
  useEffect(() => { loadHistory().catch((e) => setError(e.message)) }, [loadHistory])

  async function transfer(event) {
    event.preventDefault(); setError(''); setMessage(''); setSubmitting(true)
    try {
      const result = await request('/transfers', { method: 'POST', body: JSON.stringify({ fromAccountNumber: selected, toAccountNumber: recipient, amount: Number(amount) }) })
      setMessage(`已成功轉帳 ${money(result.amount)} 至 ${result.toAccountNumber}`); setAmount('')
      await loadAccounts(); await loadHistory()
  } catch (e) { setError(e.message) } finally { setSubmitting(false) }
  }

  async function logout() {
    try {
      if (session.refreshToken) {
        await apiRequest('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken: session.refreshToken }),
        })
      }
    } finally {
      onLogout()
    }
  }

  async function createAccount(event) {
    event.preventDefault(); setError(''); setMessage(''); setCreatingAccount(true)
    try {
      const created = await request('/admin/accounts', {
        method: 'POST',
        body: JSON.stringify({ ...newAccount, openingBalance: Number(newAccount.openingBalance) }),
      })
      setMessage(`已建立 ${created.accountNumber}，並指派給 ${newAccount.ownerUsername}`)
      setNewAccount({ accountNumber: '', ownerName: '', ownerUsername: session.username || '', openingBalance: '0.00' })
      await loadAccounts()
    } catch (e) { setError(e.message) } finally { setCreatingAccount(false) }
  }

  if (loading) return <main className="loading">正在載入帳戶…</main>
  const active = accounts.find((account) => account.accountNumber === selected)
  return <main className="app-shell">
    <header className="topbar"><div className="brand"><span className="bank-mark small">B</span>Bank Console</div><div><span className="secure">系統安全連線中</span><button className="text-button" onClick={logout}>登出</button></div></header>
    <section className="heading"><div><p className="eyebrow">ACCOUNT OVERVIEW</p><h1>我的帳戶</h1></div><p className="muted">你的資料僅在 JWT 驗證後顯示。</p></section>
    {error && <p className="message error">{error}</p>}{message && <p className="message success">{message}</p>}
    <section className="account-grid">{accounts.map((account) => <button key={account.accountNumber} className={`account-card ${selected === account.accountNumber ? 'selected' : ''}`} onClick={() => { setSelected(account.accountNumber); setPage(0) }}><span>{account.ownerName}</span><strong>{money(account.balance)}</strong><small>{account.accountNumber}</small></button>)}</section>
    {active && <section className="workspace">
      <article className="panel"><div className="panel-heading"><div><p className="eyebrow">AUDIT TRAIL</p><h2>交易紀錄</h2></div><span className="chip">{active.accountNumber}</span></div><div className="filters"><label>從<input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(0) }} /></label><label>至<input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(0) }} /></label></div><div className="table-wrap"><table><thead><tr><th>時間</th><th>類型</th><th>金額</th><th>餘額</th></tr></thead><tbody>{history?.content?.map((item) => <tr key={item.id}><td>{item.createdAt}</td><td><span className={item.status === 'FAILED' ? 'failed' : 'type'}>{item.transactionType}</span></td><td>{money(item.amount)}</td><td>{money(item.balanceAfter)}</td></tr>)}{history?.content?.length === 0 && <tr><td className="empty" colSpan="4">沒有符合條件的資料。</td></tr>}</tbody></table></div>{history && <div className="pagination"><span>第 {history.page + 1} / {Math.max(1, history.totalPages)} 頁，共 {history.totalElements} 筆</span><div><button disabled={history.page === 0} onClick={() => setPage((p) => p - 1)}>上一頁</button><button disabled={history.page + 1 >= history.totalPages} onClick={() => setPage((p) => p + 1)}>下一頁</button></div></div>}</article>
      <aside className="panel transfer"><p className="eyebrow">NEW TRANSFER</p><h2>安全轉帳</h2><p className="muted">扣款帳戶：{active.accountNumber}</p><form onSubmit={transfer}><label>收款帳號<input value={recipient} onChange={(e) => setRecipient(e.target.value)} required /></label><label>轉帳金額<input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required /></label><button className="primary-button" disabled={submitting}>{submitting ? '處理中…' : '確認轉帳'}</button></form><div className="security-note"><strong>安全檢查</strong><span>後端會再次驗證帳戶所有權、餘額與資料庫鎖定。</span></div></aside>
      {session.role === 'ROLE_ADMIN' && <section className="panel" style={{ gridColumn: '1 / -1' }}><p className="eyebrow">ADMINISTRATION</p><h2>建立並指派帳戶</h2><p className="muted">建立時會同時留下 OPEN_ACCOUNT 稽核紀錄。</p><form onSubmit={createAccount} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'end' }}><label>新帳號<input value={newAccount.accountNumber} onChange={(e) => setNewAccount({ ...newAccount, accountNumber: e.target.value.toUpperCase() })} placeholder="C001" required /></label><label>戶名<input value={newAccount.ownerName} onChange={(e) => setNewAccount({ ...newAccount, ownerName: e.target.value })} placeholder="Carol" required /></label><label>擁有者帳號<input value={newAccount.ownerUsername} onChange={(e) => setNewAccount({ ...newAccount, ownerUsername: e.target.value })} placeholder="huang_demo" required /></label><label>開戶金額<input type="number" min="0" step="0.01" value={newAccount.openingBalance} onChange={(e) => setNewAccount({ ...newAccount, openingBalance: e.target.value })} required /></label><button className="primary-button" disabled={creatingAccount}>{creatingAccount ? '建立中…' : '建立帳戶'}</button></form></section>}
    </section>}
  </main>
}

export default function App() {
  const [session, setSession] = useState(() => {
    try {
      const savedSession = JSON.parse(sessionStorage.getItem('bank_session'))
      return savedSession?.accessToken && savedSession?.refreshToken ? savedSession : null
    } catch {
      return null
    }
  })

  const saveSession = (nextSession) => {
    sessionStorage.setItem('bank_session', JSON.stringify(nextSession))
    sessionStorage.removeItem('bank_token')
    setSession(nextSession)
  }
  const logout = () => {
    sessionStorage.removeItem('bank_session')
    sessionStorage.removeItem('bank_token')
    setSession(null)
  }

  return session
    ? <Dashboard session={session} onSessionUpdated={saveSession} onLogout={logout} />
    : <Login onLogin={saveSession} />
}
