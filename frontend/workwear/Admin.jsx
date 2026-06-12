/* Admin.jsx — 관리자 화면: 대시보드, 주문승인, 포인트지급, 재고관리 */
const { useState: useAdmin } = React;

/* ---- 관리자 대시보드 ---- */
function AdminDashboard({ setScreen }) {
  const store = useStore();
  const pending = store.orders.filter(o=>o.status==='pending').length;
  const totalPtsUsed = store.employees.reduce((s,e)=>s+e.total_used, 0);
  const lowStock = store.products.filter(p=>Object.values(p.stock).reduce((a,b)=>a+b,0)<=5).length;
  return (
    <div className="content">
      <div className="kpi-row kpi-col-4">
        <div className="kpi-card" style={{cursor:'pointer'}} onClick={()=>setScreen('admin-orders')}>
          <div className="kpi-label">승인 대기</div>
          <div className="kpi-value" style={{color: pending>0?'var(--err)':'var(--fg-1)'}}>{pending}</div>
          <div className="kpi-delta" style={{color:'var(--fg-3)', fontSize:12, fontFamily:'var(--font-sans)'}}>클릭하여 처리</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">이번 달 지급</div>
          <div className="kpi-value">{fmtPts(totalPtsUsed)}<span className="unit">P</span></div>
        </div>
        <div className="kpi-card" style={{cursor:'pointer'}} onClick={()=>setScreen('admin-inventory')}>
          <div className="kpi-label">재고 부족 품목</div>
          <div className="kpi-value" style={{color: lowStock>0?'var(--warn)':'var(--fg-1)'}}>{lowStock}</div>
          <div className="kpi-delta" style={{color:'var(--fg-3)', fontSize:12, fontFamily:'var(--font-sans)'}}>재고 확인</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">활성 직원</div>
          <div className="kpi-value">{store.employees.length}</div>
        </div>
      </div>

      {/* 최근 주문 */}
      <div className="glass-card">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14}}>
          <span style={{fontFamily:'var(--font-display)', fontWeight:600, fontSize:16, color:'var(--fg-1)'}}>최근 주문 현황</span>
          <button className="btn btn-secondary btn-sm" onClick={()=>setScreen('admin-orders')}>전체 처리 →</button>
        </div>
        <table className="ww-table">
          <thead><tr><th>주문번호</th><th>직원</th><th>부서</th><th>상품</th><th>포인트</th><th>상태</th><th>날짜</th></tr></thead>
          <tbody>
            {store.orders.slice(0,5).map(o=>(
              <tr key={o.id}>
                <td style={{fontFamily:'var(--font-mono)',fontSize:12,color:'var(--fg-3)'}}>{o.id}</td>
                <td style={{fontWeight:600}}>{o.emp}</td>
                <td style={{color:'var(--fg-3)',fontSize:13}}>{o.dept}</td>
                <td style={{maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{o.items}</td>
                <td style={{fontFamily:'var(--font-display)',fontWeight:700,color:'var(--accent)',fontSize:15}}>{fmtPts(o.pts)}P</td>
                <td><StatusChip status={o.status}/></td>
                <td style={{color:'var(--fg-3)',fontSize:12}}>{o.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 포인트 잔액 분포 */}
      <div className="glass-card">
        <div style={{fontFamily:'var(--font-display)', fontWeight:600, fontSize:16, color:'var(--fg-1)', marginBottom:14}}>직원별 포인트 잔액</div>
        <div style={{display:'flex', flexDirection:'column', gap:10}}>
          {store.employees.map(e=>{
            const pct = Math.round((e.pts / 25000)*100);
            return (
              <div key={e.id} style={{display:'grid', gridTemplateColumns:'120px 1fr 80px', gap:14, alignItems:'center'}}>
                <div>
                  <div style={{fontSize:13, fontWeight:600, color:'var(--fg-1)', fontFamily:'var(--font-sans)'}}>{e.name}</div>
                  <div style={{fontSize:11, color:'var(--fg-3)', fontFamily:'var(--font-sans)'}}>{e.dept}</div>
                </div>
                <div className="stock-bar-wrap">
                  <div className="stock-bar" style={{width:`${pct}%`, background:'linear-gradient(90deg, #2F80ED, #65A3B2)'}}/>
                </div>
                <div style={{textAlign:'right', fontFamily:'var(--font-display)', fontWeight:600, fontSize:14, color:'var(--accent)'}}>{fmtPts(e.pts)}P</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---- 주문 승인/반려 ---- */
function AdminOrders() {
  const store = useStore();
  const [filter, setFilter] = useAdmin('pending');
  const [processing, setProcessing] = useAdmin(new Set());

  async function approve(id) {
    setProcessing(p => new Set(p).add(id));
    const prev = store.orders;
    store.orders = store.orders.map(o => o.id===id ? {...o, status:'approved'} : o);
    store.pub();
    try { await WW.approveOrder(id); await WW.bootstrap(); }
    catch(e) { alert(e.message||'승인 실패'); store.orders = prev; store.pub(); }
    finally { setProcessing(p => { const n=new Set(p); n.delete(id); return n; }); }
  }
  async function reject(id) {
    setProcessing(p => new Set(p).add(id));
    const prev = store.orders;
    store.orders = store.orders.map(o => o.id===id ? {...o, status:'rejected'} : o);
    store.pub();
    try { await WW.rejectOrder(id, '관리자 반려'); await WW.bootstrap(); }
    catch(e) { alert(e.message||'반려 실패'); store.orders = prev; store.pub(); }
    finally { setProcessing(p => { const n=new Set(p); n.delete(id); return n; }); }
  }

  const filtered = filter==='전체' ? store.orders : store.orders.filter(o=>o.status===filter);
  const pending = store.orders.filter(o=>o.status==='pending').length;

  return (
    <div className="content">
      {pending > 0 && (
        <div style={{padding:'12px 16px', borderRadius:14, background:'rgba(232,161,60,0.12)', border:'1px solid var(--warn-050)', display:'flex', alignItems:'center', gap:12}}>
          <Icon name="alert" size={18} color="var(--warn)"/>
          <span style={{fontFamily:'var(--font-sans)', fontSize:13, color:'var(--fg-1)'}}>
            <strong>{pending}건</strong>의 주문이 승인을 기다리고 있어요.
          </span>
        </div>
      )}
      <div style={{display:'flex', gap:10}}>
        <div className="seg">
          {['pending','approved','shipped','delivered','rejected','전체'].map(f=>(
            <button key={f} className={filter===f?'active':''} onClick={()=>setFilter(f)}>
              {{pending:'대기',approved:'승인',shipped:'배송중',delivered:'완료',rejected:'반려',전체:'전체'}[f]}
            </button>
          ))}
        </div>
      </div>
      <div className="glass-card" style={{padding:0, overflow:'hidden'}}>
        <table className="ww-table">
          <thead><tr><th>주문번호</th><th>직원</th><th>부서</th><th>상품</th><th>포인트</th><th>상태</th><th>날짜</th><th style={{textAlign:'center'}}>처리</th></tr></thead>
          <tbody>
            {filtered.map(o=>(
              <tr key={o.id}>
                <td style={{fontFamily:'var(--font-mono)',fontSize:12,color:'var(--fg-3)'}}>{o.id}</td>
                <td style={{fontWeight:600}}>{o.emp}</td>
                <td style={{color:'var(--fg-3)',fontSize:13}}>{o.dept}</td>
                <td style={{maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontSize:13}}>{o.items}</td>
                <td style={{fontFamily:'var(--font-display)',fontWeight:700,color:'var(--accent)',fontSize:15}}>{fmtPts(o.pts)}P</td>
                <td><StatusChip status={o.status}/></td>
                <td style={{color:'var(--fg-3)',fontSize:12}}>{o.date}</td>
                <td>
                  {o.status==='pending' ? (
                    <div style={{display:'flex',gap:6,justifyContent:'center'}}>
                      <button className="btn btn-ok btn-sm" disabled={processing.has(o.id)} onClick={()=>approve(o.id)}>{processing.has(o.id)?'…':'승인'}</button>
                      <button className="btn btn-danger btn-sm" disabled={processing.has(o.id)} onClick={()=>reject(o.id)}>{processing.has(o.id)?'…':'반려'}</button>
                    </div>
                  ) : <span style={{fontSize:12,color:'var(--fg-4)',display:'block',textAlign:'center'}}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length===0 && <div className="empty"><div className="empty-icon"><Icon name="check" size={24}/></div><h3>처리할 주문이 없어요</h3></div>}
      </div>
    </div>
  );
}

/* ---- 포인트 지급 ---- */
function AdminPoints() {
  const store = useStore();
  const [sel, setSel] = useAdmin(null);
  const [amount, setAmount] = useAdmin('');
  const [note, setNote] = useAdmin('');
  const [done, setDone] = useAdmin(false);
  const [ptError, setPtError] = useAdmin('');

  const employees = store.employees;

  async function givePoints() {
    if (!sel || !amount) return;
    setPtError('');
    try {
      await WW.grantPoints(sel, parseInt(amount, 10), note || null);
      await WW.bootstrap();
      setDone(true);
      setTimeout(()=>{setDone(false);setSel(null);setAmount('');setNote('');setPtError('');},1800);
    } catch(e) {
      setPtError(e.message || '포인트 지급에 실패했습니다.');
    }
  }

  return (
    <div className="content">
      <div style={{display:'grid', gridTemplateColumns:'1fr 360px', gap:18, alignItems:'start'}}>
        {/* 직원 목록 */}
        <div className="glass-card" style={{padding:0,overflow:'hidden'}}>
          <div style={{padding:'16px 20px', borderBottom:'1px solid var(--border-hairline-2)'}}>
            <span style={{fontFamily:'var(--font-display)', fontWeight:600, fontSize:16, color:'var(--fg-1)'}}>직원 목록</span>
          </div>
          <table className="ww-table">
            <thead><tr><th>직원</th><th>부서</th><th>현재 잔액</th><th>누적 사용</th><th></th></tr></thead>
            <tbody>
              {employees.map(e=>(
                <tr key={e.id} onClick={()=>setSel(e.id)} style={{cursor:'pointer', background: sel===e.id?'var(--accent-050)':''}}>
                  <td style={{fontWeight:600}}>{e.name} <span style={{fontSize:12,color:'var(--fg-3)',fontWeight:400}}>{e.position}</span></td>
                  <td style={{color:'var(--fg-3)',fontSize:13}}>{e.dept}</td>
                  <td style={{fontFamily:'var(--font-display)',fontWeight:700,color:'var(--accent)',fontSize:15}}>{fmtPts(e.pts)}P</td>
                  <td style={{color:'var(--fg-3)',fontSize:13}}>{fmtPts(e.total_used)}P</td>
                  <td><button className="btn btn-secondary btn-sm" onClick={e2=>{e2.stopPropagation();setSel(e.id);}}>선택</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 지급 폼 */}
        <div className="glass-card">
          <div style={{fontFamily:'var(--font-display)', fontWeight:600, fontSize:16, color:'var(--fg-1)', marginBottom:18}}>포인트 지급</div>
          {done ? (
            <div style={{textAlign:'center', padding:24}}>
              <div style={{width:52,height:52,borderRadius:999,background:'var(--ok-050)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px'}}>
                <Icon name="check" size={26} color="var(--ok)"/>
              </div>
              <div style={{fontWeight:600,color:'var(--fg-1)',fontFamily:'var(--font-sans)'}}>포인트가 지급됐어요</div>
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <div>
                <label className="form-label">직원 선택</label>
                <select className="form-select" value={sel||''} onChange={e=>setSel(e.target.value)}>
                  <option value="">직원을 선택하세요</option>
                  {employees.map(e=><option key={e.id} value={e.id}>{e.name} ({e.dept})</option>)}
                </select>
              </div>
              {sel && (
                <div style={{padding:'10px 14px', borderRadius:10, background:'var(--accent-050)', color:'var(--accent-600)', fontSize:13, fontFamily:'var(--font-sans)'}}>
                  현재 잔액: <strong>{fmtPts(employees.find(e=>e.id===sel)?.pts||0)}P</strong>
                </div>
              )}
              <div>
                <label className="form-label">지급 포인트</label>
                <input className="form-input" type="number" placeholder="예: 5000" value={amount} onChange={e=>setAmount(e.target.value)}/>
              </div>
              <div>
                <label className="form-label">사유 (선택)</label>
                <input className="form-input" placeholder="예: 2024년 4분기 작업복 지급" value={note} onChange={e=>setNote(e.target.value)}/>
              </div>
              <div className="divider"/>
              {sel && amount && (
                <div style={{fontSize:14, color:'var(--fg-2)', fontFamily:'var(--font-sans)'}}>
                  지급 후 잔액: <strong style={{color:'var(--fg-1)'}}>{fmtPts((employees.find(e=>e.id===sel)?.pts||0)+parseInt(amount||0))}P</strong>
                </div>
              )}
              {ptError && <div style={{ padding:'10px 14px', borderRadius:10, background:'rgba(226,55,68,0.07)', border:'1px solid rgba(226,55,68,0.2)', fontSize:13, color:'var(--err)' }}>⚠ {ptError}</div>}
              <button className="btn btn-primary" style={{width:'100%'}} onClick={givePoints} disabled={!sel||!amount}>
                <Icon name="points"/> 포인트 지급하기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---- 재고 관리 ---- */
function AdminInventory({ setScreen }) {
  const store = useStore();
  const [search, setSearch] = useAdmin('');
  const filtered = store.products.filter(p=>search===''||p.name.includes(search));

  return (
    <div className="content">
      <div style={{display:'flex', gap:12}}>
        <div className="search-bar" style={{maxWidth:320}}>
          <svg viewBox="0 0 24 24" style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)'}}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <input className="form-input" style={{paddingLeft:38}} placeholder="상품명 검색…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <button className="btn btn-primary" onClick={() => setScreen?.('admin-products')}><Icon name="plus"/> 상품 추가</button>
      </div>
      <div className="glass-card" style={{padding:0,overflow:'hidden'}}>
        <table className="ww-table">
          <thead><tr><th>상품명</th><th>분류</th><th>단가(P)</th><th>총 재고</th><th>재고 현황</th><th>상태</th></tr></thead>
          <tbody>
            {filtered.map(p=>{
              const total = Object.values(p.stock).reduce((a,b)=>a+b,0);
              const max = 50;
              const pct = Math.min(100, Math.round((total/max)*100));
              const statusCls = total===0?'chip-err':total<=5?'chip-warn':'chip-ok';
              const statusLabel = total===0?'품절':total<=5?'부족':'정상';
              return (
                <tr key={p.id}>
                  <td><div style={{display:'flex',alignItems:'center',gap:10}}><span style={{fontSize:20}}>{p.thumb}</span><div><div style={{fontWeight:600,fontSize:13}}>{p.name}</div>{p.tag&&<span className={`chip ${p.tag==='인기'?'chip-info':'chip-warn'}`} style={{marginTop:2,display:'inline-flex'}}>{p.tag}</span>}</div></div></td>
                  <td style={{color:'var(--fg-3)',fontSize:13}}>{p.cat}</td>
                  <td style={{fontFamily:'var(--font-display)',fontWeight:600,color:'var(--accent)',fontSize:14}}>{fmtPts(p.pts)}</td>
                  <td style={{fontFamily:'var(--font-mono)',fontWeight:600,fontSize:14}}>{total}</td>
                  <td style={{minWidth:120}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div className="stock-bar-wrap" style={{width:100}}>
                        <div className="stock-bar" style={{width:`${pct}%`, background:total===0?'var(--err)':total<=5?'var(--warn)':'var(--ok)'}}/>
                      </div>
                      <span style={{fontSize:11,color:'var(--fg-3)',whiteSpace:'nowrap'}}>{pct}%</span>
                    </div>
                  </td>
                  <td><span className={`chip ${statusCls}`}><span className="dot"/>{statusLabel}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

Object.assign(window, { AdminDashboard, AdminOrders, AdminPoints, AdminInventory });

/* ================================================================
   배너 관리
================================================================ */
function AdminBannerMgmt() {
  const store = useStore();
  const [form, setForm] = React.useState(null);
  const [dragSrc, setDragSrc] = React.useState(null);
  const [imgOver, setImgOver] = React.useState(false);
  const fileRef = React.useRef();
  const PF = "var(--font-sans)";

  function startNew() {
    setForm({ id:Date.now(), tag:'NEW', title:'배너 제목\n두 번째 줄', sub:'서브 텍스트를 입력하세요', cta:'지금 보러가기', bg:'linear-gradient(130deg,#042C44 0%,#1B6EEA 100%)', thumb:'📦', active:true, startDate:'', endDate:'', imageUrl:null });
  }
  function startEdit(b) { setForm({ ...b }); }
  function saveForm() {
    const isNew = !store.banners.find(b => b.id === form.id);
    store.banners = isNew ? [...store.banners, form] : store.banners.map(b => b.id === form.id ? form : b);
    store.pub(); setForm(null);
  }
  function deleteBanner(id) {
    if (!window.confirm('배너를 삭제하시겠습니까?')) return;
    store.banners = store.banners.filter(b => b.id !== id);
    store.pub();
  }
  function toggleActive(id) { store.banners = store.banners.map(b => b.id === id ? { ...b, active: !b.active } : b); store.pub(); }
  function onDrop(e, toIdx) {
    e.preventDefault();
    if (dragSrc === null || dragSrc === toIdx) { setDragSrc(null); return; }
    const arr = [...store.banners]; const [m] = arr.splice(dragSrc, 1); arr.splice(toIdx, 0, m);
    store.banners = arr; store.pub(); setDragSrc(null);
  }
  function handleImg(file) {
    if (!file) return;
    const r = new FileReader();
    r.onload = e => setForm(f => ({ ...f, imageUrl: e.target.result, thumb: '' }));
    r.readAsDataURL(file);
  }

  const Toggle = ({ on, onChange }) => (
    <div onClick={onChange} style={{ width:40, height:22, borderRadius:999, cursor:'pointer', background: on ? 'var(--accent)' : 'rgba(10,37,64,0.15)', position:'relative', transition:'background 200ms', flexShrink:0 }}>
      <div style={{ width:16, height:16, borderRadius:999, background:'#fff', position:'absolute', top:3, left: on ? 21 : 3, transition:'left 200ms', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }}/>
    </div>
  );

  if (form) return (
    <div className="content">
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:4 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => setForm(null)}><Icon name="chevronL"/> 목록</button>
        <span style={{ fontFamily:'var(--font-display)', fontWeight:600, fontSize:16, color:'var(--fg-1)' }}>{form.id > 1e12 ? '배너 추가' : '배너 수정'}</span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 380px', gap:18, alignItems:'start' }}>
        <div className="glass-card" style={{ display:'flex', flexDirection:'column', gap:15 }}>
          {/* 이미지 업로드 */}
          <div>
            <label className="form-label">이미지 업로드</label>
            <div onDragOver={e => { e.preventDefault(); setImgOver(true); }} onDragLeave={() => setImgOver(false)}
              onDrop={e => { e.preventDefault(); setImgOver(false); handleImg(e.dataTransfer.files[0]); }}
              onClick={() => fileRef.current.click()}
              style={{ height:110, border:`2px dashed ${imgOver ? 'var(--accent)' : 'var(--border-hairline)'}`, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:8, cursor:'pointer', background: imgOver ? 'var(--accent-050)' : 'rgba(255,255,255,0.5)', overflow:'hidden', transition:'all 140ms' }}>
              {form.imageUrl ? <img src={form.imageUrl} style={{ maxHeight:'100%', maxWidth:'100%', objectFit:'cover' }}/> : <><Icon name="pkg" size={28} color="var(--fg-4)"/><span style={{ fontSize:12, color:'var(--fg-3)', fontFamily:PF }}>드래그 또는 클릭하여 업로드</span></>}
              <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e => handleImg(e.target.files[0])}/>
            </div>
            <div style={{ marginTop:8, display:'flex', alignItems:'center', gap:10 }}>
              <label className="form-label" style={{ margin:0 }}>또는 이모지</label>
              <input className="form-input" value={form.thumb} onChange={e => setForm(f => ({...f, thumb:e.target.value, imageUrl:null}))} placeholder="🧥" style={{ width:80, textAlign:'center', fontSize:22 }}/>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div><label className="form-label">태그 (상단 소문자)</label><input className="form-input" value={form.tag} onChange={e => setForm(f => ({...f, tag:e.target.value}))} placeholder="2024 NEW"/></div>
            <div><label className="form-label">배경색</label>
              <select className="form-select" value={form.bg} onChange={e => setForm(f => ({...f, bg:e.target.value}))}>
                <option value="linear-gradient(130deg,#042C44 0%,#1B6EEA 100%)">딥 블루</option>
                <option value="linear-gradient(130deg,#0A2540 0%,#316074 100%)">다크 틸</option>
                <option value="linear-gradient(130deg,#1B4FBF 0%,#65A3B2 100%)">미드 블루</option>
                <option value="linear-gradient(130deg,#042C44 0%,#65A3B2 100%)">네이비-틸</option>
              </select>
            </div>
          </div>
          <div><label className="form-label">메인 카피</label><textarea className="form-input" rows={2} value={form.title} onChange={e => setForm(f => ({...f, title:e.target.value}))} style={{ resize:'vertical' }} placeholder={"겨울 작업복\n신상 입고"}/></div>
          <div><label className="form-label">서브 텍스트</label><textarea className="form-input" rows={2} value={form.sub} onChange={e => setForm(f => ({...f, sub:e.target.value}))} style={{ resize:'vertical' }}/></div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div><label className="form-label">버튼 텍스트</label><input className="form-input" value={form.cta} onChange={e => setForm(f => ({...f, cta:e.target.value}))}/></div>
            <div><label className="form-label">링크 URL</label><input className="form-input" value={form.url||''} onChange={e => setForm(f => ({...f, url:e.target.value}))} placeholder="/catalog"/></div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div><label className="form-label">노출 시작일</label><input className="form-input" type="date" value={form.startDate} onChange={e => setForm(f => ({...f, startDate:e.target.value}))}/></div>
            <div><label className="form-label">노출 종료일</label><input className="form-input" type="date" value={form.endDate} onChange={e => setForm(f => ({...f, endDate:e.target.value}))}/></div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize:13, fontWeight:500, color:'var(--fg-2)', fontFamily:PF }}>활성화</span>
            <Toggle on={form.active} onChange={() => setForm(f => ({...f, active:!f.active}))}/>
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => setForm(null)}>취소</button>
            <button className="btn btn-primary" onClick={saveForm}><Icon name="check"/> 저장하기</button>
          </div>
        </div>
        {/* 실시간 미리보기 */}
        <div>
          <div style={{ fontSize:11, fontWeight:600, color:'var(--fg-3)', letterSpacing:'0.05em', textTransform:'uppercase', marginBottom:10 }}>실시간 미리보기</div>
          <div style={{ height:200, borderRadius:16, overflow:'hidden', background:form.bg, display:'flex', alignItems:'center', padding:'0 28px', boxShadow:'0 8px 32px rgba(4,44,68,0.25)' }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:10, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.55)', marginBottom:8 }}>{form.tag||'TAG'}</div>
              <div style={{ fontSize:22, fontWeight:800, color:'#fff', lineHeight:1.2, letterSpacing:'-0.02em', marginBottom:8, whiteSpace:'pre-line' }}>{form.title||'제목'}</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.65)', lineHeight:1.5, marginBottom:12, whiteSpace:'pre-line' }}>{form.sub||'서브텍스트'}</div>
              <span style={{ display:'inline-block', padding:'7px 16px', borderRadius:999, background:'#fff', color:'#042C44', fontSize:11, fontWeight:700, fontFamily:PF }}>{form.cta||'CTA'}</span>
            </div>
            <div style={{ width:90, flexShrink:0, textAlign:'center' }}>
              {form.imageUrl ? <img src={form.imageUrl} style={{ width:76, height:76, objectFit:'cover', borderRadius:999 }}/> : <div style={{ fontSize:68, filter:'drop-shadow(0 8px 20px rgba(0,0,0,0.2))' }}>{form.thumb||'📦'}</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="content">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontFamily:'var(--font-sans)', fontSize:13, color:'var(--fg-3)' }}>{store.banners.length}개 배너 · 드래그로 순서 변경</span>
        <button className="btn btn-primary" onClick={startNew}><Icon name="plus"/> 배너 추가</button>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {store.banners.map((b, idx) => (
          <div key={b.id} draggable onDragStart={() => setDragSrc(idx)}
            onDragOver={e => e.preventDefault()} onDrop={e => onDrop(e, idx)}
            style={{ display:'flex', gap:14, alignItems:'center', padding:'14px 18px', background:'rgba(255,255,255,0.75)', backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.65)', borderRadius:16, boxShadow:'0 2px 8px rgba(10,37,64,0.06)', cursor:'grab', opacity: b.active ? 1 : 0.55, transition:'opacity 200ms' }}>
            <div style={{ color:'var(--fg-4)', flexShrink:0 }}><Icon name="drag" size={16}/></div>
            <div style={{ width:110, height:56, borderRadius:10, background:b.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, overflow:'hidden' }}>
              {b.imageUrl ? <img src={b.imageUrl} style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : <span style={{ fontSize:26 }}>{b.thumb}</span>}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:700, fontSize:13.5, color:'var(--fg-1)', letterSpacing:'-0.01em' }}>{b.title.replace('\n', ' · ')}</div>
              <div style={{ fontSize:11.5, color:'var(--fg-3)', marginTop:3, fontFamily:PF }}>{b.tag}{b.startDate ? ` · ${b.startDate} ~ ${b.endDate||'상시'}` : ''}</div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
              <Toggle on={b.active} onChange={() => toggleActive(b.id)}/>
              <button className="btn btn-secondary btn-sm" onClick={() => startEdit(b)}><Icon name="edit" size={13}/> 수정</button>
              <button onClick={() => deleteBanner(b.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--err)', padding:'4px 6px', borderRadius:6, display:'flex' }}><Icon name="trash" size={14}/></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================================================
   상품 관리
================================================================ */
function AdminProductMgmt() {
  const store = useStore();
  const [editing, setEditing] = React.useState(null);
  const [editTab, setEditTab] = React.useState('basic');
  const [search, setSearch] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [newSize, setNewSize] = React.useState('');
  const PF = "var(--font-sans)";
  const CATS = ['상의','하의','신발','보호구','장갑','안전','동계용','우천용'];
  const DEFAULT_DETAIL = '100% 폴리에스터 소재, 현장 작업에 최적화된 내구성 원단. 반사 테이프 적용으로 야간 안전성 확보.';
  const DEFAULT_SHIPPING = '승인 후 2~3 영업일 내 발송. 사내 물류팀을 통해 근무지로 배송됩니다.';
  const DEFAULT_RETURN = '수령 후 7일 이내 미착용 상태에서 교환 가능. 담당자에게 문의 후 반품 절차 안내 받으세요.';
  const SIZE_PRESETS = {
    '상의':   [['일반', ['S','M','L','XL','2XL']], ['확장', ['XS','S','M','L','XL','2XL','3XL']]],
    '하의':   [['일반', ['S','M','L','XL','2XL']], ['확장', ['XS','S','M','L','XL','2XL','3XL']]],
    '신발':   [['표준mm', ['250','260','270','280','290']], ['확장mm', ['240','250','260','270','280','290','300']]],
    '보호구': [['일반', ['S','M','L','XL']], ['FREE', ['FREE']]],
    '장갑':   [['일반', ['S','M','L']], ['FREE', ['FREE']]],
    '안전':   [['FREE', ['FREE']], ['일반', ['S','M','L','XL']]],
    '동계용': [['일반', ['S','M','L','XL','2XL']]],
    '우천용': [['일반', ['M','L','XL','2XL']]],
  };
  const isUuid = id => /^[0-9a-fA-F-]{36}$/.test(String(id || ''));
  const splitTokens = value => String(value || '').split(',').map(s => s.trim()).filter(Boolean);
  const uniqueTokens = values => [...new Set((values || []).map(v => String(v || '').trim()).filter(Boolean))];
  const normalizeSizes = value => uniqueTokens(Array.isArray(value) ? value : splitTokens(value));
  const uniqueColors = value => {
    const seen = new Set();
    return splitTokens(value).map(resolveWorkwearColor).filter(c => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  };
  const stockStatusOf = qty => {
    const value = Number(qty || 0);
    if (value <= 0) return { label:'품절', color:'var(--err)', bg:'rgba(226, 55, 68, 0.09)', border:'rgba(226, 55, 68, 0.24)' };
    if (value <= 5) return { label:'부족', color:'var(--warn)', bg:'rgba(232, 161, 60, 0.12)', border:'rgba(232, 161, 60, 0.28)' };
    return { label:'판매중', color:'var(--ok)', bg:'rgba(53, 170, 116, 0.10)', border:'rgba(53, 170, 116, 0.24)' };
  };
  const StockPill = ({ qty }) => {
    const st = stockStatusOf(qty);
    return <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', minWidth:42, height:22, padding:'0 8px', borderRadius:999, fontSize:11, fontWeight:800, color:st.color, background:st.bg, border:`1px solid ${st.border}`, fontFamily:PF }}>{st.label}</span>;
  };
  const setEditingSizes = nextSizes => setEditing(prev => {
    if (!prev) return prev;
    const sizes = normalizeSizes(nextSizes);
    const colors = uniqueColors(prev.colorText || '');
    const hasColorStock = Object.keys(prev.stockByColorSize || {}).length > 0;
    const stock = sizes.reduce((acc, s) => ({ ...acc, [s]: Number(prev.stock?.[s] || 0) }), {});
    const stockByColorSize = colors.reduce((acc, c) => ({
      ...acc,
      [c.id]: sizes.reduce((row, s) => ({
        ...row,
        [s]: Number(prev.stockByColorSize?.[c.id]?.[s] ?? (hasColorStock ? 0 : prev.stock?.[s] ?? 0)),
      }), {}),
    }), {});
    return { ...prev, sizes, sizeText: sizes.join(', '), stock, stockByColorSize };
  });
  const editProduct = p => ({
    ...p,
    imageUrl: p.imageUrl || '',
    extraImages: p.extraImages || [],
    stockByColorSize: p.stockByColorSize || (p.colors || []).reduce((acc, color) => ({
      ...acc,
      [color.id]: (p.sizes || []).reduce((row, size) => ({ ...row, [size]: Number(p.stock?.[size] || 0) }), {}),
    }), {}),
    detailInfo: p.detailInfo || p.desc || DEFAULT_DETAIL,
    shippingInfo: p.shippingInfo || DEFAULT_SHIPPING,
    returnInfo: p.returnInfo || DEFAULT_RETURN,
    colorText: (p.colors || []).map(c => c.name).join(', '),
    sizeText: (p.sizes || []).join(', '),
  });

  async function deleteProduct(id) {
    if (!window.confirm('상품을 삭제하시겠습니까? 되돌릴 수 없습니다.')) return;
    if (isUuid(id) && WW?.deleteProduct) {
      try { await WW.deleteProduct(id); await WW.bootstrap(); }
      catch (e) { alert(e.message || '삭제 실패'); }
    } else {
      store.products = store.products.filter(p => p.id !== id);
      store.pub();
    }
  }

  async function toggleActive(id) {
    const target = store.products.find(p => p.id === id);
    const nextActive = !target?.active;
    store.products = store.products.map(p => p.id===id ? {...p, active:nextActive} : p);
    store.pub();
    if (isUuid(id) && WW?.updateProduct) {
      try { await WW.updateProduct(id, { is_active: nextActive }); }
      catch (e) { alert(e.message || '판매 상태 저장에 실패했습니다.'); }
    }
  }

  async function saveProduct(prod) {
    setSaving(true);
    try {
      const colors = uniqueColors(prod.colorText);
      const sizes = normalizeSizes(prod.sizeText);
      if (sizes.length === 0) throw new Error('사이즈를 1개 이상 추가하세요.');
      const hasColorStock = Object.keys(prod.stockByColorSize || {}).length > 0;
      const normalized = {
        ...prod,
        colors,
        sizes,
        stockByColorSize: colors.reduce((acc, color) => ({
          ...acc,
          [color.id]: sizes.reduce((row, s) => ({
            ...row,
            [s]: Number(prod.stockByColorSize?.[color.id]?.[s] ?? (hasColorStock ? 0 : prod.stock?.[s] ?? 0)),
          }), {}),
        }), {}),
        stock: sizes.reduce((acc, s) => ({
          ...acc,
          [s]: colors.length
            ? colors.reduce((sum, color) => sum + Number(prod.stockByColorSize?.[color.id]?.[s] ?? (hasColorStock ? 0 : prod.stock?.[s] ?? 0)), 0)
            : Number(prod.stock?.[s] || 0),
        }), {}),
        detailInfo: prod.detailInfo || prod.desc || DEFAULT_DETAIL,
        shippingInfo: prod.shippingInfo || DEFAULT_SHIPPING,
        returnInfo: prod.returnInfo || DEFAULT_RETURN,
      };
      const payload = {
        name: normalized.name,
        category: normalized.cat,
        point_price: Number(normalized.pts || 0),
        image_url: normalized.imageUrl || null,
        description: stringifyProductMeta(normalized),
        is_active: !!normalized.active,
      };
      let saved = normalized;
      if (WW?.client && WW?.updateProduct) {
        const productRow = isUuid(normalized.id)
          ? await WW.updateProduct(normalized.id, payload)
          : await WW.createProduct(payload);
        saved = { ...normalized, id: productRow.id };
        const activeVariantIds = new Set();
        for (const size of sizes) {
          const qty = Number(normalized.stock[size] || 0);
          if (colors.length) {
            for (const color of colors) {
              const colorQty = Number(normalized.stockByColorSize?.[color.id]?.[size] || 0);
              const variantId = normalized.variantByColorSize?.[color.id]?.[size];
              if (variantId) {
                activeVariantIds.add(variantId);
                await WW.updateVariantStock(variantId, colorQty);
              } else {
                const created = await WW.createVariant(productRow.id, { size, color: color.name, stock_qty: colorQty });
                if (created?.id) activeVariantIds.add(created.id);
              }
            }
          } else {
            const variantId = normalized.variantBySize?.[size];
            if (variantId) {
              activeVariantIds.add(variantId);
              await WW.updateVariantStock(variantId, qty);
            } else {
              const created = await WW.createVariant(productRow.id, { size, color: null, stock_qty: qty });
              if (created?.id) activeVariantIds.add(created.id);
            }
          }
        }
        const knownVariantIds = new Set([
          ...Object.values(normalized.variantBySize || {}),
          ...Object.values(normalized.variantByColorSize || {}).flatMap(row => Object.values(row || {})),
        ].filter(Boolean));
        if (WW.deleteVariant) {
          for (const variantId of knownVariantIds) {
            if (!activeVariantIds.has(variantId)) await WW.deleteVariant(variantId);
          }
        }
        await WW.bootstrap();
      } else {
        store.products = store.products.find(p => p.id===saved.id) ? store.products.map(p => p.id===saved.id ? saved : p) : [...store.products, saved];
        store.pub();
      }
      setEditing(null);
    } catch (e) {
      alert(e.message || '상품 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  const Toggle = ({ on, onChange }) => (
    <div onClick={onChange} style={{ width:40, height:22, borderRadius:999, cursor:'pointer', background: on ? 'var(--ok)' : 'rgba(10,37,64,0.15)', position:'relative', transition:'background 200ms', display:'inline-block' }}>
      <div style={{ width:16, height:16, borderRadius:999, background:'#fff', position:'absolute', top:3, left: on ? 21 : 3, transition:'left 200ms', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }}/>
    </div>
  );

  if (editing) {
    const f = editing; const setF = setEditing;
    const sizes = normalizeSizes(f.sizeText ?? (f.sizes || []));
    const colors = uniqueColors(f.colorText || '');
    const totalStock = colors.length
      ? colors.reduce((sum, c) => sum + sizes.reduce((rowSum, s) => rowSum + Number(f.stockByColorSize?.[c.id]?.[s] || 0), 0), 0)
      : sizes.reduce((sum, s) => sum + Number(f.stock?.[s] || 0), 0);
    const hasColorStock = Object.keys(f.stockByColorSize || {}).length > 0;
    const addSize = () => { const v = newSize.trim(); if (!v) return; setEditingSizes([...sizes, v]); setNewSize(''); };
    const removeSize = size => setEditingSizes(sizes.filter(s => s !== size));
    const setPlainStock = (size, qty) => setF(p => ({ ...p, stock:{ ...p.stock, [size]:Math.max(0, parseInt(qty, 10) || 0) } }));
    const setColorStock = (colorId, size, qty) => setF(p => ({ ...p, stockByColorSize:{ ...p.stockByColorSize, [colorId]:{ ...(p.stockByColorSize?.[colorId] || {}), [size]:Math.max(0, parseInt(qty, 10) || 0) } } }));
    const togglePaletteColor = (colorId) => {
      const cur = uniqueColors(f.colorText || '');
      const isSel = cur.some(c => c.id === colorId);
      const next = isSel ? cur.filter(c => c.id !== colorId) : [...cur, WORKWEAR_COLORS[colorId]].filter(Boolean);
      setF(p => ({ ...p, colorText: next.map(c => c.name).join(', ') }));
    };
    const selectedColorIds = new Set(colors.map(c => c.id));
    const allColors = Object.values(WORKWEAR_COLORS);
    const presets = SIZE_PRESETS[f.cat] || [['일반', ['S','M','L','XL','2XL']]];
    const TabBtn = ({ id, label }) => (
      <button onClick={() => setEditTab(id)} style={{ padding:'8px 20px', borderRadius:999, border:'none', cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:PF, background:editTab===id?'var(--accent)':'rgba(10,37,64,0.06)', color:editTab===id?'#fff':'var(--fg-2)', transition:'all 150ms' }}>{label}</button>
    );
    return (
      <div className="content">
        {/* 헤더 */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setEditing(null)}><Icon name="chevronL"/> 목록</button>
          <span style={{ fontFamily:'var(--font-display)', fontWeight:600, fontSize:16, color:'var(--fg-1)' }}>{isUuid(f.id) ? '상품 수정' : '상품 추가'}</span>
          <span className={`chip ${f.active ? 'chip-ok' : 'chip-neutral'}`}>{f.active ? '판매중' : '비활성'}</span>
        </div>
        {/* 탭 */}
        <div style={{ display:'flex', gap:8, marginBottom:18 }}>
          <TabBtn id="basic" label="기본 정보"/>
          <TabBtn id="content" label="상세 콘텐츠"/>
          <TabBtn id="options" label="옵션·재고"/>
        </div>

        {/* 탭 1: 기본 정보 */}
        {editTab === 'basic' && (
          <div style={{ display:'flex', flexDirection:'column', gap:14, maxWidth:620 }}>
            <div className="glass-card" style={{ display:'flex', flexDirection:'column', gap:14, borderRadius:16 }}>
              <div style={{fontSize:15, fontWeight:800, color:'var(--fg-1)', fontFamily:'var(--font-display)'}}>기본 정보</div>
              <div className="admin-basic-grid">
                <div><label className="form-label">상품명</label><input className="form-input" value={f.name} onChange={e => setF(p => ({...p, name:e.target.value}))} placeholder="상품명"/></div>
                <div><label className="form-label">카테고리</label>
                  <select className="form-select" value={f.cat} onChange={e => setF(p => ({...p, cat:e.target.value}))}>
                    {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="admin-meta-grid">
                <div><label className="form-label">가격 (P)</label><input className="form-input" type="number" value={f.pts} onChange={e => setF(p => ({...p, pts:parseInt(e.target.value)||0}))}/></div>
                <div><label className="form-label">이모지 폴백</label><input className="form-input" value={f.thumb} onChange={e => setF(p => ({...p, thumb:e.target.value}))} style={{ textAlign:'center', fontSize:22 }} placeholder="🧥"/></div>
                <div><label className="form-label">뱃지</label>
                  <select className="form-select" value={f.tag||''} onChange={e => setF(p => ({...p, tag:e.target.value}))}>
                    <option value="">없음</option><option value="인기">인기</option><option value="신상">신상</option><option value="재고부족">재고부족</option>
                  </select>
                </div>
              </div>
              <div style={{ display:'flex', gap:24, flexWrap:'wrap', paddingTop:4 }}>
                {[{ label:'판매 활성화', key:'active' }, { label:'추천 노출', key:'featured' }].map(({label,key}) => (
                  <div key={key} style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:13, fontWeight:600, color:'var(--fg-2)', fontFamily:PF }}>{label}</span>
                    <Toggle on={!!f[key]} onChange={() => setF(p => ({...p, [key]:!p[key]}))}/>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 탭 2: 상세 콘텐츠 */}
        {editTab === 'content' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:16, alignItems:'start' }}>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div className="glass-card" style={{ display:'flex', flexDirection:'column', gap:12, borderRadius:16 }}>
                <div style={{fontSize:15, fontWeight:800, color:'var(--fg-1)', fontFamily:'var(--font-display)'}}>이미지</div>
                <div>
                  <label className="form-label">메인 이미지 URL</label>
                  <input className="form-input" value={f.imageUrl||''} onChange={e => setF(p => ({...p, imageUrl:e.target.value}))} placeholder="https://..."/>
                  {f.imageUrl && <img src={f.imageUrl} alt="" style={{marginTop:8, height:72, objectFit:'contain', borderRadius:8, border:'1px solid rgba(10,37,64,0.08)'}} onError={e => e.target.style.display='none'}/>}
                </div>
                <div>
                  <label className="form-label">추가 이미지 (최대 4장)</label>
                  {[0,1,2,3].map(i => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                      <input className="form-input" value={(f.extraImages||[])[i]||''} onChange={e => { const imgs=[...(f.extraImages||[])]; imgs[i]=e.target.value; setF(p=>({...p,extraImages:imgs})); }} placeholder={`추가 이미지 ${i+1} URL`} style={{flex:1}}/>
                      {(f.extraImages||[])[i] && <img src={(f.extraImages||[])[i]} alt="" style={{height:36,width:36,objectFit:'contain',borderRadius:6,border:'1px solid rgba(10,37,64,0.08)',flexShrink:0}} onError={e=>e.target.style.display='none'}/>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="glass-card" style={{ display:'flex', flexDirection:'column', gap:12, borderRadius:16 }}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <div style={{fontSize:15, fontWeight:800, color:'var(--fg-1)', fontFamily:'var(--font-display)'}}>상세 문구</div>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setF(p => ({ ...p, detailInfo:DEFAULT_DETAIL, shippingInfo:DEFAULT_SHIPPING, returnInfo:DEFAULT_RETURN }))}>기본값 채우기</button>
                </div>
                <div><label className="form-label">요약 설명 <span style={{fontSize:11,color:'var(--fg-3)',fontWeight:400}}>(상세페이지 상단 소개문구)</span></label><textarea className="form-input" rows={3} value={f.desc||''} onChange={e => setF(p => ({...p, desc:e.target.value}))} style={{ resize:'vertical', borderRadius:18 }} placeholder="상품 한 줄 소개. 상세페이지 상단에 표시됩니다."/></div>
                <div><label className="form-label">상품 정보</label><textarea className="form-input" rows={5} value={f.detailInfo||''} onChange={e => setF(p => ({...p, detailInfo:e.target.value}))} style={{ resize:'vertical', borderRadius:18 }}/></div>
                <div><label className="form-label">배송 안내</label><textarea className="form-input" rows={4} value={f.shippingInfo||''} onChange={e => setF(p => ({...p, shippingInfo:e.target.value}))} style={{ resize:'vertical', borderRadius:18 }}/></div>
                <div><label className="form-label">교환·반품</label><textarea className="form-input" rows={4} value={f.returnInfo||''} onChange={e => setF(p => ({...p, returnInfo:e.target.value}))} style={{ resize:'vertical', borderRadius:18 }}/></div>
              </div>
            </div>
            {/* 실시간 미리보기 */}
            <div style={{ position:'sticky', top:16 }}>
              <div style={{ fontSize:11, fontWeight:600, color:'var(--fg-3)', letterSpacing:'0.05em', textTransform:'uppercase', marginBottom:10 }}>미리보기</div>
              <div style={{ background:'rgba(255,255,255,0.78)', border:'1px solid rgba(255,255,255,0.65)', borderRadius:16, overflow:'hidden', boxShadow:'0 2px 8px rgba(10,37,64,0.06)' }}>
                <div style={{ height:170, background:'linear-gradient(145deg,#EAF4FF,#D4E8FB)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:80 }}>
                  {f.imageUrl ? <img src={f.imageUrl} alt={f.name} style={{maxWidth:'72%', maxHeight:'72%', objectFit:'contain'}}/> : (f.thumb||'📦')}
                </div>
                <div style={{ padding:'12px 14px 16px' }}>
                  <div style={{ fontSize:11, color:'var(--fg-3)', fontFamily:PF, marginBottom:3 }}>{f.cat}</div>
                  <div style={{ fontSize:14, fontWeight:700, color:'var(--fg-1)', lineHeight:1.3 }}>{f.name||'상품명'}</div>
                  {f.desc && <div style={{ fontSize:12, color:'var(--fg-3)', marginTop:5, lineHeight:1.5, fontFamily:PF }}>{f.desc}</div>}
                  <div style={{ fontSize:16, fontWeight:800, color:'var(--accent)', marginTop:7 }}>{fmtPts(f.pts)}<span style={{ fontSize:11, fontWeight:500, marginLeft:2, color:'var(--fg-3)' }}>P</span></div>
                  <div style={{ marginTop:12, paddingTop:10, borderTop:'1px solid rgba(10,37,64,0.08)' }}>
                    {[['상품 정보', f.detailInfo], ['배송 안내', f.shippingInfo], ['교환·반품', f.returnInfo]].map(([label, txt], i) => (
                      <div key={label} style={{padding:'8px 0', borderBottom:i===2?'none':'1px solid rgba(10,37,64,0.06)'}}>
                        <div style={{display:'flex', justifyContent:'space-between', fontSize:12, fontWeight:700, color:'var(--fg-1)'}}><span>{label}</span><span>⌄</span></div>
                        {txt && <div style={{fontSize:11, color:'var(--fg-3)', marginTop:4, lineHeight:1.5, fontFamily:PF}}>{txt.slice(0,90)}{txt.length>90?'…':''}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {(f.extraImages||[]).some(Boolean) && (
                <div style={{ display:'flex', gap:6, marginTop:8, flexWrap:'wrap' }}>
                  {(f.extraImages||[]).filter(Boolean).map((url,i) => (
                    <img key={i} src={url} alt="" style={{height:48,width:48,objectFit:'contain',borderRadius:8,border:'1px solid rgba(10,37,64,0.08)',background:'#f5f8ff'}} onError={e=>e.target.style.display='none'}/>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 탭 3: 옵션·재고 */}
        {editTab === 'options' && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {/* 색상 팔레트 */}
            <div className="glass-card" style={{ display:'flex', flexDirection:'column', gap:14, borderRadius:16 }}>
              <div style={{fontSize:15, fontWeight:800, color:'var(--fg-1)', fontFamily:'var(--font-display)'}}>색상</div>
              <div>
                <div style={{fontSize:12, color:'var(--fg-3)', fontFamily:PF, marginBottom:8}}>클릭으로 선택 / 해제</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {allColors.map(c => {
                    const isSel = selectedColorIds.has(c.id);
                    return (
                      <button key={c.id} type="button" onClick={() => togglePaletteColor(c.id)} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 10px 5px 7px', borderRadius:999, border:isSel?'2px solid var(--accent)':'1px solid rgba(10,37,64,0.12)', background:isSel?'rgba(47,128,237,0.08)':'rgba(255,255,255,0.7)', cursor:'pointer', fontSize:12, fontWeight:isSel?800:500, color:isSel?'var(--accent)':'var(--fg-2)', fontFamily:PF, transition:'all 120ms' }}>
                        <span style={{width:14,height:14,borderRadius:999,background:c.value,border:'1px solid rgba(0,0,0,0.14)',flexShrink:0}}/>
                        {c.name}
                        {isSel && <span style={{fontSize:10,color:'var(--accent)'}}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
              {colors.length > 0 && (
                <div style={{display:'flex', gap:6, flexWrap:'wrap', paddingTop:8, borderTop:'1px solid rgba(10,37,64,0.06)'}}>
                  <span style={{fontSize:12, color:'var(--fg-3)', fontFamily:PF, alignSelf:'center'}}>선택됨:</span>
                  {colors.map(c => <span key={c.id} style={{display:'inline-flex', alignItems:'center', gap:6, fontSize:12, color:'var(--fg-2)', fontFamily:PF, padding:'5px 9px', borderRadius:999, background:'rgba(255,255,255,0.7)', border:'1px solid rgba(10,37,64,0.06)'}}><span style={{width:12,height:12,borderRadius:999,background:c.value,border:'1px solid rgba(0,0,0,0.14)'}}/>{c.name}</span>)}
                </div>
              )}
              <div>
                <label className="form-label" style={{color:'var(--fg-4)', fontSize:11}}>직접 입력 (쉼표 구분)</label>
                <input className="form-input" value={f.colorText||''} onChange={e => setF(p => ({...p, colorText:e.target.value}))} placeholder="블랙, 네이비" style={{fontSize:12}}/>
              </div>
            </div>
            {/* 사이즈 */}
            <div className="glass-card" style={{ display:'flex', flexDirection:'column', gap:14, borderRadius:16 }}>
              <div style={{fontSize:15, fontWeight:800, color:'var(--fg-1)', fontFamily:'var(--font-display)'}}>사이즈</div>
              <div>
                <div style={{fontSize:12, color:'var(--fg-3)', fontFamily:PF, marginBottom:8}}>빠른 선택</div>
                <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
                  {presets.map(([label, preset]) => (
                    <button key={label} type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingSizes(preset)} style={{fontSize:12}}>
                      {label}: {preset.join(' · ')}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="form-label">직접 추가</label>
                <div style={{display:'flex', gap:8}}>
                  <input className="form-input" value={newSize} onChange={e => setNewSize(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSize(); } }} placeholder="예: 4L" style={{minWidth:0}}/>
                  <button type="button" className="btn btn-secondary" onClick={addSize} style={{height:38, whiteSpace:'nowrap'}}><Icon name="plus"/> 추가</button>
                </div>
              </div>
              <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
                {sizes.map(s => {
                  const sizeTotal = colors.length ? colors.reduce((sum, c) => sum + Number(f.stockByColorSize?.[c.id]?.[s] || 0), 0) : Number(f.stock?.[s] || 0);
                  return (
                    <span key={s} style={{display:'inline-flex', alignItems:'center', gap:6, padding:'5px 6px 5px 10px', borderRadius:999, background:'#fff', border:'1px solid rgba(10,37,64,0.08)', fontSize:12, fontWeight:800, color:'var(--fg-1)', fontFamily:PF}}>
                      {s}<StockPill qty={sizeTotal}/>
                      <button type="button" onClick={() => removeSize(s)} aria-label={`${s} 삭제`} style={{width:22,height:22,borderRadius:999,border:'none',background:'rgba(10,37,64,0.06)',color:'var(--fg-3)',cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',padding:0}}><Icon name="x" size={12}/></button>
                    </span>
                  );
                })}
                {sizes.length === 0 && <span style={{fontSize:12, color:'var(--fg-3)', fontFamily:PF}}>사이즈를 선택하거나 추가하세요.</span>}
              </div>
            </div>
            {/* 재고 매트릭스 */}
            {sizes.length > 0 && (
              <div className="glass-card" style={{ display:'flex', flexDirection:'column', gap:12, borderRadius:16 }}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <div style={{fontSize:15, fontWeight:800, color:'var(--fg-1)', fontFamily:'var(--font-display)'}}>재고</div>
                  <div style={{display:'flex', gap:8, alignItems:'center'}}>
                    <span style={{fontSize:12, color:'var(--fg-3)', fontFamily:PF}}>총 {totalStock}개</span>
                    <StockPill qty={totalStock}/>
                  </div>
                </div>
                {colors.length > 0 ? (
                  <div style={{overflowX:'auto', paddingBottom:2}}>
                    <div style={{display:'flex', flexDirection:'column', gap:8, minWidth:Math.max(420, 140 + sizes.length * 110)}}>
                      <div style={{display:'grid', gridTemplateColumns:`130px repeat(${Math.max(sizes.length,1)}, minmax(100px, 1fr))`, gap:8, alignItems:'center'}}>
                        <div></div>
                        {sizes.map(s => <div key={s} style={{fontSize:12,fontWeight:800,color:'var(--fg-2)',textAlign:'center',fontFamily:PF}}>{s}</div>)}
                      </div>
                      {colors.map((c, ci) => (
                        <div key={c.id} style={{display:'grid', gridTemplateColumns:`130px repeat(${Math.max(sizes.length,1)}, minmax(100px, 1fr))`, gap:8, alignItems:'start', background:ci%2===0?'rgba(10,37,64,0.02)':'transparent', borderRadius:8, padding:'4px 0'}}>
                          <div style={{display:'flex', alignItems:'center', gap:7, minHeight:40, fontSize:12, fontWeight:700, color:'var(--fg-2)', fontFamily:PF, minWidth:0, paddingLeft:6}}>
                            <span style={{width:14,height:14,borderRadius:999,background:c.value,border:'1px solid rgba(0,0,0,0.14)',flexShrink:0}}/>
                            <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.name}</span>
                          </div>
                          {sizes.map(s => {
                            const qty = Number(f.stockByColorSize?.[c.id]?.[s] ?? (hasColorStock ? 0 : f.stock?.[s] ?? 0));
                            return (
                              <div key={`${c.id}-${s}`} style={{display:'flex', flexDirection:'column', gap:5, minWidth:0}}>
                                <input type="number" min="0" value={qty} onChange={e => setColorStock(c.id, s, e.target.value)} style={{width:'100%',textAlign:'center',padding:'9px 4px',borderRadius:9,border:'1px solid var(--border-hairline)',fontFamily:PF,fontSize:14,background:'#fff'}}/>
                                <div style={{display:'flex', gap:5, alignItems:'center', justifyContent:'center', minHeight:22}}><StockPill qty={qty}/></div>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(100px, 1fr))', gap:10}}>
                    {sizes.map(s => (
                      <div key={s} style={{padding:12, border:'1px solid rgba(10,37,64,0.08)', borderRadius:12, background:'rgba(255,255,255,0.58)'}}>
                        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, marginBottom:8}}>
                          <div style={{fontSize:13, fontWeight:800, color:'var(--fg-1)', fontFamily:PF}}>{s}</div>
                          <StockPill qty={f.stock?.[s] || 0}/>
                        </div>
                        <input type="number" min="0" value={f.stock?.[s]||0} onChange={e => setPlainStock(s, e.target.value)} style={{width:'100%',textAlign:'center',padding:'9px 4px',borderRadius:9,border:'1px solid var(--border-hairline)',fontFamily:PF,fontSize:14,background:'#fff'}}/>
                        {Number(f.stock?.[s] || 0) > 0 && <button type="button" onClick={() => setPlainStock(s, 0)} style={{width:'100%',marginTop:8,border:'none',background:'rgba(10,37,64,0.04)',color:'var(--fg-3)',borderRadius:8,padding:'6px 4px',fontSize:11,fontWeight:800,fontFamily:PF,cursor:'pointer'}}>품절 처리</button>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 저장/취소 항상 표시 */}
        <div className="glass-card" style={{display:'flex', justifyContent:'flex-end', gap:10, marginTop:4, borderRadius:16}}>
          <button className="btn btn-secondary" onClick={() => setEditing(null)}>취소</button>
          <button className="btn btn-primary" disabled={saving} onClick={() => saveProduct(f)}><Icon name="check"/> {saving ? '저장 중...' : '저장'}</button>
        </div>
      </div>
    );
  }

  const filtered = store.products.filter(p => search==='' || p.name.includes(search));
  return (
    <div className="content">
      <div style={{ display:'flex', gap:12, alignItems:'center' }}>
        <div className="search-bar" style={{ flex:1, maxWidth:300 }}>
          <svg viewBox="0 0 24 24" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)' }}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <input className="form-input" style={{ paddingLeft:38 }} placeholder="상품명 검색" value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing(editProduct({ id:Date.now(), name:'', cat:'상의', pts:0, thumb:'📦', imageUrl:'', colors:[WORKWEAR_COLORS.black], sizes:['S','M','L','XL','2XL'], stock:{S:0,M:0,L:0,XL:0,'2XL':0}, tag:'', active:true, featured:false, desc:'', detailInfo:DEFAULT_DETAIL, shippingInfo:DEFAULT_SHIPPING, returnInfo:DEFAULT_RETURN })); setEditTab('basic'); }}>
          <Icon name="plus"/> 상품 추가
        </button>
      </div>
      <div className="glass-card" style={{ padding:0, overflow:'hidden' }}>
        <table className="ww-table">
          <thead><tr><th>상품</th><th>카테고리</th><th>가격</th><th>총 재고</th><th>판매</th><th style={{ textAlign:'center' }}>관리</th></tr></thead>
          <tbody>
            {filtered.map(p => {
              const total = Object.values(p.stock).reduce((a,b)=>a+b,0);
              return (
                <tr key={p.id}>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:40, height:40, borderRadius:10, background:'linear-gradient(145deg,#EAF4FF,#D4E8FB)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>{p.imageUrl ? <img src={p.imageUrl} alt={p.name} style={{maxWidth:'74%', maxHeight:'74%', objectFit:'contain'}}/> : p.thumb}</div>
                      <div>
                        <div style={{ fontWeight:600, fontSize:13 }}>{p.name}</div>
                        {p.tag && <span className={`chip ${p.tag==='인기'?'chip-info':'chip-warn'}`} style={{ marginTop:2 }}>{p.tag}</span>}
                      </div>
                    </div>
                  </td>
                  <td style={{ color:'var(--fg-3)', fontSize:13 }}>{p.cat}</td>
                  <td style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'var(--accent)', fontSize:14 }}>{fmtPts(p.pts)}P</td>
                  <td style={{ fontWeight:600, color: total===0?'var(--err)':total<=5?'var(--warn)':'var(--fg-1)' }}>
                    <span style={{ marginRight:8 }}>{total}</span>
                    {total===0 && <span style={{fontSize:11, fontWeight:800, color:'var(--err)', background:'rgba(226, 55, 68, 0.09)', border:'1px solid rgba(226, 55, 68, 0.24)', borderRadius:999, padding:'2px 7px'}}>품절</span>}
                  </td>
                  <td><Toggle on={p.active} onChange={() => toggleActive(p.id)}/></td>
                  <td style={{ textAlign:'center' }}>
                    <div style={{ display:'flex', gap:6, justifyContent:'center' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => { setEditing(editProduct(p)); setEditTab('basic'); }}><Icon name="edit" size={13}/> 수정</button>
                      <button className="btn btn-sm" onClick={() => deleteProduct(p.id)} style={{ background:'rgba(226,55,68,0.08)', color:'var(--err)', border:'1px solid rgba(226,55,68,0.2)' }}><Icon name="trash" size={13}/></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ================================================================
   주문 관리
================================================================ */
function AdminOrderMgmt() {
  const store = useStore();
  const [filter, setFilter] = React.useState('전체');
  const [selected, setSelected] = React.useState(new Set());
  const PF = "var(--font-sans)";
  const LABELS = { 전체:'전체', pending:'승인대기', approved:'승인됨', shipped:'배송중', delivered:'수령완료', rejected:'반려됨' };

  async function updateStatus(id, status) {
    const prev = store.orders;
    store.orders = store.orders.map(o => o.id===id ? {...o, status} : o);
    store.pub();
    try {
      if (status === 'approved') await WW.approveOrder(id);
      else if (status === 'rejected') await WW.rejectOrder(id, '관리자 반려');
    } catch (e) {
      alert(e.message || '상태 변경 실패');
      store.orders = prev;
      store.pub();
    }
  }
  function toggleSel(id) { setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  async function bulkApprove() {
    const pendingIds = [...selected].filter(id => store.orders.find(o=>o.id===id)?.status==='pending');
    if (!pendingIds.length) { setSelected(new Set()); return; }
    const prev = store.orders;
    store.orders = store.orders.map(o => pendingIds.includes(o.id) ? {...o, status:'approved'} : o);
    store.pub();
    try { await Promise.all(pendingIds.map(id => WW.approveOrder(id))); }
    catch(e) { alert(e.message||'일괄 승인 실패'); store.orders = prev; store.pub(); }
    setSelected(new Set());
  }
  const filtered = filter==='전체' ? store.orders : store.orders.filter(o => o.status===filter);
  const pendingSelected = [...selected].filter(id => store.orders.find(o=>o.id===id)?.status==='pending').length;
  const allChecked = filtered.length > 0 && filtered.every(o => selected.has(o.id));

  return (
    <div className="content">
      <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
        <div className="seg">
          {Object.keys(LABELS).map(s => <button key={s} className={filter===s?'active':''} onClick={() => { setFilter(s); setSelected(new Set()); }}>{LABELS[s]}</button>)}
        </div>
        {pendingSelected > 0 && <button className="btn btn-ok" onClick={bulkApprove}><Icon name="check"/> {pendingSelected}건 일괄 승인</button>}
      </div>
      <div className="glass-card" style={{ padding:0, overflow:'hidden' }}>
        <table className="ww-table">
          <thead><tr>
            <th><input type="checkbox" checked={allChecked} onChange={() => setSelected(allChecked ? new Set() : new Set(filtered.map(o=>o.id)))} style={{ cursor:'pointer' }}/></th>
            <th>주문번호</th><th>직원</th><th>상품</th><th>포인트</th><th>날짜</th><th>상태 변경</th>
          </tr></thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o.id} style={{ background: selected.has(o.id) ? 'var(--accent-050)' : '' }}>
                <td><input type="checkbox" checked={selected.has(o.id)} onChange={() => toggleSel(o.id)} style={{ cursor:'pointer' }}/></td>
                <td style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--fg-3)' }}>{o.id}</td>
                <td><div style={{ fontWeight:600, fontSize:13 }}>{o.emp}</div><div style={{ fontSize:11, color:'var(--fg-3)' }}>{o.dept}</div></td>
                <td style={{ fontSize:13, maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{o.items}</td>
                <td style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'var(--accent)', fontSize:14 }}>{fmtPts(o.pts)}P</td>
                <td style={{ fontSize:12, color:'var(--fg-3)' }}>{o.date}</td>
                <td>
                  <select value={o.status} onChange={e => updateStatus(o.id, e.target.value)}
                    style={{ padding:'5px 9px', borderRadius:8, border:'1px solid var(--border-hairline)', background:'rgba(255,255,255,0.85)', fontSize:12, fontFamily:PF, cursor:'pointer' }}>
                    <option value="pending">승인대기</option><option value="approved">승인됨</option>
                    <option value="shipped">배송중</option><option value="delivered">수령완료</option><option value="rejected">반려됨</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length===0 && <div className="empty"><div className="empty-icon"><Icon name="check" size={24}/></div><h3>해당 주문이 없어요</h3></div>}
      </div>
    </div>
  );
}

/* ================================================================
   직원 관리
================================================================ */
function AdminEmployeeMgmt() {
  const store = useStore();
  const [expanded, setExpanded] = React.useState(null);
  const [inputs, setInputs] = React.useState({});
  const [flash, setFlash] = React.useState(null);
  const [selected, setSelected] = React.useState(new Set());
  const [bulkAmount, setBulkAmount] = React.useState('');
  const [bulkNote, setBulkNote] = React.useState('');
  const [bulkLoading, setBulkLoading] = React.useState(false);
  const PF = "var(--font-sans)";
  const SC = { pending:{label:'승인대기',bg:'#FFFBEB',color:'#92400E',border:'#FDE68A'}, approved:{label:'승인됨',bg:'#EFF6FF',color:'#1E40AF',border:'#BFDBFE'}, shipped:{label:'배송중',bg:'#F0FDF4',color:'#166534',border:'#BBF7D0'}, delivered:{label:'수령완료',bg:'#F9FAFB',color:'#6B7280',border:'#E5E7EB'}, rejected:{label:'반려됨',bg:'#FEF2F2',color:'#991B1B',border:'#FECACA'} };

  const allChecked = store.employees.length > 0 && store.employees.every(e => selected.has(e.id));
  function toggleSel(id) { setSelected(prev => { const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; }); }
  function setInput(id, k, v) { setInputs(p => ({...p, [id]:{...p[id],[k]:v}})); }

  async function adjust(emp, type) {
    const amt = parseInt((inputs[emp.id]||{}).amount);
    if (!amt) return;
    const delta = type==='add' ? amt : -amt;
    const prev = store.employees;
    store.employees = store.employees.map(e => e.id===emp.id ? {...e, pts: Math.max(0, e.pts+delta), total_used: type==='sub' ? e.total_used+amt : e.total_used} : e);
    store.pub();
    try { await WW.grantPoints(emp.id, delta, (inputs[emp.id]||{}).note || null); }
    catch(e) { alert(e.message||'포인트 조정 실패'); store.employees = prev; store.pub(); return; }
    setInputs(p => ({...p, [emp.id]:{amount:'',note:''}}));
    setFlash(emp.id); setTimeout(() => setFlash(null), 1600);
  }

  async function bulkGrant() {
    const amt = parseInt(bulkAmount);
    if (!amt || amt <= 0) return;
    setBulkLoading(true);
    const ids = [...selected];
    const prev = store.employees;
    store.employees = store.employees.map(e => ids.includes(e.id) ? {...e, pts: e.pts+amt} : e);
    store.pub();
    try {
      await Promise.all(ids.map(id => WW.grantPoints(id, amt, bulkNote || null)));
      await WW.bootstrap();
      setBulkAmount(''); setBulkNote(''); setSelected(new Set());
    } catch(e) {
      alert(e.message||'일괄 지급 실패'); store.employees = prev; store.pub();
    } finally { setBulkLoading(false); }
  }

  async function deleteEmployee(emp) {
    if (!window.confirm(`'${emp.name}' 직원을 삭제하시겠습니까?\n삭제된 계정은 복구할 수 없습니다.`)) return;
    try {
      if (WW?.deleteUser) await WW.deleteUser(emp.id);
      await WW.bootstrap();
    } catch(e) {
      store.employees = store.employees.filter(e => e.id !== emp.id);
      store.pub();
    }
  }

  return (
    <div className="content">
      {selected.size > 0 && (
        <div style={{ padding:'14px 18px', borderRadius:14, background:'linear-gradient(135deg,rgba(47,128,237,0.08),rgba(47,128,237,0.04))', border:'1px solid rgba(47,128,237,0.2)', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
          <span style={{ fontSize:13, fontWeight:700, color:'var(--accent)', fontFamily:PF, whiteSpace:'nowrap' }}>{selected.size}명 선택됨</span>
          <input className="form-input" type="number" min="1" placeholder="지급 포인트" value={bulkAmount} onChange={e => setBulkAmount(e.target.value)} style={{ width:130, height:38 }}/>
          <input className="form-input" placeholder="사유 (선택)" value={bulkNote} onChange={e => setBulkNote(e.target.value)} style={{ flex:1, minWidth:100, maxWidth:220, height:38 }}/>
          <button className="btn btn-primary" onClick={bulkGrant} disabled={!bulkAmount||bulkLoading} style={{ height:38, whiteSpace:'nowrap' }}>
            <Icon name="points"/> {bulkLoading?'처리 중...':`${selected.size}명 일괄 지급`}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setSelected(new Set())}>선택 해제</button>
        </div>
      )}
      <div className="glass-card" style={{ padding:0, overflow:'hidden' }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border-hairline-2)', display:'flex', alignItems:'center', gap:14 }}>
          <input type="checkbox" checked={allChecked} onChange={() => setSelected(allChecked ? new Set() : new Set(store.employees.map(e=>e.id)))} style={{ cursor:'pointer', width:16, height:16 }}/>
          <span style={{ fontFamily:'var(--font-display)', fontWeight:600, fontSize:16, color:'var(--fg-1)' }}>직원 목록 ({store.employees.length}명)</span>
        </div>
        {store.employees.map(emp => {
          const isExp = expanded===emp.id;
          const orders = store.orders.filter(o => o.emp===emp.name);
          const inp = inputs[emp.id] || { amount:'', note:'' };
          return (
            <div key={emp.id} style={{ borderBottom:'1px solid var(--border-hairline-2)' }}>
              <div style={{ display:'grid', gridTemplateColumns:'44px 1fr 1fr 120px 120px 80px 44px', gap:12, padding:'14px 20px', alignItems:'center' }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(47,128,237,0.03)'}
                onMouseLeave={e => e.currentTarget.style.background=''}>
                <div onClick={e => e.stopPropagation()} style={{ display:'flex', justifyContent:'center' }}>
                  <input type="checkbox" checked={selected.has(emp.id)} onChange={() => toggleSel(emp.id)} style={{ cursor:'pointer', width:16, height:16 }}/>
                </div>
                <div onClick={() => setExpanded(isExp ? null : emp.id)} style={{ cursor:'pointer' }}>
                  <div style={{ fontWeight:600, fontSize:14, color:'var(--fg-1)' }}>{emp.name}</div>
                  <div style={{ fontSize:12, color:'var(--fg-3)', marginTop:2 }}>{emp.position} · {emp.dept}</div>
                </div>
                <div style={{ fontSize:12, color:'var(--fg-3)', fontFamily:PF, cursor:'pointer' }} onClick={() => setExpanded(isExp ? null : emp.id)}>가입 {emp.joinDate}</div>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'var(--accent)', fontSize:15, cursor:'pointer' }} onClick={() => setExpanded(isExp ? null : emp.id)}>{fmtPts(emp.pts)}P</div>
                <div style={{ fontSize:13, color:'var(--fg-3)', cursor:'pointer' }} onClick={() => setExpanded(isExp ? null : emp.id)}>사용 {fmtPts(emp.total_used)}P</div>
                <div style={{ display:'flex', justifyContent:'flex-end', alignItems:'center', gap:8, cursor:'pointer' }} onClick={() => setExpanded(isExp ? null : emp.id)}>
                  <span style={{ fontSize:12, color:'var(--fg-3)', fontFamily:PF }}>{orders.length}건</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--fg-3)" strokeWidth="2" strokeLinecap="round" style={{ transform: isExp?'rotate(180deg)':'rotate(0)', transition:'transform 200ms' }}><polyline points="6 9 12 15 18 9"/></svg>
                </div>
                <div onClick={e => e.stopPropagation()} style={{ display:'flex', justifyContent:'center' }}>
                  <button onClick={() => deleteEmployee(emp)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--err)', padding:'4px 6px', borderRadius:6, display:'flex', alignItems:'center' }} title="직원 삭제">
                    <Icon name="trash" size={14}/>
                  </button>
                </div>
              </div>
              {isExp && (
                <div style={{ padding:'0 20px 20px', display:'grid', gridTemplateColumns:'1fr 300px', gap:16 }}>
                  {/* 주문 내역 */}
                  <div>
                    <div style={{ fontSize:11, fontWeight:600, color:'var(--fg-3)', letterSpacing:'0.05em', textTransform:'uppercase', marginBottom:10 }}>주문 내역</div>
                    {orders.length===0 ? <div style={{ fontSize:13, color:'var(--fg-4)', fontFamily:PF }}>주문 내역 없음</div> : (
                      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                        {orders.map(o => { const sc=SC[o.status]; return (
                          <div key={o.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:'rgba(10,37,64,0.03)', borderRadius:10 }}>
                            <div style={{ flex:1 }}>
                              <div style={{ fontSize:13, fontWeight:600, color:'var(--fg-1)' }}>{o.items}</div>
                              <div style={{ fontSize:11, color:'var(--fg-4)', fontFamily:'var(--font-mono)' }}>{o.id} · {o.date}</div>
                            </div>
                            <span style={{ fontWeight:700, fontSize:13, color:'var(--accent)' }}>{fmtPts(o.pts)}P</span>
                            {sc && <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:999, background:sc.bg, color:sc.color, border:`1px solid ${sc.border}` }}>{sc.label}</span>}
                          </div>
                        );})}
                      </div>
                    )}
                  </div>
                  {/* 포인트 조정 */}
                  <div style={{ background:'rgba(255,255,255,0.75)', borderRadius:14, border:'1px solid rgba(255,255,255,0.65)', padding:'16px 18px', boxShadow:'0 2px 8px rgba(10,37,64,0.04)' }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'var(--fg-1)', marginBottom:14 }}>포인트 수동 조정</div>
                    {flash===emp.id ? (
                      <div style={{ textAlign:'center', padding:'20px 0', color:'var(--ok)', fontWeight:600, fontSize:14 }}>✓ 처리됐어요</div>
                    ) : (
                      <>
                        <div style={{ marginBottom:10 }}><label className="form-label">조정 포인트</label><input className="form-input" type="number" placeholder="예: 5000" value={inp.amount} onChange={e => setInput(emp.id,'amount',e.target.value)}/></div>
                        <div style={{ marginBottom:14 }}><label className="form-label">사유</label><input className="form-input" placeholder="조정 사유" value={inp.note||''} onChange={e => setInput(emp.id,'note',e.target.value)}/></div>
                        <div style={{ display:'flex', gap:8 }}>
                          <button className="btn btn-primary" style={{ flex:1 }} onClick={() => adjust(emp,'add')} disabled={!inp.amount}><Icon name="plus"/> 지급</button>
                          <button className="btn btn-danger" style={{ flex:1 }} onClick={() => adjust(emp,'sub')} disabled={!inp.amount}><Icon name="x"/> 차감</button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { AdminDashboard, AdminOrders, AdminPoints, AdminInventory, AdminBannerMgmt, AdminProductMgmt, AdminOrderMgmt, AdminEmployeeMgmt });
