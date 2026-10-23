
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createClient } from '@supabase/supabase-js'
import './styles.css'

// ============================================
// 1. CẤU HÌNH SUPABASE
// Tạo file .env ở thư mục gốc dự án.
// ============================================

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://rscpkibmvutmfawjsvpp.supabase.co'

const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || '').trim().toLowerCase()
const BUCKET = 'concept-images'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const CATEGORIES = [
  'Tất cả',
  'Bầu',
  'Beauty',
  'Baby',
  'Kid',
  'Cưới',
  'Newborn',
  'Gia đình',
]

// ============================================
// 2. COMPONENT CHÍNH
// ============================================

function App() {
  const [concepts, setConcepts] = useState([])
  const [selected, setSelected] = useState([])
  const [category, setCategory] = useState('Tất cả')
  const [view, setView] = useState('gallery')

  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const [loginOpen, setLoginOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [title, setTitle] = useState('')
  const [uploadCategory, setUploadCategory] = useState('Beauty')
  const [imageFile, setImageFile] = useState(null)

  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')

  const isAdmin = Boolean(
    session?.user?.email &&
    ADMIN_EMAIL &&
    session.user.email.toLowerCase() === ADMIN_EMAIL
  )

  // ------------------------------------------
  // 3. TẢI DANH SÁCH CONCEPT
  // ------------------------------------------

  const loadConcepts = useCallback(async () => {
    const { data, error } = await supabase
      .from('concepts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Lỗi tải concept:', error.message)
      setNotice(`Chưa tải được thư viện: ${error.message}`)
      return
    }

    setConcepts((data || []).map(item => ({
      ...item,
      isDemo: false,
    })))
  }, [])

  // ------------------------------------------
  // 4. KIỂM TRA PHIÊN ĐĂNG NHẬP
  // ------------------------------------------

  useEffect(() => {
    let mounted = true

    async function init() {
      if (!SUPABASE_ANON_KEY) {
        setNotice(
          'Chưa có Supabase key. Ní kiểm tra file .env ở thư mục gốc dự án nha.'
        )
        setLoading(false)
        return
      }

      const { data, error } = await supabase.auth.getSession()

      if (!mounted) return

      if (error) {
        setNotice(`Lỗi kiểm tra đăng nhập: ${error.message}`)
      }

      setSession(data?.session ?? null)

      await loadConcepts()

      if (mounted) setLoading(false)
    }

    init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [loadConcepts])

  // ------------------------------------------
  // 5. LỌC CONCEPT
  // ------------------------------------------

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase()

    return concepts.filter(item => {
      const matchesCategory =
        category === 'Tất cả' || item.category === category

      const matchesSearch =
        !keyword ||
        item.title?.toLowerCase().includes(keyword) ||
        item.category?.toLowerCase().includes(keyword)

      return matchesCategory && matchesSearch
    })
  }, [concepts, category, search])

  const displayedItems = view === 'selected' ? selected : filtered

  // ------------------------------------------
  // 6. ĐĂNG NHẬP ADMIN
  // ------------------------------------------

  async function handleLogin(event) {
    event.preventDefault()

    if (!email.trim() || !password) {
      setNotice('Ní nhập email và mật khẩu trước nha.')
      return
    }

    if (!ADMIN_EMAIL) {
      setNotice('Chưa cấu hình VITE_ADMIN_EMAIL trong file .env.')
      return
    }

    setBusy(true)
    setNotice('Đang đăng nhập...')

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    setBusy(false)

    if (error) {
      setNotice(`Đăng nhập thất bại: ${error.message}`)
      return
    }

    if (data.user?.email?.toLowerCase() !== ADMIN_EMAIL) {
      await supabase.auth.signOut()
      setNotice('Tài khoản này không có quyền quản trị.')
      return
    }

    setLoginOpen(false)
    setPassword('')
    setNotice('Đăng nhập quản trị thành công!')
  }

  async function handleLogout() {
    setBusy(true)

    const { error } = await supabase.auth.signOut()

    setBusy(false)

    if (error) {
      setNotice(`Đăng xuất chưa thành công: ${error.message}`)
      return
    }

    setNotice('Đã đăng xuất tài khoản quản trị.')
  }

  // ------------------------------------------
  // 7. CHỌN / BỎ CHỌN CONCEPT
  // ------------------------------------------

  function toggleSelected(item) {
    setSelected(previous => {
      const exists = previous.some(x => x.id === item.id)

      if (exists) {
        return previous.filter(x => x.id !== item.id)
      }

      return [...previous, item]
    })
  }

  function isSelected(item) {
    return selected.some(x => x.id === item.id)
  }

  // ------------------------------------------
  // 8. TẢI ẢNH VÀ THÊM CONCEPT
  // ------------------------------------------

  async function addConcept(event) {
    event.preventDefault()

    if (!isAdmin) {
      setNotice('Ní cần đăng nhập đúng tài khoản quản trị trước nha.')
      return
    }

    if (!imageFile) {
      setNotice('Ní chọn ảnh từ thư viện thiết bị trước nha.')
      return
    }

    if (!title.trim()) {
      setNotice('Ní nhập tên concept trước nha.')
      return
    }

    if (!imageFile.type.startsWith('image/')) {
      setNotice('File đã chọn không phải ảnh. Ní chọn JPG, PNG hoặc WebP nha.')
      return
    }

    if (imageFile.size > 15 * 1024 * 1024) {
      setNotice('Ảnh hơi lớn. Ní chọn ảnh dưới 15 MB nha.')
      return
    }

    setBusy(true)
    setNotice('Đang tải ảnh lên, ní đợi một chút nha...')

    const safeName = imageFile.name
      .normalize('NFKD')
      .replace(/[^a-zA-Z0-9._-]/g, '-')
      .replace(/-+/g, '-')

    const storagePath =
      `${session.user.id}/${Date.now()}-${safeName || 'concept-image'}`

    try {
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, imageFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: imageFile.type,
        })

      if (uploadError) {
        setNotice(`Tải ảnh thất bại: ${uploadError.message}`)
        return
      }

      const { data: publicData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(storagePath)

      const { error: insertError } = await supabase
        .from('concepts')
        .insert({
          title: title.trim(),
          category: uploadCategory,
          type: 'Ảnh concept',
          image_url: publicData.publicUrl,
          storage_path: storagePath,
        })

      if (insertError) {
        await supabase.storage.from(BUCKET).remove([storagePath])
        setNotice(`Chưa lưu được concept: ${insertError.message}`)
        return
      }

      await loadConcepts()

      setTitle('')
      setImageFile(null)

      const fileInput = document.getElementById('concept-image-input')
      if (fileInput) fileInput.value = ''

      setNotice('Đã thêm concept thành công!')
    } catch (error) {
      console.error(error)
      setNotice(`Đã xảy ra lỗi: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }

  // ------------------------------------------
  // 9. XÓA CONCEPT
  // ------------------------------------------

  async function deleteConcept(item) {
    if (!isAdmin || item.isDemo) return

    const confirmed = window.confirm(
      `Ní muốn xóa concept "${item.title}" chứ?`
    )

    if (!confirmed) return

    setBusy(true)
    setNotice('Đang xóa concept...')

    try {
      const { error: rowError } = await supabase
        .from('concepts')
        .delete()
        .eq('id', item.id)

      if (rowError) {
        setNotice(`Chưa xóa được concept: ${rowError.message}`)
        return
      }

      let storageMessage = ''

      if (item.storage_path) {
        const { error: storageError } = await supabase.storage
          .from(BUCKET)
          .remove([item.storage_path])

        if (storageError) {
          storageMessage =
            ` Concept đã xóa khỏi thư viện, nhưng ảnh chưa xóa khỏi Storage: ${storageError.message}`
        }
      }

      setSelected(previous => previous.filter(x => x.id !== item.id))
      await loadConcepts()

      setNotice(`Đã xóa concept.${storageMessage}`)
    } catch (error) {
      console.error(error)
      setNotice(`Có lỗi khi xóa: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }

  // ------------------------------------------
  // 10. XUẤT DANH SÁCH CONCEPT ĐÃ CHỌN
  // ------------------------------------------

  function exportSelected() {
    if (selected.length === 0) {
      setNotice('Ní chọn ít nhất một concept trước nha.')
      return
    }

    const content = selected
      .map((item, index) =>
        `${index + 1}. ${item.title}\nDanh mục: ${item.category}\nẢnh: ${item.image_url || ''}`
      )
      .join('\n\n')

    const blob = new Blob([content], {
      type: 'text/plain;charset=utf-8',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = 'kho-concept-da-chon.txt'
    link.click()

    URL.revokeObjectURL(url)
    setNotice('Đã xuất danh sách concept.')
  }

  // ------------------------------------------
  // 11. GIAO DIỆN
  // ------------------------------------------

  return (
    <div className="app">
      <header className="site-header">
        <a
          className="brand"
          href="#home"
          onClick={() => {
            setView('gallery')
            setCategory('Tất cả')
          }}
        >
          <span className="brand-mark">K</span>
          <span>
            <strong>KHO CONCEPT</strong>
            <small>MOI PHOTOGRAPHY</small>
          </span>
        </a>

        <nav className="main-nav">
          <button
            type="button"
            className={view === 'gallery' ? 'nav-link active' : 'nav-link'}
            onClick={() => setView('gallery')}
          >
            Thư viện
          </button>

          <button
            type="button"
            className={view === 'selected' ? 'nav-link active' : 'nav-link'}
            onClick={() => setView('selected')}
          >
            Đã chọn ({selected.length})
          </button>
        </nav>

        <div className="header-actions">
          {isAdmin ? (
            <>
              <span className="admin-status">Quản trị viên</span>
              <button
                type="button"
                className="button button-outline"
                onClick={handleLogout}
                disabled={busy}
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <button
              type="button"
              className="button button-dark"
              onClick={() => setLoginOpen(true)}
            >
              Đăng nhập
            </button>
          )}
        </div>
      </header>

      <main id="home">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">CREATIVE PHOTO LIBRARY</p>
            <h1>
              Tìm cảm hứng.
              <br />
              <em>Tạo dấu ấn riêng.</em>
            </h1>
            <p className="hero-description">
              Thư viện concept chụp ảnh dành cho những ý tưởng sáng tạo.
              Khám phá, lưu lại và xây dựng bộ concept của riêng ní.
            </p>

            <button
              type="button"
              className="button button-dark"
              onClick={() => {
                setView('gallery')
                document.getElementById('concept-library')?.scrollIntoView({
                  behavior: 'smooth',
                })
              }}
            >
              Khám phá thư viện ↘
            </button>
          </div>

          <div className="hero-side">
            <span className="hero-number">01 / INSPIRE</span>
            <p>Ideas become images.</p>
          </div>
        </section>

        {isAdmin && (
          <section className="admin-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">ADMIN WORKSPACE</p>
                <h2>Thêm concept mới</h2>
              </div>
              <span className="admin-status">Đã đăng nhập</span>
            </div>

            <form className="upload-form" onSubmit={addConcept}>
              <label className="form-field">
                <span>Tên concept</span>
                <input
                  type="text"
                  value={title}
                  onChange={event => setTitle(event.target.value)}
                  placeholder="Ví dụ: Beauty ánh sáng đỏ"
                  maxLength={120}
                  required
                />
              </label>

              <label className="form-field">
                <span>Danh mục</span>
                <select
                  value={uploadCategory}
                  onChange={event => setUploadCategory(event.target.value)}
                  required
                >
                  {CATEGORIES.filter(item => item !== 'Tất cả').map(item => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-field file-field">
                <span>Ảnh concept (tối đa 15 MB)</span>
                <input
                  id="concept-image-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  onChange={event =>
                    setImageFile(event.target.files?.[0] || null)
                  }
                  required
                />
                {imageFile && (
                  <small>
                    Đã chọn: {imageFile.name} (
                    {(imageFile.size / 1024 / 1024).toFixed(2)} MB)
                  </small>
                )}
              </label>

              <button
                className="button button-dark"
                type="submit"
                disabled={busy}
              >
                {busy ? 'Đang xử lý...' : '+ Thêm concept'}
              </button>
            </form>
          </section>
        )}

        {loginOpen && !isAdmin && (
          <div
            className="modal-backdrop"
            onMouseDown={event => {
              if (event.target === event.currentTarget) {
                setLoginOpen(false)
              }
            }}
          >
            <section
              className="login-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="login-title"
            >
              <button
                type="button"
                className="modal-close"
                aria-label="Đóng"
                onClick={() => setLoginOpen(false)}
              >
                ×
              </button>

              <p className="eyebrow">PRIVATE ACCESS</p>
              <h2 id="login-title">Đăng nhập quản trị</h2>
              <p className="muted">
                Dành cho tài khoản quản trị thư viện concept.
              </p>

              <form className="login-form" onSubmit={handleLogin}>
                <label className="form-field">
                  <span>Email</span>
                  <input
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={event => setEmail(event.target.value)}
                    required
                  />
                </label>

                <label className="form-field">
                  <span>Mật khẩu</span>
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    required
                  />
                </label>

                <button
                  className="button button-dark button-full"
                  type="submit"
                  disabled={busy}
                >
                  {busy ? 'Đang đăng nhập...' : 'Đăng nhập'}
                </button>
              </form>
            </section>
          </div>
        )}

        <section className="library-section" id="concept-library">
          <div className="section-heading">
            <div>
              <p className="eyebrow">THE COLLECTION</p>
              <h2>
                {view === 'selected' ? 'Concept đã chọn' : 'Thư viện concept'}
              </h2>
              <p className="muted">
                {view === 'selected'
                  ? `${selected.length} concept trong danh sách của ní`
                  : `${filtered.length} concept`}
              </p>
            </div>

            {view === 'selected' && selected.length > 0 && (
              <button
                type="button"
                className="button button-outline"
                onClick={exportSelected}
              >
                Xuất danh sách ↓
              </button>
            )}
          </div>

          {view === 'gallery' && (
            <>
              <div className="library-toolbar">
                <div className="category-list">
                  {CATEGORIES.map(item => (
                    <button
                      type="button"
                      key={item}
                      className={
                        category === item
                          ? 'category-chip active'
                          : 'category-chip'
                      }
                      onClick={() => setCategory(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>

                <input
                  className="search-input"
                  type="search"
                  placeholder="Tìm concept..."
                  aria-label="Tìm concept"
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                />
              </div>
            </>
          )}

          {notice && (
            <div className="notice" role="status">
              <span>{notice}</span>
              <button
                type="button"
                aria-label="Đóng thông báo"
                onClick={() => setNotice('')}
              >
                ×
              </button>
            </div>
          )}

          {loading ? (
            <div className="empty-state">
              <p>Đang tải thư viện concept...</p>
            </div>
          ) : displayedItems.length === 0 ? (
            <div className="empty-state">
              <h3>
                {view === 'selected'
                  ? 'Ní chưa chọn concept nào'
                  : 'Chưa tìm thấy concept'}
              </h3>
              <p>
                {view === 'selected'
                  ? 'Quay lại thư viện và nhấn chọn những concept ní thích nha.'
                  : 'Thử chọn danh mục khác hoặc đổi từ khóa tìm kiếm.'}
              </p>
              {view === 'selected' && (
                <button
                  type="button"
                  className="button button-dark"
                  onClick={() => setView('gallery')}
                >
                  Quay lại thư viện
                </button>
              )}
            </div>
          ) : (
            <div className="concept-grid">
              {displayedItems.map((item, index) => (
                <article className="concept-card" key={item.id}>
                  <div className="concept-image-wrap">
                    {item.image_url ? (
                      <img
                        className="concept-image"
                        src={item.image_url}
                        alt={item.title}
                        loading={index < 4 ? 'eager' : 'lazy'}
                      />
                    ) : (
                      <div className="image-placeholder">
                        <span>KHO CONCEPT</span>
                      </div>
                    )}

                    <span className="concept-index">
                      {String(index + 1).padStart(2, '0')}
                    </span>

                    <button
                      type="button"
                      className={
                        isSelected(item)
                          ? 'select-concept selected'
                          : 'select-concept'
                      }
                      onClick={() => toggleSelected(item)}
                      aria-pressed={isSelected(item)}
                      title={
                        isSelected(item)
                          ? 'Bỏ chọn concept'
                          : 'Thêm vào danh sách đã chọn'
                      }
                    >
                      {isSelected(item) ? '✓ Đã chọn' : '+ Chọn'}
                    </button>
                  </div>

                  <div className="concept-info">
                    <div>
                      <p className="concept-category">{item.category}</p>
                      <h3>{item.title}</h3>
                    </div>

                    {isAdmin && !item.isDemo && (
                      <button
                        type="button"
                        className="delete-concept"
                        onClick={() => deleteConcept(item)}
                        disabled={busy}
                        aria-label={`Xóa ${item.title}`}
                        title="Xóa concept"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="site-footer">
        <a className="footer-brand" href="#home">
          KHO CONCEPT
        </a>
        <p>Made for creative minds · MOI PHOTOGRAPHY</p>
        <span>© {new Date().getFullYear()}</span>
      </footer>
    </div>
  )
}

// ============================================
// 12. KHỞI CHẠY ỨNG DỤNG
// ============================================

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
