const { useState: useApp } = React;

const PAGE_TITLES = {
  home: { title: '홈', sub: '작업복 주문 관리 시스템' },
  catalog: { title: '카탈로그', sub: '작업복 탐색' },
  detail: { title: '상품 상세', sub: '사이즈 선택 후 장바구니 담기' },
  orders: { title: '주문 내역', sub: '내 주문 현황 및 배송 추적' },
  'admin-dashboard': { title: '대시보드', sub: '전체 주문/포인트/재고 현황' },
  'admin-orders': { title: '주문 승인', sub: '대기 주문 승인/반려' },
  'admin-points': { title: '포인트 지급', sub: '직원별 포인트 지급' },
  'admin-inventory': { title: '재고 관리', sub: '재고 현황 확인' },
  'admin-products': { title: '상품 관리', sub: '상품 등록/수정/비활성화' },
  'admin-banners': { title: '배너 관리', sub: '홈 배너 관리' },
  'admin-order-mgmt': { title: '주문 관리', sub: '주문 상태 일괄 변경' },
  'admin-employees': { title: '직원 관리', sub: '직원/포인트 관리' },
};

function App() {
  const [role, setRole] = useApp(null);
  const [canAdmin, setCanAdmin] = useApp(false);
  const [screen, setScreen] = useApp('home');
  const [cart, setCart] = useApp([]);
  const [selectedProduct, setSelectedProduct] = useApp(null);
  const [cartOpen, setCartOpen] = useApp(false);
  const [email, setEmail] = useApp('');
  const [password, setPassword] = useApp('');
  const [error, setError] = useApp('');

  async function resolveAccess() {
    const user = await WW.client.auth.getUser().then(({ data }) => data?.user).catch(() => null);
    if (!user) return { role: 'employee', canAdmin: false };
    const metaRole = user.user_metadata?.role || user.app_metadata?.role;
    if (metaRole === 'admin') return { role: 'admin', canAdmin: true };
    const isAdmin = await WW.listAdminOrders().then(() => true).catch(() => false);
    return { role: isAdmin ? 'admin' : 'employee', canAdmin: isAdmin };
  }

  React.useEffect(() => {
    if (!WW?.client) return;
    WW.client.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      await WW.bootstrap();
      const access = await resolveAccess();
      setCanAdmin(access.canAdmin);
      setRole(access.role);
      setScreen(access.role === 'admin' ? 'admin-dashboard' : 'home');
    });
  }, []);

  const totalQty = cart.reduce((s, i) => s + (i.qty || 1), 0);
  const page = PAGE_TITLES[screen] || { title: screen, sub: '' };

  async function doLogin() {
    try {
      setError('');
      await WW.signIn(email, password);
      await WW.bootstrap();
      const access = await resolveAccess();
      setCanAdmin(access.canAdmin);
      setRole(access.role);
      setScreen(access.role === 'admin' ? 'admin-dashboard' : 'home');
    } catch (e) {
      setError(e.message || '로그인 실패');
    }
  }

  async function doLogout() {
    await WW.signOut();
    setRole(null);
    setCanAdmin(false);
    setScreen('home');
    setCart([]);
    setCartOpen(false);
  }

  function renderContent() {
    switch (screen) {
      case 'home': return <EmployeeHome setScreen={setScreen} setSelectedProduct={setSelectedProduct} setCart={setCart} openCart={() => setCartOpen(true)} />;
      case 'catalog': return <EmployeeCatalog setScreen={setScreen} setSelectedProduct={setSelectedProduct} />;
      case 'detail': return <ProductDetail product={selectedProduct} setSelectedProduct={setSelectedProduct} setScreen={setScreen} cart={cart} setCart={setCart} openCart={() => setCartOpen(true)} />;
      case 'orders': return <EmployeeOrders />;
      case 'admin-dashboard': return <AdminDashboard setScreen={setScreen} />;
      case 'admin-orders': return <AdminOrders />;
      case 'admin-points': return <AdminPoints />;
      case 'admin-inventory': return <AdminInventory />;
      case 'admin-products': return <AdminProductMgmt />;
      case 'admin-banners': return <AdminBannerMgmt />;
      case 'admin-order-mgmt': return <AdminOrderMgmt />;
      case 'admin-employees': return <AdminEmployeeMgmt />;
      default: return null;
    }
  }

  if (!role) {
    return (
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', minHeight:'100vh', fontFamily:'var(--font-display)' }}>
        {/* 좌측 — 영상 패널 */}
        <div style={{ position:'relative', overflow:'hidden', background:'#0a0f1a' }}>
          <video
            autoPlay muted loop playsInline
            style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', opacity:0.55 }}
          >
            <source src="https://videos.pexels.com/video-files/3121461/3121461-uhd_2560_1440_25fps.mp4" type="video/mp4"/>
          </video>
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg, rgba(10,15,26,0.6) 0%, rgba(10,15,26,0.3) 100%)' }}/>
          <div style={{ position:'relative', height:'100%', display:'flex', flexDirection:'column', justifyContent:'space-between', padding:'48px 52px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:'rgba(255,255,255,0.15)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🦺</div>
              <span style={{ color:'#fff', fontWeight:800, fontSize:18, letterSpacing:'-0.02em' }}>WindTree</span>
            </div>
            <div>
              <div style={{ fontSize:'clamp(28px,3.5vw,44px)', fontWeight:900, color:'#fff', lineHeight:1.15, letterSpacing:'-0.03em', marginBottom:16 }}>
                현장 작업복<br/>스마트 주문 관리
              </div>
              <p style={{ fontSize:15, color:'rgba(255,255,255,0.6)', lineHeight:1.6, margin:0, fontWeight:400 }}>
                포인트 기반 주문부터 재고 관리까지<br/>하나의 플랫폼으로 간편하게
              </p>
            </div>
          </div>
        </div>

        {/* 우측 — 로그인 패널 */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', background:'#f8fafc', padding:'48px 40px' }}>
          <div style={{ width:'100%', maxWidth:400 }}>
            <div style={{ marginBottom:36 }}>
              <h1 style={{ fontSize:28, fontWeight:900, color:'#0a0f1a', letterSpacing:'-0.03em', margin:'0 0 8px' }}>로그인</h1>
              <p style={{ fontSize:14, color:'#64748b', margin:0 }}>계정 정보를 입력해주세요</p>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>이메일</label>
                <input className="form-input" type="email" placeholder="name@windtreeeng.com" value={email}
                  onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key==='Enter' && doLogin()}
                  style={{ background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:12, padding:'12px 16px', fontSize:14, width:'100%', boxSizing:'border-box' }}/>
              </div>
              <div>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>비밀번호</label>
                <input className="form-input" type="password" placeholder="••••••••" value={password}
                  onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key==='Enter' && doLogin()}
                  style={{ background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:12, padding:'12px 16px', fontSize:14, width:'100%', boxSizing:'border-box' }}/>
              </div>
              {error && (
                <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderRadius:10, background:'rgba(226,55,68,0.07)', border:'1px solid rgba(226,55,68,0.2)', fontSize:13, color:'var(--err)' }}>
                  ⚠ {error}
                </div>
              )}
              <button onClick={doLogin}
                style={{ marginTop:4, width:'100%', height:50, borderRadius:12, border:'none', background:'#0a0f1a', color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer', letterSpacing:'-0.01em', transition:'opacity 150ms' }}
                onMouseOver={e => e.currentTarget.style.opacity='0.85'} onMouseOut={e => e.currentTarget.style.opacity='1'}>
                로그인
              </button>
            </div>
            <p style={{ marginTop:32, fontSize:12, color:'#94a3b8', textAlign:'center' }}>
              WindTree 작업복 관리 시스템 · 내부 전용
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar role={role} canAdmin={canAdmin} setRole={setRole} screen={screen} setScreen={setScreen} openCart={() => setCartOpen(true)} cartQty={totalQty} onLogout={doLogout} />
      <div className="main">
        <div className="topbar">
          <div><h2>{page.title}</h2><div className="sub">{page.sub}</div></div>
          <div className="topbar-right">
            {role === 'employee' && <button className="btn btn-secondary btn-sm" onClick={() => setCartOpen(true)}><Icon name="cart" />{totalQty > 0 && <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 999, fontSize: 10, fontWeight: 700, padding: '1px 6px', marginLeft: 2 }}>{totalQty}</span>}</button>}
            <div style={{ padding: '6px 14px', borderRadius: 999, background: 'var(--accent-050)', color: 'var(--accent-600)', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-display)' }}>{fmtPts(EMPLOYEE.points)}P</div>
          </div>
        </div>
        {renderContent()}
      </div>
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} cart={cart} setCart={setCart} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
