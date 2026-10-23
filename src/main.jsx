import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createClient } from '@supabase/supabase-js'
import html2canvas from 'html2canvas'
import {
  Search,
  SlidersHorizontal,
  Heart,
  Check,
  X,
  Download,
  Images,
  ShieldCheck,
  ArrowLeft,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  LogOut
} from 'lucide-react'
import './styles.css'

const supabaseUrl = 'https://rscpkibmvutmfawjsvpp.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzY3BraWJtdnV0bWZhd2pzdnBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3NTQwMzgsImV4cCI6MjEwODMzMDAzOH0.4ENz3UIDdZ5VWHJs9lvUhYxjV6Hay3mtVkL3-jjIkgU'

const BUCKET = 'concept-images'

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null

const categories = [
  'Tất cả',
  'Bầu',
  'Beauty',
  'Baby',
  'Kid',
  'Cưới',
  'Newborn',
  'Gia đình'
]

const demos = [
  { id: 'd1', category: 'Bầu', title: 'Soft maternity', type: 'Bộ concept', image: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=900&q=80' },
  { id: 'd2', category: 'Beauty', title: 'Natural beauty', type: 'Ảnh concept', image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80' },
  { id: 'd3', category: 'Baby', title: 'Little sunshine', type: 'Bộ concept', image: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=900&q=80' },
  { id: 'd4', category: 'Kid', title: 'Playful day', type: 'Ảnh concept', image: 'https://images.unsplash.com/photo-1503919005314-30d93d07d823?auto=format&fit=crop&w=900&q=80' },
  { id: 'd5', category: 'Cưới', title: 'The quiet vow', type: 'Bộ concept', image: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=80' },
  { id: 'd6', category: 'Newborn', title: 'Tiny dream', type: 'Ảnh concept', image: 'https://images.unsplash.com/photo-1492725764893-90b379c2b6e7?auto=format&fit=crop&w=900&q=80' },
  { id: 'd7', category: 'Gia đình', title: 'Together', type: 'Bộ concept', image: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=900&q=80' },
  { id: 'd8', category: 'Beauty', title: 'Studio portrait', type: 'Ảnh concept', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=80' },
  { id: 'd9', category: 'Bầu', title: 'Warm embrace', type: 'Ảnh concept', image: 'https://images.unsplash.com/photo-1518621012118-5d9c7f0e8e6d?auto=format&fit=crop&w=900&q=80' },
  { id: 'd10', category: 'Cưới', title: 'Modern romance', type: 'Bộ concept', image: 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=900&q=80' },
  { id: 'd11', category: 'Kid', title: 'Little explorer', type: 'Bộ concept', image: 'https://images.unsplash.com/photo-1471286174890-9c112ffca5b4?auto=format&fit=crop&w=900&q=80' },
  { id: 'd12', category: 'Gia đình', title: 'Sunday memories', type: 'Ảnh concept', image: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=900&q=80' }
]

function App() {
  const [category, setCategory] = useState('Tất cả')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState([])
  const [view, setView] = useState('library')
  const [customer, setCustomer] = useState('')
  const [adminOpen, setAdminOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const [session, setSession] = useState(null)
  const [dbConcepts, setDbConcepts] = useState([])
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState('Beauty')
  const [newType, setNewType] = useState('Ảnh concept')
  const [imageFiles, setImageFiles] = useState([])

  const isAdmin = Boolean(session?.user)

  const loadConcepts = useCallback(async () => {
    if (!supabase) return
    const { data, error } = await supabase
      .from('concepts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Lỗi tải concept:', error.message)
      return
    }

    setDbConcepts((data || []).map(item => ({
      ...item,
      image: item.image_url,
      isDemo: false
    })))
  }, [])

    useEffect(() => {
    if (!supabase) return

    // Luôn tải concept cho tất cả người dùng
    loadConcepts()

    supabase.auth.getSession().then(({ data }) => {
      setSession(data?.session ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      loadConcepts()
    })

    return () => subscription.unsubscribe()
  }, [loadConcepts])


    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (newSession) loadConcepts()
    })

    return () => subscription.unsubscribe()
  }, [loadConcepts])

   const allConcepts = useMemo(() => {
    if (dbConcepts.length > 0) return [...dbConcepts, ...demos]
    return demos
  }, [dbConcepts])


  const filtered = useMemo(
    () =>
      allConcepts.filter(
        item =>
          (category === 'Tất cả' || item.category === category) &&
          `${item.title} ${item.category}`
            .toLowerCase()
            .includes(query.toLowerCase())
      ),
    [allConcepts, category, query]
  )

  const toggle = item =>
    setSelected(prev =>
      prev.some(x => x.id === item.id)
        ? prev.filter(x => x.id !== item.id)
        : [...prev, item]
    )

  async function exportCollage() {
    if (!selected.length) {
      return setNotice('M chọn ít nhất một ảnh trước nha.')
    }

    setBusy(true)

    try {
      const node = document.getElementById('export-sheet')
      if (!node) throw new Error('Không tìm thấy bảng xuất ảnh.')

      node.style.display = 'block'
      await new Promise(resolve => setTimeout(resolve, 350))

      const canvas = await html2canvas(node, {
        backgroundColor: '#f7f5f0',
        scale: 2,
        useCORS: true
      })

      node.style.display = 'none'

      const link = document.createElement('a')
      link.download = `concept-${(customer || 'khach-hang').trim().replace(/\s+/g, '-')}.jpg`
      link.href = canvas.toDataURL('image/jpeg', 0.94)
      link.click()

      setNotice('Đã xuất bảng concept. M kiểm tra thư mục Downloads nha.')
    } catch (e) {
      const node = document.getElementById('export-sheet')
      if (node) node.style.display = 'none'
      setNotice('Chưa xuất được bảng ảnh. Thử lại hoặc kiểm tra kết nối ảnh mẫu nha.')
    } finally {
      setBusy(false)
    }
  }

  async function signInAdmin(e) {
    e.preventDefault()

    if (!supabase) {
      return setNotice('Chưa cấu hình Supabase.')
    }

    setBusy(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    setBusy(false)

    if (error) {
      setNotice(`Đăng nhập chưa được: ${error.message}`)
      return
    }

    setSession(data.session)
    setAdminOpen(false)
    setPassword('')
    setNotice('Đăng nhập thành công! M có thể thêm và xóa concept now.')
    await loadConcepts()
  }

  async function handleLogout() {
    if (!supabase) return
    await supabase.auth.signOut()
    setSession(null)
    setDbConcepts([])
    setNotice('Đã đăng xuất.')
  }

  async function addConcept(e) {
    e.preventDefault()

    if (!isAdmin) {
      setNotice('Cần đăng nhập admin trước.')
      return
    }

    if (!imageFiles.length) {
      setNotice('Chọn ít nhất 1 ảnh từ thiết bị trước nha.')
      return
    }

    if (!newTitle.trim()) {
      setNotice('Nhập tên concept trước nha.')
      return
    }

    for (const file of imageFiles) {
      if (!file.type.startsWith('image/')) {
        setNotice(`File "${file.name}" không phải ảnh. Chọn JPG, PNG hoặc WebP nha.`)
        return
      }
      if (file.size > 15 * 1024 * 1024) {
        setNotice(`Ảnh "${file.name}" quá lớn. Chọn ảnh dưới 15MB nha.`)
        return
      }
    }

    setBusy(true)
    setNotice(`Đang tải ${imageFiles.length} ảnh lên...`)

    let successCount = 0
    let failCount = 0

    try {
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i]
        const safeName = file.name
          .normalize('NFKD')
          .replace(/[^a-zA-Z0-9._-]/g, '-')
          .replace(/-+/g, '-')

        const storagePath = `${session.user.id}/${Date.now()}-${safeName || 'concept'}`

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(storagePath, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type
          })

        if (uploadError) {
          console.error(`Lỗi tải ảnh ${file.name}:`, uploadError.message)
          failCount++
          continue
        }

        const { data: publicData } = supabase.storage
          .from(BUCKET)
          .getPublicUrl(storagePath)

        const conceptTitle = imageFiles.length > 1
          ? `${newTitle.trim()} ${i + 1}`
          : newTitle.trim()

        const { error: insertError } = await supabase
          .from('concepts')
          .insert({
            title: conceptTitle,
            category: newCategory,
            type: newType,
            image_url: publicData.publicUrl,
            storage_path: storagePath
          })

        if (insertError) {
          await supabase.storage.from(BUCKET).remove([storagePath])
          console.error(`Lỗi lưu concept ${file.name}:`, insertError.message)
          failCount++
          continue
        }

        successCount++
      }

      await loadConcepts()
      setNewTitle('')
      setImageFiles([])
      const fileInput = document.getElementById('concept-image-input')
      if (fileInput) fileInput.value = ''

      if (failCount === 0) {
        setNotice(`Đã thêm ${successCount} concept thành công!`)
      } else {
        setNotice(`Thành công: ${successCount}, thất bại: ${failCount}.`)
      }
    } catch (err) {
      console.error(err)
      setNotice(`Lỗi: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  async function deleteConcept(item) {
    if (!isAdmin || item.isDemo) return

    const confirmed = window.confirm(`Xóa concept "${item.title}" chứ?`)
    if (!confirmed) return

    setBusy(true)
    setNotice('Đang xóa...')

    try {
      const { error: rowError } = await supabase
        .from('concepts')
        .delete()
        .eq('id', item.id)

      if (rowError) {
        setNotice(`Xóa thất bại: ${rowError.message}`)
        return
      }

      if (item.storage_path) {
        await supabase.storage.from(BUCKET).remove([item.storage_path])
      }

      setSelected(prev => prev.filter(x => x.id !== item.id))
      await loadConcepts()
      setNotice('Đã xóa concept.')
    } catch (err) {
      console.error(err)
      setNotice(`Lỗi: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <a
          className="brand"
          href="#"
          onClick={e => {
            e.preventDefault()
            setView('library')
          }}
        >
          <span><b>Kho Concept</b></span>
        </a>

        <nav>
          <button
            className={view === 'library' ? 'nav-active' : ''}
            onClick={() => setView('library')}
          >
            Thư viện concept
          </button>

          <button
            className={view === 'selected' ? 'nav-active' : ''}
            onClick={() => setView('selected')}
          >
            Concept đã chọn <span className="count">{selected.length}</span>
          </button>
        </nav>

        {isAdmin ? (
          <div className="admin-bar">
            <span className="admin-badge">
              <ShieldCheck size={14} /> Admin
            </span>
            <button className="admin-button" onClick={handleLogout}>
              <LogOut size={16} /> Thoát
            </button>
          </div>
        ) : (
          <button className="admin-button" onClick={() => setAdminOpen(true)}>
            <ShieldCheck size={16} /> Quản trị
          </button>
        )}
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">
              <Sparkles size={13} /> CONCEPT LIBRARY
            </span>
            <h1>Chọn concept.<br /><i>Lưu khoảnh khắc.</i></h1>
            <p>Khám phá ý tưởng chụp ảnh và chọn những khung hình m yêu thích.</p>
            <div className="hero-note">
              <span className="note-dot" /> Bản thử nghiệm · Ảnh minh họa
            </div>
          </div>
          <div className="hero-art">
            <div className="hero-image hero-image-one">
              <img src="https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=700&q=80" alt="Ảnh minh họa concept" />
            </div>
            <div className="hero-image hero-image-two">
              <img src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=500&q=80" alt="Ảnh minh họa chân dung" />
            </div>
            <div className="hero-stamp">IDEAS<br />TO KEEP</div>
          </div>
        </section>

        {notice && (
          <div className="notice" role="status">
            {notice}
            <button onClick={() => setNotice('')} aria-label="Đóng">
              <X size={15} />
            </button>
          </div>
        )}

        {isAdmin && view === 'library' && (
          <div className="admin-panel">
            <h3><Plus size={18} /> Thêm concept mới</h3>
            <form onSubmit={addConcept} className="add-form">
              <label>
                Tên concept
                <input
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Nhập tên concept..."
                />
              </label>
              <label>
                Danh mục
                <select value={newCategory} onChange={e => setNewCategory(e.target.value)}>
                  {categories.filter(c => c !== 'Tất cả').map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                Loại
                <select value={newType} onChange={e => setNewType(e.target.value)}>
                  <option value="Ảnh concept">Ảnh concept</option>
                  <option value="Bộ concept">Bộ concept</option>
                </select>
              </label>
              <label>
                Ảnh (chọn nhiều)
                <input
                  id="concept-image-input"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={e => setImageFiles(Array.from(e.target.files))}
                />
              </label>
              <button className="primary" disabled={busy}>
                {busy ? 'Đang xử lý...' : <><Upload size={16} /> Thêm concept</>}
              </button>
            </form>
          </div>
        )}

        <div className="section-heading">
          <div>
            <span className="eyebrow">TÌM CẢM HỨNG</span>
            <h2>{view === 'selected' ? 'Concept đã chọn' : 'Thư viện concept'}</h2>
            <p>
              {view === 'selected'
                ? 'Rà soát lựa chọn trước khi gửi cho ekip.'
                : 'Chọn một hoặc nhiều ảnh phù hợp với buổi chụp.'}
            </p>
          </div>
          <div className="heading-actions">
            <label className="search">
              <Search size={17} />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Tìm concept..."
              />
            </label>
            <button
              className="filter-button"
              onClick={() => { setCategory('Tất cả'); setQuery('') }}
            >
              <SlidersHorizontal size={16} /> Làm mới
            </button>
          </div>
        </div>

        <div className="category-row">
          {categories.map(c => (
            <button
              key={c}
              className={category === c ? 'category active' : 'category'}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>

        {view === 'selected' && (
          <div className="customer-bar">
            <label>
              Tên khách hàng
              <input
                value={customer}
                onChange={e => setCustomer(e.target.value)}
                placeholder="Nhập tên khách..."
              />
            </label>
            <span>{selected.length} ảnh đã chọn</span>
            <button className="primary" onClick={exportCollage} disabled={busy}>
              {busy ? 'Đang xuất...' : <><Download size={16} /> Xuất bảng ảnh</>}
            </button>
          </div>
        )}

        <section className="gallery">
          {(view === 'selected' ? selected : filtered).map(item => {
            const isSelected = selected.some(x => x.id === item.id)
            return (
              <article
                className={`photo-card ${isSelected ? 'is-selected' : ''}`}
                key={item.id}
              >
                <button
                  className="photo-button"
                  onClick={() => toggle(item)}
                  aria-label={isSelected ? 'Bỏ chọn' : 'Chọn concept'}
                >
                  <img src={item.image} alt={item.title} loading="lazy" />
                  <span className="photo-overlay"></span>
                  <span className="select-mark">
                    {isSelected ? <Check size={17} /> : <Plus size={17} />}
                  </span>
                  <span className="photo-type">{item.type}</span>
                </button>
                <div className="photo-meta">
                  <div>
                    <span>{item.category}</span>
                    <h3>{item.title}</h3>
                  </div>
                  <div className="photo-actions">
                    <button
                      className={`heart ${isSelected ? 'heart-on' : ''}`}
                      onClick={() => toggle(item)}
                      aria-label="Chọn ảnh"
                    >
                      <Heart size={18} fill={isSelected ? 'currentColor' : 'none'} />
                    </button>
                    {isAdmin && !item.isDemo && (
                      <button
                        className="delete-btn"
                        onClick={() => deleteConcept(item)}
                        aria-label="Xóa concept"
                        disabled={busy}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </article>
            )
          })}

          {((view === 'selected' && selected.length === 0) ||
            (view === 'library' && filtered.length === 0)) && (
            <div className="empty">
              <Images size={30} />
              <h3>
                {view === 'selected' ? 'Chưa có concept nào được chọn' : 'Không tìm thấy concept'}
              </h3>
              <p>
                {view === 'selected'
                  ? 'Quay lại thư viện và bấm dấu + trên ảnh m thích.'
                  : 'Thử từ khóa khác hoặc làm mới bộ lọc.'}
              </p>
              <button className="secondary" onClick={() => setView('library')}>
                Về thư viện
              </button>
            </div>
          )}
        </section>

        {view === 'library' && (
          <div className="bottom-cta">
            <div>
              <b>Đã tìm được concept ưng ý?</b>
              <span>Chọn ảnh rồi gom thành một bảng gửi ekip.</span>
            </div>
            <button className="primary" onClick={() => setView('selected')}>
              Xem concept đã chọn <ArrowLeft size={16} className="arrow-flip" />
            </button>
          </div>
        )}
      </main>

      <footer>
        <div className="brand footer-brand">
          <span><b>Kho Concept</b></span>
        </div>
        <span>Concept library · Bản thử nghiệm</span>
        <span>© KHO CONCEPT</span>
      </footer>

      <div id="export-sheet" className="export-sheet">
        <div className="export-header">
          <div className="brand-mark">K</div>
          <div>
            <div className="export-kicker">KHO CONCEPT</div>
            <h2>BẢNG CONCEPT CHỤP ẢNH</h2>
            <p>Khách hàng: {customer.trim() || 'Chưa nhập tên'}</p>
          </div>
        </div>
        <div className="export-grid">
          {selected.map((item, i) => (
            <div className="export-tile" key={item.id}>
              <img src={item.image} crossOrigin="anonymous" alt={item.title} />
              <div>
                <small>{String(i + 1).padStart(2, '0')} · {item.category}</small>
                <b>{item.title}</b>
              </div>
            </div>
          ))}
        </div>
        <div className="export-footer">CONCEPT REFERENCE · KHO CONCEPT</div>
      </div>

      {adminOpen && (
        <div className="modal-backdrop" onClick={() => setAdminOpen(false)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setAdminOpen(false)}
              aria-label="Đóng"
            >
              <X size={18} />
            </button>
            <span className="eyebrow">
              <ShieldCheck size={14} /> KHU VỰC QUẢN TRỊ
            </span>
            <h2>Đăng nhập admin</h2>
            <p>Đăng nhập bằng tài khoản đã tạo trong Supabase Authentication.</p>
            <form onSubmit={signInAdmin}>
              <label>
                Email
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="email@example.com"
                />
              </label>
              <label>
                Mật khẩu
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="Mật khẩu admin"
                />
              </label>
              <button className="primary full" disabled={busy}>
                {busy ? 'Đang xử lý...' : 'Đăng nhập'}
              </button>
            </form>
            <small className="modal-foot">
              Sau khi đăng nhập, m có thể thêm và xóa concept trong thư viện.
            </small>
          </div>
        </div>
      )}
    </div>
  )
}

createRoot(document.getElementById('root')).render(<App />)
