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
  const [resetMode, setResetMode] = useApp(false);
  const [resetSent, setResetSent] = useApp(false);
  const [resetLoading, setResetLoading] = useApp(false);

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

  async function doReset() {
    if (resetLoading) return;
    try {
      setError('');
      setResetLoading(true);
      const { error: err } = await WW.client.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://workwear.windtreeeng.com',
      });
      if (err) {
        if (err.status === 429) throw new Error('이메일 전송 횟수 초과. 잠시 후 다시 시도해주세요.');
        throw err;
      }
      setResetSent(true);
    } catch (e) {
      setError(e.message || '전송 실패');
    } finally {
      setResetLoading(false);
    }
  }

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
        {/* 좌측 — 영상 패널 (VIDEO_URL 변수에 mp4 URL 지정 시 영상 재생) */}
        <div style={{ position:'relative', overflow:'hidden', background:'#0a0f1a' }}>
          <style>{`
            @keyframes gradShift {
              0%   { background-position: 0% 50%; }
              50%  { background-position: 100% 50%; }
              100% { background-position: 0% 50%; }
            }
          `}</style>
          {/* 애니메이션 그라디언트 배경 */}
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(-45deg,#0a0f1a,#0f2044,#0a2a1a,#1a0a2a)', backgroundSize:'400% 400%', animation:'gradShift 12s ease infinite' }}/>
          {/* 격자 텍스처 오버레이 */}
          <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)', backgroundSize:'40px 40px' }}/>
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg, rgba(10,15,26,0.4) 0%, transparent 60%)' }}/>
          <div style={{ position:'relative', height:'100%', display:'flex', flexDirection:'column', justifyContent:'space-between', padding:'48px 52px' }}>
            <div>
              <img src="logo-white.png" alt="WindTree" style={{ height:36, objectFit:'contain' }}/>
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
              <h1 style={{ fontSize:28, fontWeight:900, color:'#0a0f1a', letterSpacing:'-0.03em', margin:'0 0 8px' }}>
                {resetMode ? '비밀번호 재설정' : '로그인'}
              </h1>
              <p style={{ fontSize:14, color:'#64748b', margin:0 }}>
                {resetMode ? '가입한 이메일 주소를 입력하면 재설정 링크를 보내드립니다' : '계정 정보를 입력해주세요'}
              </p>
            </div>

            {resetMode ? (
              resetSent ? (
                <div style={{ textAlign:'center', padding:'32px 0' }}>
                  <div style={{ fontSize:40, marginBottom:16 }}>📬</div>
                  <div style={{ fontSize:16, fontWeight:700, color:'#0a0f1a', marginBottom:8 }}>이메일을 확인해주세요</div>
                  <div style={{ fontSize:14, color:'#64748b', marginBottom:24 }}>{email} 으로 재설정 링크를 발송했습니다</div>
                  <button onClick={() => { setResetMode(false); setResetSent(false); setError(''); }}
                    style={{ fontSize:14, color:'#2f80ed', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>
                    로그인으로 돌아가기
                  </button>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  <div>
                    <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>이메일</label>
                    <input className="form-input" type="email" placeholder="name@windtreeeng.com" value={email}
                      onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key==='Enter' && doReset()}
                      style={{ background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:12, padding:'12px 16px', fontSize:14, width:'100%', boxSizing:'border-box' }}/>
                  </div>
                  {error && <div style={{ padding:'10px 14px', borderRadius:10, background:'rgba(226,55,68,0.07)', border:'1px solid rgba(226,55,68,0.2)', fontSize:13, color:'var(--err)' }}>⚠ {error}</div>}
                  <button onClick={doReset} disabled={resetLoading}
                    style={{ marginTop:4, width:'100%', height:50, borderRadius:12, border:'none', background: resetLoading ? '#64748b' : '#0a0f1a', color:'#fff', fontSize:15, fontWeight:700, cursor: resetLoading ? 'not-allowed' : 'pointer', transition:'opacity 150ms' }}
                    onMouseOver={e => { if (!resetLoading) e.currentTarget.style.opacity='0.85'; }} onMouseOut={e => e.currentTarget.style.opacity='1'}>
                    {resetLoading ? '전송 중...' : '재설정 링크 보내기'}
                  </button>
                  <button onClick={() => { setResetMode(false); setError(''); }}
                    style={{ fontSize:14, color:'#64748b', background:'none', border:'none', cursor:'pointer', fontWeight:500 }}>
                    ← 로그인으로 돌아가기
                  </button>
                </div>
              )
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div>
                  <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>이메일</label>
                  <input className="form-input" type="email" placeholder="name@windtreeeng.com" value={email}
                    onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key==='Enter' && doLogin()}
                    style={{ background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:12, padding:'12px 16px', fontSize:14, width:'100%', boxSizing:'border-box' }}/>
                </div>
                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                    <label style={{ fontSize:13, fontWeight:600, color:'#374151' }}>비밀번호</label>
                    <button onClick={() => { setResetMode(true); setError(''); }}
                      style={{ fontSize:12, color:'#2f80ed', background:'none', border:'none', cursor:'pointer', fontWeight:500, padding:0 }}>
                      비밀번호 찾기
                    </button>
                  </div>
                  <input className="form-input" type="password" placeholder="••••••••" value={password}
                    onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key==='Enter' && doLogin()}
                    style={{ background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:12, padding:'12px 16px', fontSize:14, width:'100%', boxSizing:'border-box' }}/>
                </div>
                {error && <div style={{ padding:'10px 14px', borderRadius:10, background:'rgba(226,55,68,0.07)', border:'1px solid rgba(226,55,68,0.2)', fontSize:13, color:'var(--err)' }}>⚠ {error}</div>}
                <button onClick={doLogin}
                  style={{ marginTop:4, width:'100%', height:50, borderRadius:12, border:'none', background:'#0a0f1a', color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer', letterSpacing:'-0.01em', transition:'opacity 150ms' }}
                  onMouseOver={e => e.currentTarget.style.opacity='0.85'} onMouseOut={e => e.currentTarget.style.opacity='1'}>
                  로그인
                </button>
              </div>
            )}

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
