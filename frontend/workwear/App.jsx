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
  const [screen, setScreen] = useApp('home');
  const [cart, setCart] = useApp([]);
  const [selectedProduct, setSelectedProduct] = useApp(null);
  const [cartOpen, setCartOpen] = useApp(false);
  const [email, setEmail] = useApp('');
  const [password, setPassword] = useApp('');
  const [error, setError] = useApp('');

  async function resolveRole() {
    const user = await WW.client.auth.getUser().then(({ data }) => data?.user).catch(() => null);
    if (!user) return 'employee';
    const metaRole = user.user_metadata?.role || user.app_metadata?.role;
    if (metaRole === 'admin') return 'admin';
    const isAdmin = await WW.listAdminOrders().then(() => true).catch(() => false);
    return isAdmin ? 'admin' : 'employee';
  }

  React.useEffect(() => {
    if (!WW?.client) return;
    WW.client.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      await WW.bootstrap();
      const detectedRole = await resolveRole();
      setRole(detectedRole);
      setScreen(detectedRole === 'admin' ? 'admin-dashboard' : 'home');
    });
  }, []);

  const totalQty = cart.reduce((s, i) => s + (i.qty || 1), 0);
  const page = PAGE_TITLES[screen] || { title: screen, sub: '' };

  async function doLogin() {
    try {
      setError('');
      await WW.signIn(email, password);
      await WW.bootstrap();
      const detectedRole = await resolveRole();
      setRole(detectedRole);
      setScreen(detectedRole === 'admin' ? 'admin-dashboard' : 'home');
    } catch (e) {
      setError(e.message || '로그인 실패');
    }
  }

  async function doLogout() {
    await WW.signOut();
    setRole(null);
    setScreen('home');
    setCart([]);
    setCartOpen(false);
  }

  function renderContent() {
    switch (screen) {
      case 'home': return <EmployeeHome setScreen={setScreen} setSelectedProduct={setSelectedProduct} setCart={setCart} openCart={() => setCartOpen(true)} />;
      case 'catalog': return <EmployeeCatalog setScreen={setScreen} setSelectedProduct={setSelectedProduct} />;
      case 'detail': return <ProductDetail product={selectedProduct} setScreen={setScreen} cart={cart} setCart={setCart} openCart={() => setCartOpen(true)} />;
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
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg-sky-gradient)' }}>
        <div className="glass-card" style={{ width: 400 }}>
          <h3 style={{ marginTop: 0 }}>로그인</h3>
          <p style={{ fontSize: 12, color: 'var(--fg-3)' }}>project ref: {WW_CONFIG.PROJECT_REF}</p>
          <input className="form-input" placeholder="이메일" value={email} onChange={e => setEmail(e.target.value)} style={{ marginBottom: 8 }} />
          <input className="form-input" type="password" placeholder="비밀번호" value={password} onChange={e => setPassword(e.target.value)} style={{ marginBottom: 8 }} />
          {error && <div style={{ color: 'var(--err)', fontSize: 12, marginBottom: 8 }}>{error}</div>}
          <div style={{ display: 'grid', gap: 8 }}>
            <button className="btn btn-primary" onClick={doLogin}>로그인</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar role={role} setRole={setRole} screen={screen} setScreen={setScreen} openCart={() => setCartOpen(true)} cartQty={totalQty} onLogout={doLogout} />
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
