    if (!isAdmin) return setNotice('Ní cần đăng nhập đúng tài khoản quản trị trước nha.')    if (!isAdmin) return setNotice('Ní cần đăng nhập đúng tài khoản quản trị trước nha.')
    if (!imageFile) return setNotice('Ní chọn ảnh từ thư viện điện thoại trước nha.')
    if (!title.trim()) return setNotice('Ní nhập tên concept trước nha.')
    if (!imageFile.type.startsWith('image/')) return setNotice('File đã chọn không phải ảnh. Ní chọn JPG, PNG hoặc WebP nha.')
    if (imageFile.size > 15 * 1024 * 1024) return setNotice('Ảnh hơi lớn. Ní chọn ảnh dưới 15 MB nha.')

    setBusy(true)
    setNotice('Đang tải ảnh lên, ní đợi một chút nha...')
    const safeName = imageFile.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-')
    const storagePath = `${session.user.id}/${Date.now()}-${safeName || 'concept-image'}`

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, imageFile, {
      cacheControl: '3600', upsert: false, contentType: imageFile.type
    })
    if (uploadError) {
      setBusy(false)
      return setNotice(`Tải ảnh thất bại: ${uploadError.message}. Kiểm tra bucket và quyền Storage nha.`)
    }

    const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
    const { error: insertError } = await supabase.from('concepts').insert({
      title: title.trim(), category: uploadCategory, type: 'Ảnh concept',
      image_url: publicData.publicUrl, storage_path: storagePath
    })

    if (insertError) {
      await supabase.storage.from(BUCKET).remove([storagePath])
      setBusy(false)
      return setNotice(`Ảnh đã tải lên nhưng chưa lưu được concept: ${insertError.message}`)
    }

    await loadConcepts()
    setTitle('')
    setImageFile(null)
    const fileInput = document.getElementById('concept-image-input')
    if (fileInput) fileInput.value = ''
    setBusy(false)
    setNotice('Đã thêm concept thành công!')
  }

  async function deleteConcept(item) {
    if (!isAdmin || item.isDemo) return
    if (!window.confirm(`Ní muốn xóa concept “${item.title}” chứ?`)) return
    setBusy(true)
    const { error: rowError } = await supabase.from('concepts').delete().eq('id', item.id)
    if (rowError) {
      setBusy(false)
      return setNotice(`Chưa xóa được concept: ${rowError.message}`)
    }
    if (item.storage_path) {
      const { error: storageError } = await supabase.storage.from(BUCKET).remove([item.storage_path])
      if (storageError) setNotice(`Đã xóa concept khỏi thư viện, nhưng ảnh trong kho chưa xóa được: ${storageError.message}`)
      else setNotice('Đã xóa concept.')
    } else setNotice('Đã xóa concept.')
    setSelected(prev => prev.filter(x => x.id !== item.id))
    await loadConcepts()
    setBusy(false)
  }

  const displayedItems = view === 'selected' ? selected : filtered

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="#" onClick={e => { e.preventDefault(); setView('library') }}><span><b>Kho Concept</b></span></a>
        <nav>
          <button className={view === 'library' ? 'nav-active' : ''} onClick={() => setView('library')}>Thư viện concept</button>
          <button className={view === 'selected' ? 'nav-active' : ''} onClick={() => setView('selected')}>Concept đã chọn <span className="count">{selected.length}</span></button>
        </nav>
        <button className="admin-button" onClick={() => setAdminOpen(true)}><ShieldCheck size={16} /> {isAdmin ? 'Quản trị' : 'Đăng nhập'}</button>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow"><Sparkles size={13} /> CONCEPT LIBRARY</span>
            <h1>Chọn concept.<br /><i>Lưu khoảnh khắc.</i></h1>
            <p>Khám phá ý tưởng chụp ảnh và chọn những khung hình m yêu thích.</p>
            <div className="hero-note"><span className="note-dot" /> {concepts.some(item => !item.isDemo) ? 'Concept từ thư viện' : 'Bản thử nghiệm · Ảnh minh họa'}</div>
          </div>
          <div className="hero-art">
            <div className="hero-image hero-image-one"><img src="https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=700&q=80" alt="Ảnh minh họa concept" /></div>
            <div className="hero-image hero-image-two"><img src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=500&q=80" alt="Ảnh minh họa chân dung" /></div>
            <div className="hero-stamp">IDEAS<br />TO KEEP</div>
          </div>
        </section>

        {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Đóng"><X size={15} /></button></div>}

        {isAdmin && <section className="admin-upload-panel">
          <div className="admin-panel-heading"><div><span className="eyebrow"><ShieldCheck size={14} /> QUẢN TRỊ</span><h2>Thêm concept mới</h2><p>Chọn ảnh, đặt tên và chọn đúng danh mục.</p></div><button className="secondary" onClick={signOutAdmin}><LogOut size={15} /> Đăng xuất</button></div>
          <form className="upload-form" onSubmit={addConcept}>
            <label className="upload-picker" htmlFor="concept-image-input"><Upload size={23} /><strong>{imageFile ? 'Đã chọn ảnh' : 'Chọn ảnh từ điện thoại'}</strong><span>{imageFile ? imageFile.name : 'Chạm để mở thư viện ảnh'}</span><input id="concept-image-input" type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} /></label>
            {imageFile && <img className="upload-preview" src={URL.createObjectURL(imageFile)} alt="Xem trước ảnh đã chọn" />}
            <label>Tên concept<input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ví dụ: Beauty ánh sáng cửa sổ" maxLength={120} required /></label>
            <label>Danh mục<select value={uploadCategory} onChange={e => setUploadCategory(e.target.value)}>{uploadCategories.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
            <button className="primary upload-submit" type="submit" disabled={busy}>{busy ? 'Đang xử lý...' : <><Plus size={17} /> Thêm concept vào thư viện</>}</button>
          </form>
        </section>}

        <div className="section-heading"><div><span className="eyebrow">TÌM CẢM HỨNG</span><h2>{view === 'selected' ? 'Concept đã chọn' : 'Thư viện concept'}</h2><p>{view === 'selected' ? 'Rà soát lựa chọn trước khi gửi cho ekip.' : 'Chọn một hoặc nhiều ảnh phù hợp với buổi chụp.'}</p></div>
          <div className="heading-actions"><label className="search"><Search size={17} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm concept..." /></label><button className="filter-button" onClick={() => { setCategory('Tất cả'); setQuery('') }}><SlidersHorizontal size={16} /> Làm mới</button></div>
        </div>

        <div className="category-row">{categories.map(c => <button key={c} className={category === c ? 'category active' : 'category'} onClick={() => setCategory(c)}>{c}</button>)}</div>

        {view === 'selected' && <div className="customer-bar"><label>Tên khách hàng<input value={customer} onChange={e => setCustomer(e.target.value)} placeholder="Nhập tên khách..." /></label><span>{selected.length} ảnh đã chọn</span><button className="primary" onClick={exportCollage} disabled={busy}>{busy ? 'Đang xuất...' : <><Download size={16} /> Xuất bảng ảnh</>}</button></div>}

        <section className="gallery">
          {displayedItems.filter(item => view !== 'selected' || (category === 'Tất cả' || item.category === category) && `${item.title} ${item.category}`.toLowerCase().includes(query.toLowerCase())).map(item => {
            const isSelected = selected.some(x => x.id === item.id)
            return <article className={`photo-card ${isSelected ? 'is-selected' : ''}`} key={item.id}>
              <button className="photo-button" onClick={() => toggle(item)} aria-label={isSelected ? 'Bỏ chọn' : 'Chọn concept'}><img src={item.image} alt={item.title} loading="lazy" /><span className="photo-overlay"></span><span className="select-mark">{isSelected ? <Check size={17} /> : <Plus size={17} />}</span><span className="photo-type">{item.type}</span></button>
              <div className="photo-meta"><div><span>{item.category}</span><h3>{item.title}</h3></div><div className="photo-actions"><button className={`heart ${isSelected ? 'heart-on' : ''}`} onClick={() => toggle(item)} aria-label="Chọn ảnh"><Heart size={18} fill={isSelected ? 'currentColor' : 'none'} /></button>{isAdmin && !item.isDemo && <button className="delete-concept" onClick={() => deleteConcept(item)} disabled={busy} aria-label="Xóa concept" title="Xóa concept"><Trash2 size={17} /></button>}</div></div>
            </article>
          })}
          {displayedItems.filter(item => view !== 'selected' || (category === 'Tất cả' || item.category === category) && `${item.title} ${item.category}`.toLowerCase().includes(query.toLowerCase())).length === 0 && <div className="empty"><Images size={30} /><h3>{view === 'selected' ? 'Chưa có concept nào được chọn' : 'Không tìm thấy concept'}</h3><p>{view === 'selected' ? 'Quay lại thư viện và bấm dấu + trên ảnh m thích.' : 'Thử từ khóa khác hoặc làm mới bộ lọc.'}</p><button className="secondary" onClick={() => setView('library')}>Về thư viện</button></div>}
        </section>

        {view === 'library' && <div className="bottom-cta"><div><b>Đã tìm được concept ưng ý?</b><span>Chọn ảnh rồi gom thành một bảng gửi ekip.</span></div><button className="primary" onClick={() => setView('selected')}>Xem concept đã chọn <ArrowLeft size={16} className="arrow-flip" /></button></div>}
      </main>

      <footer><div className="brand footer-brand"><span><b>Kho Concept</b></span></div><span>Concept library · Bản thử nghiệm</span><span>© KHO CONCEPT</span></footer>

      <div id="export-sheet" className="export-sheet"><div className="export-header"><div className="brand-mark">K</div><div><div className="export-kicker">KHO CONCEPT</div><h2>BẢNG CONCEPT CHỤP ẢNH</h2><p>Khách hàng: {customer.trim() || 'Chưa nhập tên'}</p></div></div><div className="export-grid">{selected.map((item, i) => <div className="export-tile" key={item.id}><img src={item.image} crossOrigin="anonymous" alt={item.title} /><div><small>{String(i + 1).padStart(2, '0')} · {item.category}</small><b>{item.title}</b></div></div>)}</div><div className="export-footer">CONCEPT REFERENCE · KHO CONCEPT</div></div>

      {adminOpen && <div className="modal-backdrop" onClick={() => setAdminOpen(false)}><div className="admin-modal" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setAdminOpen(false)} aria-label="Đóng"><X size={18} /></button><span className="eyebrow"><ShieldCheck size={14} /> KHU VỰC QUẢN TRỊ</span>
        {isAdmin ? <><h2>Đã đăng nhập</h2><p>Tài khoản quản trị có thể thêm và xóa concept. Đóng cửa sổ này để dùng bảng quản trị bên dưới phần đầu trang.</p><button className="primary full" onClick={() => setAdminOpen(false)}>Tiếp tục quản lý</button><button className="secondary full logout-modal" onClick={signOutAdmin}><LogOut size={15} /> Đăng xuất</button></> : <><h2>Đăng nhập admin</h2><p>Đăng nhập bằng tài khoản đã tạo trong Supabase Authentication.</p><form onSubmit={signInAdmin}><label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="Email quản trị" autoComplete="username" /></label><label>Mật khẩu<input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Mật khẩu admin" autoComplete="current-password" /></label><button className="primary full" disabled={busy}>{busy ? 'Đang xử lý...' : 'Đăng nhập'}</button></form><small className="modal-foot">Chỉ email quản trị đã cấu hình mới có quyền thêm hoặc xóa concept.</small></>}
    if (!imageFile) return setNotice('Ní chọn ảnh từ thư viện điện thoại trước nha.')
    if (!title.trim()) return setNotice('Ní nhập tên concept trước nha.')
    if (!imageFile.type.startsWith('image/')) return setNotice('File đã chọn không phải ảnh. Ní chọn JPG, PNG hoặc WebP nha.')
    if (imageFile.size > 15 * 1024 * 1024) return setNotice('Ảnh hơi lớn. Ní chọn ảnh dưới 15 MB nha.')

    setBusy(true)    if (!isAdmin) return setNotice('Ní cần đăng nhập đúng tài khoản quản trị trước nha.')
    if (!imageFile) return setNotice('Ní chọn ảnh từ thư viện điện thoại trước nha.')
    if (!title.trim()) return setNotice('Ní nhập tên concept trước nha.')
    if (!imageFile.type.startsWith('image/')) return setNotice('File đã chọn không phải ảnh. Ní chọn JPG, PNG hoặc WebP nha.')
    if (imageFile.size > 15 * 1024 * 1024) return setNotice('Ảnh hơi lớn. Ní chọn ảnh dưới 15 MB nha.')

    setBusy(true)
    setNotice('Đang tải ảnh lên, ní đợi một chút nha...')
    const safeName = imageFile.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-')
    const storagePath = `${session.user.id}/${Date.now()}-${safeName || 'concept-image'}`

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, imageFile, {
      cacheControl: '3600', upsert: false, contentType: imageFile.type
    })
    if (uploadError) {
      setBusy(false)
      return setNotice(`Tải ảnh thất bại: ${uploadError.message}. Kiểm tra bucket và quyền Storage nha.`)
    }

    const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
    const { error: insertError } = await supabase.from('concepts').insert({
      title: title.trim(), category: uploadCategory, type: 'Ảnh concept',
      image_url: publicData.publicUrl, storage_path: storagePath
    })

    if (insertError) {
      await supabase.storage.from(BUCKET).remove([storagePath])
      setBusy(false)
      return setNotice(`Ảnh đã tải lên nhưng chưa lưu được concept: ${insertError.message}`)
    }

    await loadConcepts()
    setTitle('')
    setImageFile(null)
    const fileInput = document.getElementById('concept-image-input')
    if (fileInput) fileInput.value = ''
    setBusy(false)
    setNotice('Đã thêm concept thành công!')
  }

  async function deleteConcept(item) {
    if (!isAdmin || item.isDemo) return
    if (!window.confirm(`Ní muốn xóa concept “${item.title}” chứ?`)) return
    setBusy(true)
    const { error: rowError } = await supabase.from('concepts').delete().eq('id', item.id)
    if (rowError) {
      setBusy(false)
      return setNotice(`Chưa xóa được concept: ${rowError.message}`)
    }
    if (item.storage_path) {
      const { error: storageError } = await supabase.storage.from(BUCKET).remove([item.storage_path])
      if (storageError) setNotice(`Đã xóa concept khỏi thư viện, nhưng ảnh trong kho chưa xóa được: ${storageError.message}`)
      else setNotice('Đã xóa concept.')
    } else setNotice('Đã xóa concept.')
    setSelected(prev => prev.filter(x => x.id !== item.id))
    await loadConcepts()
    setBusy(false)
  }

  const displayedItems = view === 'selected' ? selected : filtered

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="#" onClick={e => { e.preventDefault(); setView('library') }}><span><b>Kho Concept</b></span></a>
        <nav>
          <button className={view === 'library' ? 'nav-active' : ''} onClick={() => setView('library')}>Thư viện concept</button>
          <button className={view === 'selected' ? 'nav-active' : ''} onClick={() => setView('selected')}>Concept đã chọn <span className="count">{selected.length}</span></button>
        </nav>
        <button className="admin-button" onClick={() => setAdminOpen(true)}><ShieldCheck size={16} /> {isAdmin ? 'Quản trị' : 'Đăng nhập'}</button>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow"><Sparkles size={13} /> CONCEPT LIBRARY</span>
            <h1>Chọn concept.<br /><i>Lưu khoảnh khắc.</i></h1>
            <p>Khám phá ý tưởng chụp ảnh và chọn những khung hình m yêu thích.</p>
            <div className="hero-note"><span className="note-dot" /> {concepts.some(item => !item.isDemo) ? 'Concept từ thư viện' : 'Bản thử nghiệm · Ảnh minh họa'}</div>
          </div>
          <div className="hero-art">
            <div className="hero-image hero-image-one"><img src="https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=700&q=80" alt="Ảnh minh họa concept" /></div>
            <div className="hero-image hero-image-two"><img src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=500&q=80" alt="Ảnh minh họa chân dung" /></div>
            <div className="hero-stamp">IDEAS<br />TO KEEP</div>
          </div>
        </section>

        {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Đóng"><X size={15} /></button></div>}

        {isAdmin && <section className="admin-upload-panel">
          <div className="admin-panel-heading"><div><span className="eyebrow"><ShieldCheck size={14} /> QUẢN TRỊ</span><h2>Thêm concept mới</h2><p>Chọn ảnh, đặt tên và chọn đúng danh mục.</p></div><button className="secondary" onClick={signOutAdmin}><LogOut size={15} /> Đăng xuất</button></div>
          <form className="upload-form" onSubmit={addConcept}>
            <label className="upload-picker" htmlFor="concept-image-input"><Upload size={23} /><strong>{imageFile ? 'Đã chọn ảnh' : 'Chọn ảnh từ điện thoại'}</strong><span>{imageFile ? imageFile.name : 'Chạm để mở thư viện ảnh'}</span><input id="concept-image-input" type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} /></label>
            {imageFile && <img className="upload-preview" src={URL.createObjectURL(imageFile)} alt="Xem trước ảnh đã chọn" />}
            <label>Tên concept<input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ví dụ: Beauty ánh sáng cửa sổ" maxLength={120} required /></label>
            <label>Danh mục<select value={uploadCategory} onChange={e => setUploadCategory(e.target.value)}>{uploadCategories.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
            <button className="primary upload-submit" type="submit" disabled={busy}>{busy ? 'Đang xử lý...' : <><Plus size={17} /> Thêm concept vào thư viện</>}</button>
          </form>
        </section>}

        <div className="section-heading"><div><span className="eyebrow">TÌM CẢM HỨNG</span><h2>{view === 'selected' ? 'Concept đã chọn' : 'Thư viện concept'}</h2><p>{view === 'selected' ? 'Rà soát lựa chọn trước khi gửi cho ekip.' : 'Chọn một hoặc nhiều ảnh phù hợp với buổi chụp.'}</p></div>
          <div className="heading-actions"><label className="search"><Search size={17} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm concept..." /></label><button className="filter-button" onClick={() => { setCategory('Tất cả'); setQuery('') }}><SlidersHorizontal size={16} /> Làm mới</button></div>
        </div>

        <div className="category-row">{categories.map(c => <button key={c} className={category === c ? 'category active' : 'category'} onClick={() => setCategory(c)}>{c}</button>)}</div>

        {view === 'selected' && <div className="customer-bar"><label>Tên khách hàng<input value={customer} onChange={e => setCustomer(e.target.value)} placeholder="Nhập tên khách..." /></label><span>{selected.length} ảnh đã chọn</span><button className="primary" onClick={exportCollage} disabled={busy}>{busy ? 'Đang xuất...' : <><Download size={16} /> Xuất bảng ảnh</>}</button></div>}

        <section className="gallery">
          {displayedItems.filter(item => view !== 'selected' || (category === 'Tất cả' || item.category === category) && `${item.title} ${item.category}`.toLowerCase().includes(query.toLowerCase())).map(item => {
            const isSelected = selected.some(x => x.id === item.id)
            return <article className={`photo-card ${isSelected ? 'is-selected' : ''}`} key={item.id}>
              <button className="photo-button" onClick={() => toggle(item)} aria-label={isSelected ? 'Bỏ chọn' : 'Chọn concept'}><img src={item.image} alt={item.title} loading="lazy" /><span className="photo-overlay"></span><span className="select-mark">{isSelected ? <Check size={17} /> : <Plus size={17} />}</span><span className="photo-type">{item.type}</span></button>
              <div className="photo-meta"><div><span>{item.category}</span><h3>{item.title}</h3></div><div className="photo-actions"><button className={`heart ${isSelected ? 'heart-on' : ''}`} onClick={() => toggle(item)} aria-label="Chọn ảnh"><Heart size={18} fill={isSelected ? 'currentColor' : 'none'} /></button>{isAdmin && !item.isDemo && <button className="delete-concept" onClick={() => deleteConcept(item)} disabled={busy} aria-label="Xóa concept" title="Xóa concept"><Trash2 size={17} /></button>}</div></div>
            </article>
          })}
          {displayedItems.filter(item => view !== 'selected' || (category === 'Tất cả' || item.category === category) && `${item.title} ${item.category}`.toLowerCase().includes(query.toLowerCase())).length === 0 && <div className="empty"><Images size={30} /><h3>{view === 'selected' ? 'Chưa có concept nào được chọn' : 'Không tìm thấy concept'}</h3><p>{view === 'selected' ? 'Quay lại thư viện và bấm dấu + trên ảnh m thích.' : 'Thử từ khóa khác hoặc làm mới bộ lọc.'}</p><button className="secondary" onClick={() => setView('library')}>Về thư viện</button></div>}
        </section>

        {view === 'library' && <div className="bottom-cta"><div><b>Đã tìm được concept ưng ý?</b><span>Chọn ảnh rồi gom thành một bảng gửi ekip.</span></div><button className="primary" onClick={() => setView('selected')}>Xem concept đã chọn <ArrowLeft size={16} className="arrow-flip" /></button></div>}
      </main>

      <footer><div className="brand footer-brand"><span><b>Kho Concept</b></span></div><span>Concept library · Bản thử nghiệm</span><span>© KHO CONCEPT</span></footer>

      <div id="export-sheet" className="export-sheet"><div className="export-header"><div className="brand-mark">K</div><div><div className="export-kicker">KHO CONCEPT</div><h2>BẢNG CONCEPT CHỤP ẢNH</h2><p>Khách hàng: {customer.trim() || 'Chưa nhập tên'}</p></div></div><div className="export-grid">{selected.map((item, i) => <div className="export-tile" key={item.id}><img src={item.image} crossOrigin="anonymous" alt={item.title} /><div><small>{String(i + 1).padStart(2, '0')} · {item.category}</small><b>{item.title}</b></div></div>)}</div><div className="export-footer">CONCEPT REFERENCE · KHO CONCEPT</div></div>

      {adminOpen && <div className="modal-backdrop" onClick={() => setAdminOpen(false)}><div className="admin-modal" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setAdminOpen(false)} aria-label="Đóng"><X size={18} /></button><span className="eyebrow"><ShieldCheck size={14} /> KHU VỰC QUẢN TRỊ</span>
        {isAdmin ? <><h2>Đã đăng nhập</h2><p>Tài khoản quản trị có thể thêm và xóa concept. Đóng cửa sổ này để dùng bảng quản trị bên dưới phần đầu trang.</p><button className="primary full" onClick={() => setAdminOpen(false)}>Tiếp tục quản lý</button><button className="secondary full logout-modal" onClick={signOutAdmin}><LogOut size={15} /> Đăng xuất</button></> : <><h2>Đăng nhập admin</h2><p>Đăng nhập bằng tài khoản đã tạo trong Supabase Authentication.</p><form onSubmit={signInAdmin}><label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="Email quản trị" autoComplete="username" /></label><label>Mật khẩu<input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Mật khẩu admin" autoComplete="current-password" /></label><button className="primary full" disabled={busy}>{busy ? 'Đang xử lý...' : 'Đăng nhập'}</button></form><small className="modal-foot">Chỉ email quản trị đã cấu hình mới có quyền thêm hoặc xóa concept.</small></>}
    setNotice('Đang tải ảnh lên, ní đợi một chút nha...')
    const safeName = imageFile.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-')
    const storagePath = `${session.user.id}/${Date.now()}-${safeName || 'concept-image'}`

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, imageFile, {
      cacheControl: '3600', upsert: false, contentType: imageFile.type
    })
    if (uploadError) {
      setBusy(false)
      return setNotice(`Tải ảnh thất bại: ${uploadError.message}. Kiểm tra bucket và quyền Storage nha.`)
    }

    const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
    const { error: insertError } = await supabase.from('concepts').insert({
      title: title.trim(), category: uploadCategory, type: 'Ảnh concept',
      image_url: publicData.publicUrl, storage_path: storagePath
    })

    if (insertError) {
      await supabase.storage.from(BUCKET).remove([storagePath])
      setBusy(false)
      return setNotice(`Ảnh đã tải lên nhưng chưa lưu được concept: ${insertError.message}`)
    }

    await loadConcepts()
    setTitle('')
    setImageFile(null)
    const fileInput = document.getElementById('concept-image-input')
    if (fileInput) fileInput.value = ''
    setBusy(false)
    setNotice('Đã thêm concept thành công!')
  }

  async function deleteConcept(item) {
    if (!isAdmin || item.isDemo) return
    if (!window.confirm(`Ní muốn xóa concept “${item.title}” chứ?`)) return
    setBusy(true)
    const { error: rowError } = await supabase.from('concepts').delete().eq('id', item.id)
    if (rowError) {
      setBusy(false)
      return setNotice(`Chưa xóa được concept: ${rowError.message}`)
    }
    if (item.storage_path) {
      const { error: storageError } = await supabase.storage.from(BUCKET).remove([item.storage_path])
      if (storageError) setNotice(`Đã xóa concept khỏi thư viện, nhưng ảnh trong kho chưa xóa được: ${storageError.message}`)
      else setNotice('Đã xóa concept.')
    } else setNotice('Đã xóa concept.')
    setSelected(prev => prev.filter(x => x.id !== item.id))
    await loadConcepts()
    setBusy(false)
  }

  const displayedItems = view === 'selected' ? selected : filtered

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="#" onClick={e => { e.preventDefault(); setView('library') }}><span><b>Kho Concept</b></span></a>
        <nav>
          <button className={view === 'library' ? 'nav-active' : ''} onClick={() => setView('library')}>Thư viện concept</button>
          <button className={view === 'selected' ? 'nav-active' : ''} onClick={() => setView('selected')}>Concept đã chọn <span className="count">{selected.length}</span></button>
        </nav>
        <button className="admin-button" onClick={() => setAdminOpen(true)}><ShieldCheck size={16} /> {isAdmin ? 'Quản trị' : 'Đăng nhập'}</button>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow"><Sparkles size={13} /> CONCEPT LIBRARY</span>
            <h1>Chọn concept.<br /><i>Lưu khoảnh khắc.</i></h1>
            <p>Khám phá ý tưởng chụp ảnh và chọn những khung hình m yêu thích.</p>
            <div className="hero-note"><span className="note-dot" /> {concepts.some(item => !item.isDemo) ? 'Concept từ thư viện' : 'Bản thử nghiệm · Ảnh minh họa'}</div>
          </div>
          <div className="hero-art">
            <div className="hero-image hero-image-one"><img src="https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=700&q=80" alt="Ảnh minh họa concept" /></div>
            <div className="hero-image hero-image-two"><img src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=500&q=80" alt="Ảnh minh họa chân dung" /></div>
            <div className="hero-stamp">IDEAS<br />TO KEEP</div>
          </div>
        </section>

        {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Đóng"><X size={15} /></button></div>}

        {isAdmin && <section className="admin-upload-panel">
          <div className="admin-panel-heading"><div><span className="eyebrow"><ShieldCheck size={14} /> QUẢN TRỊ</span><h2>Thêm concept mới</h2><p>Chọn ảnh, đặt tên và chọn đúng danh mục.</p></div><button className="secondary" onClick={signOutAdmin}><LogOut size={15} /> Đăng xuất</button></div>
          <form className="upload-form" onSubmit={addConcept}>
            <label className="upload-picker" htmlFor="concept-image-input"><Upload size={23} /><strong>{imageFile ? 'Đã chọn ảnh' : 'Chọn ảnh từ điện thoại'}</strong><span>{imageFile ? imageFile.name : 'Chạm để mở thư viện ảnh'}</span><input id="concept-image-input" type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} /></label>
            {imageFile && <img className="upload-preview" src={URL.createObjectURL(imageFile)} alt="Xem trước ảnh đã chọn" />}
            <label>Tên concept<input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ví dụ: Beauty ánh sáng cửa sổ" maxLength={120} required /></label>
            <label>Danh mục<select value={uploadCategory} onChange={e => setUploadCategory(e.target.value)}>{uploadCategories.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
            <button className="primary upload-submit" type="submit" disabled={busy}>{busy ? 'Đang xử lý...' : <><Plus size={17} /> Thêm concept vào thư viện</>}</button>
          </form>
        </section>}

        <div className="section-heading"><div><span className="eyebrow">TÌM CẢM HỨNG</span><h2>{view === 'selected' ? 'Concept đã chọn' : 'Thư viện concept'}</h2><p>{view === 'selected' ? 'Rà soát lựa chọn trước khi gửi cho ekip.' : 'Chọn một hoặc nhiều ảnh phù hợp với buổi chụp.'}</p></div>
          <div className="heading-actions"><label className="search"><Search size={17} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm concept..." /></label><button className="filter-button" onClick={() => { setCategory('Tất cả'); setQuery('') }}><SlidersHorizontal size={16} /> Làm mới</button></div>
        </div>

        <div className="category-row">{categories.map(c => <button key={c} className={category === c ? 'category active' : 'category'} onClick={() => setCategory(c)}>{c}</button>)}</div>

        {view === 'selected' && <div className="customer-bar"><label>Tên khách hàng<input value={customer} onChange={e => setCustomer(e.target.value)} placeholder="Nhập tên khách..." /></label><span>{selected.length} ảnh đã chọn</span><button className="primary" onClick={exportCollage} disabled={busy}>{busy ? 'Đang xuất...' : <><Download size={16} /> Xuất bảng ảnh</>}</button></div>}

        <section className="gallery">
          {displayedItems.filter(item => view !== 'selected' || (category === 'Tất cả' || item.category === category) && `${item.title} ${item.category}`.toLowerCase().includes(query.toLowerCase())).map(item => {
            const isSelected = selected.some(x => x.id === item.id)
            return <article className={`photo-card ${isSelected ? 'is-selected' : ''}`} key={item.id}>
              <button className="photo-button" onClick={() => toggle(item)} aria-label={isSelected ? 'Bỏ chọn' : 'Chọn concept'}><img src={item.image} alt={item.title} loading="lazy" /><span className="photo-overlay"></span><span className="select-mark">{isSelected ? <Check size={17} /> : <Plus size={17} />}</span><span className="photo-type">{item.type}</span></button>
              <div className="photo-meta"><div><span>{item.category}</span><h3>{item.title}</h3></div><div className="photo-actions"><button className={`heart ${isSelected ? 'heart-on' : ''}`} onClick={() => toggle(item)} aria-label="Chọn ảnh"><Heart size={18} fill={isSelected ? 'currentColor' : 'none'} /></button>{isAdmin && !item.isDemo && <button className="delete-concept" onClick={() => deleteConcept(item)} disabled={busy} aria-label="Xóa concept" title="Xóa concept"><Trash2 size={17} /></button>}</div></div>
            </article>
          })}
          {displayedItems.filter(item => view !== 'selected' || (category === 'Tất cả' || item.category === category) && `${item.title} ${item.category}`.toLowerCase().includes(query.toLowerCase())).length === 0 && <div className="empty"><Images size={30} /><h3>{view === 'selected' ? 'Chưa có concept nào được chọn' : 'Không tìm thấy concept'}</h3><p>{view === 'selected' ? 'Quay lại thư viện và bấm dấu + trên ảnh m thích.' : 'Thử từ khóa khác hoặc làm mới bộ lọc.'}</p><button className="secondary" onClick={() => setView('library')}>Về thư viện</button></div>}
        </section>

        {view === 'library' && <div className="bottom-cta"><div><b>Đã tìm được concept ưng ý?</b><span>Chọn ảnh rồi gom thành một bảng gửi ekip.</span></div><button className="primary" onClick={() => setView('selected')}>Xem concept đã chọn <ArrowLeft size={16} className="arrow-flip" /></button></div>}
      </main>

      <footer><div className="brand footer-brand"><span><b>Kho Concept</b></span></div><span>Concept library · Bản thử nghiệm</span><span>© KHO CONCEPT</span></footer>

      <div id="export-sheet" className="export-sheet"><div className="export-header"><div className="brand-mark">K</div><div><div className="export-kicker">KHO CONCEPT</div><h2>BẢNG CONCEPT CHỤP ẢNH</h2><p>Khách hàng: {customer.trim() || 'Chưa nhập tên'}</p></div></div><div className="export-grid">{selected.map((item, i) => <div className="export-tile" key={item.id}><img src={item.image} crossOrigin="anonymous" alt={item.title} /><div><small>{String(i + 1).padStart(2, '0')} · {item.category}</small><b>{item.title}</b></div></div>)}</div><div className="export-footer">CONCEPT REFERENCE · KHO CONCEPT</div></div>

      {adminOpen && <div className="modal-backdrop" onClick={() => setAdminOpen(false)}><div className="admin-modal" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setAdminOpen(false)} aria-label="Đóng"><X size={18} /></button><span className="eyebrow"><ShieldCheck size={14} /> KHU VỰC QUẢN TRỊ</span>
        {isAdmin ? <><h2>Đã đăng nhập</h2><p>Tài khoản quản trị có thể thêm và xóa concept. Đóng cửa sổ này để dùng bảng quản trị bên dưới phần đầu trang.</p><button className="primary full" onClick={() => setAdminOpen(false)}>Tiếp tục quản lý</button><button className="secondary full logout-modal" onClick={signOutAdmin}><LogOut size={15} /> Đăng xuất</button></> : <><h2>Đăng nhập admin</h2><p>Đăng nhập bằng tài khoản đã tạo trong Supabase Authentication.</p><form onSubmit={signInAdmin}><label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="Email quản trị" autoComplete="username" /></label><label>Mật khẩu<input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Mật khẩu admin" autoComplete="current-password" /></label><button className="primary full" disabled={busy}>{busy ? 'Đang xử lý...' : 'Đăng nhập'}</button></form><small className="modal-foot">Chỉ email quản trị đã cấu hình mới có quyền thêm hoặc xóa concept.</small></>}
