/* Employee.jsx — 직원 화면: 홈, 카탈로그, 상품상세, 장바구니, 주문내역 */
const { useState: useEmp } = React;

/* ---- 홈 화면 — 쇼핑몰 스타일 ---- */
const CAT_MENU = [
  { id:'상의',  label:'상의',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="22" height="22"><path d="M20.38 3.46 16 2l-4 4-4-4-4.38 1.46A2 2 0 0 0 2 5.57l.58 3.57A1 1 0 0 0 3.57 10H6v11a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V10h2.43a1 1 0 0 0 .99-.86l.58-3.57a2 2 0 0 0-1.62-2.11z"/></svg> },
  { id:'하의',  label:'하의',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="22" height="22"><path d="M4 4h16v6l-3 10H7L4 10V4z"/><path d="M12 4v8"/></svg> },
  { id:'신발',  label:'신발',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="22" height="22"><path d="M3 16h18l-2-9H5L3 16z"/><path d="M3 16c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2"/><path d="M9 7V5a2 2 0 0 1 4 0v2"/></svg> },
  { id:'보호구', label:'보호구',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="22" height="22"><path d="M12 2 4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4z"/></svg> },
  { id:'장갑',  label:'장갑',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="22" height="22"><path d="M18 11V6a2 2 0 0 0-4 0v0M14 10V4a2 2 0 0 0-4 0v2M10 10.5V6a2 2 0 0 0-4 0v8M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg> },
  { id:'안전',  label:'안전',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="22" height="22"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg> },
  { id:'동계용', label:'동계용',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="22" height="22"><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/><path d="m20 16-4-4 4-4M4 8l4 4-4 4m12-16-4 4-4-4m0 16 4-4 4 4"/></svg> },
  { id:'우천용', label:'우천용',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="22" height="22"><path d="M23 12a11.05 11.05 0 0 0-22 0zm-5 7a3 3 0 0 1-6 0v-7"/></svg> },
];

const HOME_STATUS = {
  pending:   { label:'승인대기', bg:'#FFFBEB', color:'#92400E', border:'#FDE68A' },
  approved:  { label:'승인됨',   bg:'#EFF6FF', color:'#1E40AF', border:'#BFDBFE' },
  shipped:   { label:'배송중',   bg:'#F0FDF4', color:'#166534', border:'#BBF7D0' },
  delivered: { label:'수령완료', bg:'#F9FAFB', color:'#6B7280', border:'#E5E7EB' },
  rejected:  { label:'반려됨',   bg:'#FEF2F2', color:'#991B1B', border:'#FECACA' },
};

function EmployeeHome({ setScreen, setSelectedProduct, setCart, openCart }) {
  const [slide, setSlide] = useEmp(0);
  const [hovCat, setHovCat] = useEmp(null);
  const [hovProd, setHovProd] = useEmp(null);
  const PF = "var(--font-sans)";
  const store = useStore();
  const activeBanners = store.banners.filter(b => b.active);

  React.useEffect(() => {
    const t = setInterval(() => setSlide(s => (s + 1) % (activeBanners.length || 1)), 4800);
    return () => clearInterval(t);
  }, [activeBanners.length]);

  function addToCart(product, e) {
    e && e.stopPropagation();
    const firstColor = product.colors?.[0] || null;
    const stockBySize = firstColor && product.stockByColorSize ? product.stockByColorSize[firstColor.id] || {} : product.stock;
    const firstSize = product.sizes.find(s => (stockBySize[s] || 0) > 0);
    if (!firstSize) return;
    setCart(prev => {
      const colorId = firstColor?.id || 'default';
      const idx = prev.findIndex(i => i.id === product.id && i.size === firstSize && (i.color?.id || 'default') === colorId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: (next[idx].qty || 1) + 1 };
        return next;
      }
      return [...prev, {
        ...product,
        color: firstColor,
        size: firstSize,
        variant_id: firstColor ? product.variantByColorSize?.[firstColor.id]?.[firstSize] || null : product.variantBySize?.[firstSize] || null,
        qty: 1,
      }];
    });
    openCart?.();
  }

  const featured = store.products.filter(p => p.active).slice(0, 8);
  const recentOrders = store.orders.slice(0, 2);

  const card = {
    background: 'rgba(255,255,255,0.75)',
    backdropFilter: 'blur(20px) saturate(140%)',
    border: '1px solid rgba(255,255,255,0.65)',
    boxShadow: '0 2px 8px rgba(10,37,64,0.06)',
  };

  return (
    <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', fontFamily: PF }}>

      {/* ══ 히어로 배너 ══ */}
      <div style={{ position:'relative', height:280, overflow:'hidden', flexShrink:0 }}>
        {activeBanners.map((sl, i) => (
          <div key={i} style={{
            position:'absolute', inset:0,
            background: sl.bg,
            display:'flex', alignItems:'center',
            padding:'0 40px',
            opacity: slide===i ? 1 : 0,
            transform: slide===i ? 'translateX(0)' : 'translateX(24px)',
            transition: 'opacity 480ms ease, transform 480ms ease',
            pointerEvents: slide===i ? 'auto' : 'none',
          }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:11, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.6)', marginBottom:12 }}>
                {sl.tag}
              </div>
              <div style={{ fontSize:40, fontWeight:800, color:'#fff', lineHeight:1.15, letterSpacing:'-0.03em', marginBottom:14, whiteSpace:'pre-line' }}>
                {sl.title}
              </div>
              <div style={{ fontSize:13.5, color:'rgba(255,255,255,0.7)', lineHeight:1.65, marginBottom:24, whiteSpace:'pre-line' }}>
                {sl.sub}
              </div>
              <button onClick={() => setScreen('catalog')} style={{
                padding:'12px 26px', borderRadius:999,
                background:'#fff', color:'#042C44',
                border:'none', cursor:'pointer',
                fontSize:13.5, fontWeight:700, fontFamily:PF, letterSpacing:'-0.01em',
              }}>{sl.cta}</button>
            </div>
            <div style={{ width:200, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
              <div style={{ width:170, height:170, borderRadius:999, background:'rgba(255,255,255,0.1)', position:'absolute' }} />
              <div style={{ fontSize:108, lineHeight:1, filter:'drop-shadow(0 20px 40px rgba(0,0,0,0.22))', position:'relative' }}>
                {sl.thumb}
              </div>
            </div>
          </div>
        ))}
        {/* 도트 인디케이터 */}
        <div style={{ position:'absolute', bottom:18, left:'50%', transform:'translateX(-50%)', display:'flex', gap:6 }}>
          {activeBanners.map((_, i) => (
            <button key={i} onClick={() => setSlide(i)} style={{
              width: slide===i ? 20 : 6, height:6, borderRadius:999, padding:0, border:'none', cursor:'pointer',
              background: slide===i ? '#fff' : 'rgba(255,255,255,0.38)',
              transition:'all 300ms ease',
            }} />
          ))}
        </div>
      </div>

      {/* ══ 카테고리 퀵 메뉴 ══ */}
      <div style={{ padding:'32px 24px 0' }}>
        <div style={{ ...card, borderRadius:18, padding:'18px 20px' }}>
          <div style={{ display:'flex', gap:2 }}>
            {CAT_MENU.map(cat => (
              <button key={cat.id} onClick={() => setScreen('catalog')}
                onMouseEnter={() => setHovCat(cat.id)}
                onMouseLeave={() => setHovCat(null)}
                style={{
                  flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:7,
                  padding:'10px 4px', borderRadius:12, border:'none',
                  background: hovCat===cat.id ? 'var(--accent-050)' : 'transparent',
                  cursor:'pointer', transition:'all 140ms',
                }}>
                <div style={{
                  width:42, height:42, borderRadius:999,
                  background: hovCat===cat.id ? 'var(--accent)' : 'rgba(10,37,64,0.06)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color: hovCat===cat.id ? '#fff' : 'var(--fg-2)',
                  transition:'all 140ms',
                }}>{cat.icon}</div>
                <span style={{
                  fontSize:11, fontWeight:600,
                  color: hovCat===cat.id ? 'var(--accent)' : 'var(--fg-2)',
                  transition:'color 140ms', whiteSpace:'nowrap',
                }}>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ══ 추천 상품 슬라이더 ══ */}
      <div style={{ padding:'32px 24px 0' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <span style={{ fontWeight:700, fontSize:17, color:'var(--fg-1)', letterSpacing:'-0.02em' }}>이번 달 추천 상품</span>
          <button onClick={() => setScreen('catalog')} style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, fontWeight:500, color:'var(--accent)', fontFamily:PF, padding:0 }}>전체 보기</button>
        </div>
        <div className="prod-slider" style={{ display:'flex', gap:14, overflowX:'auto', paddingBottom:8, paddingRight:48, scrollSnapType:'x mandatory' }}>
          {featured.map(p => {
            const isHov = hovProd===p.id;
            return (
              <div key={p.id}
                onMouseEnter={() => setHovProd(p.id)}
                onMouseLeave={() => setHovProd(null)}
                onClick={() => { setSelectedProduct(p); setScreen('detail'); }}
                style={{
                  width:192, flexShrink:0,
                  ...card,
                  borderRadius:16, overflow:'hidden', cursor:'pointer',
                  scrollSnapAlign:'start',
                  boxShadow: isHov ? '0 8px 24px rgba(10,37,64,0.11)' : '0 2px 8px rgba(10,37,64,0.06)',
                  transform: isHov ? 'translateY(-3px)' : 'translateY(0)',
                  transition:'box-shadow 220ms, transform 220ms',
                }}
              >
                <div style={{ position:'relative', paddingTop:'65%', background:'linear-gradient(145deg,#EAF4FF,#D4E8FB)', overflow:'hidden' }}>
                  <div style={{
                    position:'absolute', inset:0,
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:58,
                    transform: isHov ? 'scale(1.07)' : 'scale(1)',
                    transition:'transform 280ms ease',
                  }}>{p.thumb}</div>
                  {/* 담기 슬라이드업 */}
                  <div style={{
                    position:'absolute', left:0, right:0, bottom:0, padding:'10px 12px',
                    background:'linear-gradient(0deg,rgba(4,44,68,0.72) 0%,transparent 100%)',
                    display:'flex', justifyContent:'center',
                    transform: isHov ? 'translateY(0)' : 'translateY(110%)',
                    transition:'transform 220ms ease',
                  }}>
                    <button onClick={e => addToCart(p, e)} style={{
                      padding:'7px 20px', borderRadius:999,
                      background:'#fff', color:'var(--fg-1)',
                      border:'none', cursor:'pointer',
                      fontSize:12.5, fontWeight:700, fontFamily:PF,
                    }}>담기</button>
                  </div>
                  {p.tag && (
                    <div style={{ position:'absolute', top:9, left:9, padding:'2px 8px', borderRadius:9999, background:'var(--accent-050)', color:'var(--accent-600)', fontSize:10, fontWeight:600, border:'1px solid var(--accent-200)' }}>{p.tag}</div>
                  )}
                </div>
                <div style={{ padding:'12px 14px 16px' }}>
                  <div style={{ fontSize:10.5, color:'var(--fg-3)', marginBottom:3, fontWeight:500 }}>{p.cat}</div>
                  <div style={{ fontSize:13.5, fontWeight:700, color:'var(--fg-1)', lineHeight:1.3, letterSpacing:'-0.01em' }}>{p.name}</div>
                  <div style={{ fontSize:15, fontWeight:800, color:'var(--accent)', marginTop:7 }}>
                    {fmtPts(p.pts)}<span style={{ fontSize:11, fontWeight:500, marginLeft:2, color:'var(--fg-3)' }}>P</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ══ 최근 주문 (컴팩트) ══ */}
      <div style={{ padding:'32px 24px 48px' }}>
        <div style={{ ...card, borderRadius:16, padding:'16px 20px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <span style={{ fontWeight:700, fontSize:14, color:'var(--fg-1)', letterSpacing:'-0.01em' }}>최근 주문</span>
            <button onClick={() => setScreen('orders')} style={{ background:'none', border:'none', cursor:'pointer', fontSize:12.5, fontWeight:500, color:'var(--accent)', fontFamily:PF, padding:0 }}>전체 주문 내역 보기</button>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {recentOrders.map(order => {
              const sc = HOME_STATUS[order.status] || HOME_STATUS.delivered;
              return (
                <div key={order.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'rgba(10,37,64,0.03)', borderRadius:11 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:13, color:'var(--fg-1)', letterSpacing:'-0.01em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{order.items}</div>
                    <div style={{ fontSize:11, color:'var(--fg-4)', marginTop:2, fontFamily:'var(--font-mono)' }}>{order.date}</div>
                  </div>
                  <span style={{ fontSize:11, fontWeight:600, padding:'3px 9px', borderRadius:999, background:sc.bg, color:sc.color, border:'1px solid '+sc.border, flexShrink:0 }}>{sc.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}
/* ---- 카탈로그 화면 (나이키 스타일) ---- */
function EmployeeCatalog({ setScreen, setSelectedProduct }) {
  const store = useStore();
  const [search, setSearch] = useEmp('');
  const [cat, setCat] = useEmp('전체');
  const cats = ['전체', '상의', '하의', '신발', '보호구', '장갑', '안전', '동계용', '우천용'];

  const filtered = store.products.filter(p =>
    p.active &&
    (cat === '전체' || p.cat === cat) &&
    (search === '' || p.name.includes(search))
  );

  return (
    <div className="nike-catalog">
      <div className="nike-catalog-head">
        <div className="nike-catalog-inner">
          <div className="nike-cats">
            {cats.map(c => (
              <button key={c} onClick={()=>setCat(c)} className={cat===c ? 'active' : ''}>{c}</button>
            ))}
          </div>
          <div className="nike-search">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
            <input placeholder="상품 검색" value={search} onChange={e=>setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="nike-count"><div className="nike-catalog-inner">{filtered.length}개 상품</div></div>

      <div className="nike-catalog-body">
        <div className="nike-grid">
          {filtered.map(p => (
            <div key={p.id} className="nike-card" onClick={()=>{setSelectedProduct(p); setScreen('detail');}}>
              <div className="nike-thumb">{p.thumb}</div>
              <div className="nike-meta">
                <div className="nike-cat">{p.cat}</div>
                <div className="nike-name">{p.name}</div>
                {p.colors?.length > 0 && (
                  <div style={{display:'flex', alignItems:'center', gap:6, marginTop:8}}>
                    {p.colors.slice(0,4).map(c => (
                      <span key={c.id} title={c.name} style={{
                        width:14, height:14, borderRadius:999,
                        background:c.value,
                        border:c.value==='#F8F8F4' ? '1px solid #d8d8d8' : '1px solid rgba(0,0,0,0.16)',
                      }} />
                    ))}
                    {p.colors.length > 4 && (
                      <span style={{fontSize:10, color:'#757575', fontFamily:'var(--font-sans)'}}>+{p.colors.length - 4}</span>
                    )}
                  </div>
                )}
                <div className="nike-price">{fmtPts(p.pts)} P</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---- 상품 상세 화면 (나이키 스타일) ---- */
function ProductDetail({ product, setScreen, setSelectedProduct, cart, setCart, openCart }) {
  const store = useStore();
  const [color, setColor] = useEmp(product?.colors?.[0] || null);
  const [size, setSize] = useEmp(null);
  const [added, setAdded] = useEmp(false);
  const [activeThumb, setActiveThumb] = useEmp(0);
  const [openDisclosure, setOpenDisclosure] = useEmp(null);
  if (!product) return null;

  const NKF = "'Pretendard Variable', Pretendard, -apple-system, 'Apple SD Gothic Neo', sans-serif";
  const colors = product.colors || [];
  const needsColor = colors.length > 0;
  const selectedColor = needsColor ? color : null;
  const selectedStock = selectedColor && product.stockByColorSize ? product.stockByColorSize[selectedColor.id] || {} : product.stock;
  const canAddToCart = (!needsColor || selectedColor) && !!size;

  // 실제 상품 이미지로 갤러리 구성 (메인 + 추가 이미지)
  const galleryImages = [product.imageUrl, ...(product.extraImages||[])].filter(Boolean);
  const activeImage = galleryImages[activeThumb] || null;
  const recommendations = store.products.filter(p => p.active && p.id !== product.id).slice(0, 3);

  function addToCart() {
    if (!canAddToCart) return;
    setCart(prev => {
      const colorId = selectedColor?.id || 'default';
      const idx = prev.findIndex(i=>i.id===product.id && i.size===size && (i.color?.id || 'default')===colorId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: (next[idx].qty || 1) + 1 };
        return next;
      }
      return [...prev, {
        ...product,
        color: selectedColor,
        size,
        variant_id: selectedColor ? product.variantByColorSize?.[selectedColor.id]?.[size] || null : product.variantBySize?.[size] || null,
        qty: 1,
      }];
    });
    setAdded(true);
    setTimeout(()=>setAdded(false), 1800);
  }

  return (
    <div style={{flex:1, overflowY:'auto', background:'#fff'}}>
      {/* 뒤로 가기 */}
      <div style={{padding:'14px 24px', borderBottom:'1px solid #e5e5e5'}}>
        <button onClick={()=>setScreen('catalog')} style={{
          background:'none', border:'none', cursor:'pointer',
          fontSize:13, color:'#757575', fontFamily:NKF,
          display:'flex', alignItems:'center', gap:6, padding:0,
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="14" height="14"><polyline points="15 18 9 12 15 6"/></svg>
          카탈로그
        </button>
      </div>

      {/* 본문 */}
      <div style={{
        display:'grid',
        gridTemplateColumns:'58px minmax(0, 1fr) 420px',
        gap:0,
        padding:'32px 24px 18px',
        maxWidth:1100,
        margin:'0 auto',
        alignItems:'start',
      }}>

        {/* 좌측 세로 썸네일 */}
        <div style={{display:'flex', flexDirection:'column', gap:8, paddingRight:12}}>
          {galleryImages.length > 0 ? galleryImages.map((imgUrl, i) => (
            <div key={i} onClick={()=>setActiveThumb(i)}
              style={{
                width:46, height:56, borderRadius:4, background:'#f0f0f0',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:20, cursor:'pointer', overflow:'hidden',
                border: activeThumb===i ? '1.5px solid #111' : '1.5px solid transparent',
                transition:'border-color 120ms',
              }}>
              <img src={imgUrl} alt="" style={{width:'100%', height:'100%', objectFit:'cover', opacity: activeThumb===i ? 1 : 0.6}} onError={e=>e.target.style.display='none'}/>
            </div>
          )) : (
            <div style={{width:46, height:56, borderRadius:4, background:'#f0f0f0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20}}>
              {product.thumb}
            </div>
          )}
        </div>

        {/* 메인 이미지 */}
        <div style={{
          background:'linear-gradient(145deg,#f7f7f7,#eeeeee)',
          borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:140, height:704, maxHeight:'calc(100vh - 190px)', minHeight:520, marginRight:40,
          position:'relative',
          alignSelf:'start',
        }}>
          {activeImage
            ? <img src={activeImage} alt={product.name} style={{maxWidth:'72%', maxHeight:'72%', objectFit:'contain', filter:'drop-shadow(0 12px 32px rgba(0,0,0,0.12))'}}/>
            : <span style={{filter:'drop-shadow(0 12px 32px rgba(0,0,0,0.12))'}}>{product.thumb}</span>}
          {product.tag==='인기' && (
            <span style={{position:'absolute',top:20,left:20,fontSize:11,fontWeight:600,color:'var(--accent-600)',background:'var(--accent-050)',border:'1px solid var(--accent-200)',borderRadius:9999,padding:'3px 10px',fontFamily:NKF}}>인기</span>
          )}
        </div>

        {/* 우측 상품 정보 */}
        <div style={{display:'flex', flexDirection:'column', gap:0, paddingTop:4, alignSelf:'start'}}>
          {/* 카테고리 + 이름 + 가격 */}
          <div style={{fontSize:12, color:'#757575', fontFamily:NKF, fontWeight:500, marginBottom:6}}>{product.cat}</div>
          <h1 style={{margin:'0 0 4px', fontSize:24, fontWeight:800, color:'#111', fontFamily:NKF, lineHeight:1.2, letterSpacing:'-0.02em'}}>{product.name}</h1>
          <div style={{fontSize:16, fontWeight:600, color:'#111', fontFamily:NKF, marginBottom:24}}>
            {fmtPts(product.pts)}P
          </div>

          {/* 색상 선택 */}
          {needsColor && (
            <>
              <div style={{marginBottom:8, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <span style={{fontSize:13, fontWeight:600, color:'#111', fontFamily:NKF}}>색상 선택</span>
                {selectedColor && <span style={{fontSize:12, color:'#757575', fontFamily:NKF}}>{selectedColor.name}</span>}
              </div>
              {!selectedColor && <div style={{fontSize:12, color:'#fa3c00', marginBottom:10, fontFamily:NKF}}>색상을 선택해주세요</div>}
              <div style={{display:'flex', flexDirection:'column', gap:8, marginBottom:22}}>
                {colors.map(c => {
                  const isSelected = selectedColor?.id === c.id;
                  return (
                    <button key={c.id} onClick={()=>{setColor(c); setSize(null);}} style={{
                      width:'100%',
                      minHeight:48,
                      padding:'10px 12px',
                      border: isSelected ? '2px solid #111' : '1px solid #ddd',
                      borderRadius:4,
                      background:'#fff',
                      color:'#111',
                      cursor:'pointer',
                      display:'flex',
                      alignItems:'center',
                      justifyContent:'space-between',
                      fontSize:13,
                      fontWeight:isSelected ? 700 : 500,
                      fontFamily:NKF,
                      transition:'border-color 120ms',
                    }}>
                      <span style={{display:'flex', alignItems:'center', gap:10}}>
                        <span style={{
                          width:22,
                          height:22,
                          borderRadius:999,
                          background:c.value,
                          border:c.value==='#F8F8F4' ? '1px solid #d8d8d8' : '1px solid rgba(0,0,0,0.18)',
                          boxShadow:isSelected ? '0 0 0 3px #fff, 0 0 0 4px #111' : 'none',
                          flexShrink:0,
                        }} />
                        {c.name}
                      </span>
                      {isSelected && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* 사이즈 선택 */}
          <div style={{marginBottom:8, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <span style={{fontSize:13, fontWeight:600, color:'#111', fontFamily:NKF}}>사이즈 선택</span>
            <span style={{fontSize:12, color:'#757575', fontFamily:NKF, textDecoration:'underline', cursor:'pointer'}}>사이즈 가이드</span>
          </div>
          {!size && <div style={{fontSize:12, color:'#fa3c00', marginBottom:10, fontFamily:NKF}}>사이즈를 선택해주세요</div>}
          <div style={{display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8, marginBottom:20}}>
            {product.sizes.map(s => {
              const stockQty = selectedStock[s] || 0;
              const inStock = stockQty > 0;
              const isSelected = size === s;
              return (
                <button key={s} onClick={()=>inStock&&setSize(s)} style={{
                  padding:'14px 8px',
                  border: isSelected ? '2px solid #111' : '1px solid #ddd',
                  borderRadius:4,
                  background: isSelected ? '#111' : '#fff',
                  color: isSelected ? '#fff' : inStock ? '#111' : '#bbb',
                  fontSize:13, fontWeight:500, fontFamily:NKF,
                  cursor: inStock ? 'pointer' : 'not-allowed',
                  textDecoration: inStock ? 'none' : 'line-through',
                  transition:'all 120ms',
                  position:'relative',
                }}>
                  {s}
                  {inStock && stockQty<=3 && !isSelected && (
                    <span style={{position:'absolute',top:4,right:6,fontSize:9,color:'#fa3c00',fontWeight:700}}>잔{stockQty}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 재고 안내 */}
          {size && selectedStock[size] <= 3 && selectedStock[size] > 0 && (
            <div style={{fontSize:12, color:'#fa3c00', marginBottom:12, fontFamily:NKF, fontWeight:500}}>
              이 조합은 {selectedStock[size]}개만 남았어요.
            </div>
          )}

          {/* 장바구니 CTA */}
          <button onClick={addToCart} disabled={!canAddToCart} style={{
            width:'100%', height:56, borderRadius:28,
            background: canAddToCart ? '#111' : '#e5e5e5',
            color: canAddToCart ? '#fff' : '#999',
            border:'none', cursor: canAddToCart ? 'pointer' : 'not-allowed',
            fontSize:15, fontWeight:700, fontFamily:NKF,
            letterSpacing:'-0.01em', transition:'background 160ms',
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            marginBottom:12,
          }}>
            {added
              ? <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg>담겼어요</>
              : '장바구니에 담기'}
          </button>
          <button onClick={()=>openCart?.()} style={{
            width:'100%', height:52, borderRadius:28,
            background:'#fff', color:'#111',
            border:'1.5px solid #ddd', cursor:'pointer',
            fontSize:14, fontWeight:600, fontFamily:NKF,
            transition:'border-color 160ms',
          }}>
            장바구니 보기 ({cart.reduce((s,i)=>s+(i.qty||1),0)})
          </button>

          {/* ── 요약 설명 ── */}
          {product.desc && (
            <p style={{ margin:'0 0 16px', fontSize:13, color:'#757575', fontFamily:NKF, lineHeight:1.7 }}>{product.desc}</p>
          )}

          {/* ── disclosure rows ── */}
          {[
            { key:'info',    label:'상품 정보',   content: product.detailInfo || '100% 폴리에스터 소재, 현장 작업에 최적화된 내구성 원단. 반사 테이프 적용으로 야간 안전성 확보.' },
            { key:'ship',    label:'배송 안내',    content: product.shippingInfo || '승인 후 2~3 영업일 내 발송. 사내 물류팀을 통해 근무지로 배송됩니다.' },
            { key:'return',  label:'교환·반품',    content: product.returnInfo || '수령 후 7일 이내 미착용 상태에서 교환 가능. 담당자에게 문의 후 반품 절차 안내 받으세요.' },
          ].map(d => (
            <div key={d.key} style={{ borderTop:'1px solid #e5e5e5' }}>
              <button
                onClick={() => setOpenDisclosure(openDisclosure===d.key ? null : d.key)}
                style={{
                  width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center',
                  padding:'18px 0', background:'none', border:'none', cursor:'pointer',
                  fontSize:13, fontWeight:600, color:'#111', fontFamily:NKF,
                  textAlign:'left',
                }}
              >
                {d.label}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="14" height="14"
                  style={{ transform: openDisclosure===d.key ? 'rotate(180deg)' : 'rotate(0deg)', transition:'transform 200ms', flexShrink:0 }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              {openDisclosure===d.key && (
                <div style={{ padding:'0 0 18px', fontSize:13, color:'#757575', fontFamily:NKF, lineHeight:1.7 }}>
                  {d.content}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 다른 제품 추천 */}
      <div style={{maxWidth:1100, margin:'0 auto', padding:'20px 24px 48px'}}>
        <div style={{fontSize:20, fontWeight:800, color:'#111', marginBottom:6, letterSpacing:'-0.02em', fontFamily:NKF}}>다른 제품 추천</div>
        <div style={{fontSize:13, color:'#757575', marginBottom:18, fontFamily:NKF}}>비슷한 카테고리의 다른 제품을 확인해보세요.</div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(3, minmax(0,1fr))', gap:16}}>
          {recommendations.map(p => (
            <div key={p.id} onClick={()=>{ setSelectedProduct?.(p); setScreen('detail'); }} style={{cursor:'pointer'}}>
              <div style={{
                aspectRatio:'1 / 1',
                background:'#f5f5f5',
                display:'flex',
                alignItems:'center',
                justifyContent:'center',
                fontSize:'clamp(52px, 8vw, 74px)',
              }}>{p.imageUrl ? <img src={p.imageUrl} alt={p.name} style={{maxWidth:'70%', maxHeight:'70%', objectFit:'contain'}}/> : p.thumb}</div>
              <div style={{marginTop:10, fontSize:12, color:'#8d8d8f', fontWeight:600, fontFamily:NKF}}>{p.cat}</div>
              <div style={{marginTop:2, fontSize:17, color:'#111', fontWeight:700, lineHeight:1.28, letterSpacing:'-0.01em', fontFamily:NKF}}>{p.name}</div>
              <div style={{marginTop:8, fontSize:16, color:'#111', fontWeight:700, fontFamily:NKF}}>{fmtPts(p.pts)}P</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---- 장바구니 화면 ---- */
function EmployeeCart({ cart, setCart, setScreen }) {
  const [submitted, setSubmitted] = useEmp(false);
  const total = cart.reduce((s,i)=>s+i.pts, 0);
  const remaining = EMPLOYEE.points - total;

  function removeItem(idx) { setCart(prev => prev.filter((_,i)=>i!==idx)); }
  function submitOrder() { setSubmitted(true); setTimeout(()=>{setCart([]);setSubmitted(false);setScreen('orders');}, 2000); }

  if (submitted) return (
    <div className="content" style={{justifyContent:'center', alignItems:'center', height:'100%'}}>
      <div className="glass-card" style={{textAlign:'center', padding:48, maxWidth:400}}>
        <div style={{width:64, height:64, borderRadius:999, background:'var(--ok-050)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px'}}>
          <Icon name="check" size={32} color="var(--ok)"/>
        </div>
        <h2 style={{fontFamily:'var(--font-display)', fontWeight:700, fontSize:22, color:'var(--fg-1)', margin:'0 0 8px'}}>주문이 접수됐어요</h2>
        <p style={{color:'var(--fg-3)', fontSize:14, fontFamily:'var(--font-sans)', margin:0}}>관리자 승인 후 배송이 시작됩니다.</p>
      </div>
    </div>
  );

  if (cart.length === 0) return (
    <div className="content" style={{justifyContent:'center', alignItems:'center'}}>
      <div className="empty">
        <div className="empty-icon"><Icon name="cart" size={28}/></div>
        <h3>장바구니가 비어있어요</h3>
        <p>카탈로그에서 작업복을 담아보세요.</p>
        <button className="btn btn-primary" onClick={()=>setScreen('catalog')}>카탈로그 보기</button>
      </div>
    </div>
  );

  return (
    <div className="content">
      <div style={{display:'grid', gridTemplateColumns:'1fr 320px', gap:18, alignItems:'start'}}>
        {/* 아이템 목록 */}
        <div className="glass-card">
          <div style={{fontFamily:'var(--font-display)', fontWeight:600, fontSize:16, color:'var(--fg-1)', marginBottom:4}}>
            장바구니 <span style={{color:'var(--fg-3)', fontWeight:400, fontSize:14}}>({cart.length}개)</span>
          </div>
          {cart.map((item, idx) => (
            <div key={idx} className="cart-item">
              <div className="cart-thumb">{item.thumb}</div>
              <div>
                <div className="cart-item-name">{item.name}</div>
                <div className="cart-item-meta">{item.color ? `${item.color.name} · ` : ''}사이즈 {item.size} · {item.cat}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div className="cart-item-pts">{fmtPts(item.pts)}P</div>
                <button onClick={()=>removeItem(idx)} style={{background:'none',border:'none',color:'var(--fg-3)',cursor:'pointer',fontSize:12,marginTop:4,fontFamily:'var(--font-sans)'}}>삭제</button>
              </div>
            </div>
          ))}
        </div>
        {/* 결제 요약 */}
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div className="glass-card">
            <div style={{fontFamily:'var(--font-display)', fontWeight:600, fontSize:16, color:'var(--fg-1)', marginBottom:16}}>주문 요약</div>
            <div style={{display:'flex',flexDirection:'column',gap:10,fontFamily:'var(--font-sans)',fontSize:14}}>
              <div style={{display:'flex',justifyContent:'space-between',color:'var(--fg-2)'}}>
                <span>상품 합계</span><span style={{fontWeight:600}}>{fmtPts(total)}P</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',color:'var(--fg-2)'}}>
                <span>현재 포인트</span><span style={{fontWeight:600, color:'var(--accent)'}}>{fmtPts(EMPLOYEE.points)}P</span>
              </div>
              <div className="divider"/>
              <div style={{display:'flex',justifyContent:'space-between',fontWeight:700,fontSize:16,color:remaining<0?'var(--err)':'var(--fg-1)'}}>
                <span>결제 후 잔액</span><span>{fmtPts(remaining)}P</span>
              </div>
            </div>
            {remaining < 0 && <div style={{marginTop:12,padding:'10px 14px',borderRadius:10,background:'var(--err-050)',color:'var(--err)',fontSize:13,fontFamily:'var(--font-sans)'}}>
              포인트가 부족해요. {fmtPts(Math.abs(remaining))}P 초과됩니다.
            </div>}
          </div>
          <button className="btn btn-primary btn-lg" style={{width:'100%'}} onClick={submitOrder} disabled={remaining<0}>
            <Icon name="check"/> 포인트로 주문하기
          </button>
          <button className="btn btn-secondary" style={{width:'100%'}} onClick={()=>setScreen('catalog')}>쇼핑 계속하기</button>
        </div>
      </div>
    </div>
  );
}

/* ---- 주문 내역 화면 ---- */
function EmployeeOrders() {
  const store = useStore();
  const [filter, setFilter] = useEmp('전체');
  const statusFilters = ['전체','pending','approved','shipped','delivered','rejected'];
  const labelMap = { 전체:'전체', pending:'대기', approved:'승인', shipped:'배송중', delivered:'완료', rejected:'반려' };
  const filtered = filter==='전체' ? store.orders : store.orders.filter(o=>o.status===filter);

  return (
    <div className="content">
      <div style={{display:'flex', gap:10, alignItems:'center'}}>
        <div className="seg">
          {statusFilters.map(f=><button key={f} className={filter===f?'active':''} onClick={()=>setFilter(f)}>{labelMap[f]}</button>)}
        </div>
      </div>
      <div className="glass-card" style={{padding:0, overflow:'hidden'}}>
        <table className="ww-table">
          <thead><tr>
            <th>주문번호</th><th>상품</th><th>포인트</th><th>상태</th><th>날짜</th>
          </tr></thead>
          <tbody>
            {filtered.map(o=>(
              <tr key={o.id}>
                <td style={{fontFamily:'var(--font-mono)', fontSize:12, color:'var(--fg-3)'}}>{o.id}</td>
                <td style={{fontWeight:500, maxWidth:220}}>{o.items}</td>
                <td style={{fontFamily:'var(--font-display)', fontWeight:700, color:'var(--accent)', fontSize:15}}>{fmtPts(o.pts)}P</td>
                <td><StatusChip status={o.status}/></td>
                <td style={{color:'var(--fg-3)', fontSize:12, fontFamily:'var(--font-mono)'}}>{o.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length===0 && (
          <div className="empty"><div className="empty-icon"><Icon name="orders" size={24}/></div><h3>주문 내역이 없어요</h3></div>
        )}
      </div>
    </div>
  );
}

/* ---- 장바구니 드로어 ---- */
function CartDrawer({ isOpen, onClose, cart, setCart }) {
  const [submitted, setSubmitted] = useEmp(false);
  const PF = "var(--font-sans)";

  function updateQty(idx, delta) {
    setCart(prev => {
      const newQty = (prev[idx].qty || 1) + delta;
      if (newQty <= 0) return prev.filter((_, i) => i !== idx);
      return prev.map((it, i) => i === idx ? { ...it, qty: newQty } : it);
    });
  }

  function removeItem(idx) {
    setCart(prev => prev.filter((_, i) => i !== idx));
  }

  function submitOrder() {
    (async () => {
      try {
        const excluded = cart.filter(i => !i.variant_id);
        if (excluded.length) alert(`아래 상품은 옵션 정보가 없어 주문에서 제외됩니다:\n${excluded.map(i => i.name).join('\n')}`);
        const items = cart.filter(i => i.variant_id).map(i => ({ variant_id: i.variant_id, quantity: i.qty || 1 }));
        if (!items.length) throw new Error('주문 가능한 상품이 없습니다. 상품을 다시 선택해주세요.');
        await WW.createOrder({ items });
        await WW.bootstrap();
        setSubmitted(true);
        setTimeout(() => { setCart([]); setSubmitted(false); onClose(); }, 1600);
      } catch (e) {
        alert(e.message || '주문 실패');
      }
    })();
  }

  const total = cart.reduce((s, i) => s + i.pts * (i.qty || 1), 0);
  const remaining = EMPLOYEE.points - total;
  const totalQty = cart.reduce((s, i) => s + (i.qty || 1), 0);

  const qBtn = (label, onClick) => ({
    width: 28, height: 28, background: 'rgba(255,255,255,0.9)',
    border: '1px solid rgba(10,37,64,0.13)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 16, color: 'var(--fg-2)', fontFamily: PF,
  });

  return (
    <>
      {/* ── 배경 딤 ── */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.22)',
        opacity: isOpen ? 1 : 0,
        pointerEvents: isOpen ? 'auto' : 'none',
        transition: 'opacity 200ms ease',
      }} />

      {/* ── 드로어 패널 ── */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 201,
        width: 400,
        background: 'rgba(246,250,255,0.97)',
        backdropFilter: 'blur(28px) saturate(160%)',
        borderLeft: '1px solid rgba(214,232,255,0.8)',
        boxShadow: '-8px 0 40px rgba(10,37,64,0.13)',
        display: 'flex', flexDirection: 'column',
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 200ms ease',
        fontFamily: PF,
      }}>

        {/* 헤더 */}
        <div style={{
          padding: '20px 22px 18px',
          borderBottom: '1px solid rgba(214,232,255,0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
          background: 'rgba(255,255,255,0.55)',
        }}>
          <span style={{ fontWeight: 700, fontSize: 17, color: 'var(--fg-1)', letterSpacing: '-0.02em' }}>
            장바구니
            <span style={{ fontWeight: 400, fontSize: 14, color: 'var(--fg-3)', marginLeft: 7 }}>({totalQty})</span>
          </span>
          <button onClick={onClose} style={{
            background: 'rgba(10,37,64,0.06)', border: 'none', cursor: 'pointer',
            width: 32, height: 32, borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--fg-2)',
          }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* 상품 리스트 (스크롤) */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 22px' }}>
          {submitted ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 14, textAlign: 'center' }}>
              <div style={{ width: 60, height: 60, borderRadius: 999, background: 'var(--ok-050)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--fg-1)', marginBottom: 4 }}>주문이 접수됐어요</div>
                <div style={{ fontSize: 13, color: 'var(--fg-3)' }}>관리자 승인 후 배송이 시작됩니다</div>
              </div>
            </div>
          ) : cart.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: 'var(--fg-3)' }}>
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
              <div style={{ fontSize: 14, fontWeight: 500 }}>장바구니가 비어있어요</div>
              <div style={{ fontSize: 12, color: 'var(--fg-4)' }}>카탈로그에서 상품을 담아보세요</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {cart.map((item, idx) => (
                <div key={idx} style={{
                  display: 'flex', gap: 14, alignItems: 'flex-start',
                  padding: '14px 16px',
                  background: 'rgba(255,255,255,0.8)',
                  borderRadius: 14,
                  border: '1px solid rgba(214,232,255,0.6)',
                  boxShadow: '0 2px 8px rgba(10,37,64,0.04)',
                }}>
                  {/* 썸네일 */}
                  <div style={{
                    width: 56, height: 56, borderRadius: 10, flexShrink: 0,
                    background: 'linear-gradient(145deg,#EAF4FF,#D4E8FB)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
                  }}>{item.thumb}</div>

                  {/* 정보 + 수량 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--fg-1)', lineHeight: 1.3, letterSpacing: '-0.01em' }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 2, display:'flex', alignItems:'center', gap:6 }}>
                      {item.color && (
                        <span style={{
                          width:12,
                          height:12,
                          borderRadius:999,
                          background:item.color.value,
                          border:item.color.value==='#F8F8F4' ? '1px solid #d8d8d8' : '1px solid rgba(0,0,0,0.16)',
                          flexShrink:0,
                        }} />
                      )}
                      <span>{item.color ? `${item.color.name} · ` : ''}사이즈 {item.size}</span>
                    </div>
                    {/* 수량 조절 */}
                    <div style={{ display: 'flex', alignItems: 'center', marginTop: 10 }}>
                      <button onClick={() => updateQty(idx, -1)} style={{ ...qBtn(), borderRadius: '7px 0 0 7px', borderRight: 'none' }}>−</button>
                      <div style={{
                        width: 36, height: 28, border: '1px solid rgba(10,37,64,0.13)', background: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 600, color: 'var(--fg-1)',
                      }}>{item.qty || 1}</div>
                      <button onClick={() => updateQty(idx, 1)} style={{ ...qBtn(), borderRadius: '0 7px 7px 0', borderLeft: 'none' }}>+</button>
                    </div>
                  </div>

                  {/* 금액 + 삭제 */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                    <span style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--accent)', letterSpacing: '-0.01em' }}>
                      {fmtPts(item.pts * (item.qty || 1))}P
                    </span>
                    <button onClick={() => removeItem(idx)} style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--fg-4)', padding: 4, borderRadius: 6,
                      display: 'flex', alignItems: 'center',
                    }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 하단 고정 영역 */}
        {!submitted && cart.length > 0 && (
          <div style={{
            padding: '16px 22px 28px',
            borderTop: '1px solid rgba(214,232,255,0.65)',
            flexShrink: 0,
            background: 'rgba(255,255,255,0.65)',
            backdropFilter: 'blur(12px)',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--fg-2)' }}>
                <span>상품 합계</span><span style={{ fontWeight: 600 }}>{fmtPts(total)}P</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--fg-2)' }}>
                <span>보유 포인트</span>
                <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{fmtPts(EMPLOYEE.points)}P</span>
              </div>
              <div style={{ height: 1, background: 'rgba(214,232,255,0.8)', margin: '2px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, color: remaining < 0 ? 'var(--err)' : 'var(--fg-1)' }}>
                <span>결제 후 잔액</span><span>{fmtPts(remaining)}P</span>
              </div>
            </div>
            {remaining < 0 && (
              <div style={{ padding: '8px 12px', borderRadius: 10, background: 'var(--err-050)', color: 'var(--err)', fontSize: 12, fontWeight: 500, marginBottom: 12 }}>
                포인트가 {fmtPts(Math.abs(remaining))}P 부족해요
              </div>
            )}
            <button onClick={submitOrder} disabled={remaining < 0} style={{
              width: '100%', height: 50, borderRadius: 13,
              background: remaining < 0 ? 'rgba(10,37,64,0.08)' : 'var(--accent)',
              color: remaining < 0 ? 'var(--fg-3)' : '#fff',
              border: 'none', cursor: remaining < 0 ? 'not-allowed' : 'pointer',
              fontSize: 15, fontWeight: 700, fontFamily: PF, letterSpacing: '-0.01em',
              boxShadow: remaining < 0 ? 'none' : '0 4px 14px rgba(47,128,237,0.28)',
              transition: 'all 150ms',
            }}>포인트로 주문하기</button>
          </div>
        )}
      </div>
    </>
  );
}

Object.assign(window, { EmployeeHome, EmployeeCatalog, ProductDetail, EmployeeCart, EmployeeOrders, CartDrawer });
