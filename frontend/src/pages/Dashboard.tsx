import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  LayoutGrid, Calendar, Package, Activity, History, Printer,
  ChevronRight, Search, Plus, X, Edit2, Trash2, Check, Minus,
  DollarSign, Play, Square, TrendingUp
} from 'lucide-react';
import type { Court, CourtSession, Product, Reservation, Stats, OrderItem } from '../types';
import {
  getCourts, createCourt, updateCourt,
  startCourtSession, stopCourtSession, getActiveSession, getSessionHistory,
  getProducts, createProduct, updateProduct, deleteProduct, addOrderItem, decreaseOrderItem,
  getStats, getReservations, createReservation,
} from '../api';

// ── Helpers ───────────────────────────────────────────────────────────────
function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
}

// ── Digital Clock ──────────────────────────────────────────────
const DigitalClock: React.FC = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-end">
      <div className="text-2xl font-black font-mono tracking-tighter text-white">
        {time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </div>
      <div className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em]">
        {time.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}
      </div>
    </div>
  );
};

// ── Types ─────────────────────────────────────────────────────────────────
type Page = 'overview' | 'products' | 'reservations' | 'history' | 'analytics';

// ── Main App ──────────────────────────────────────────────────────────────
export const Dashboard: React.FC = () => {
  const [page, setPage] = useState<Page>('overview');
  const [courts, setCourts] = useState<Court[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [history, setHistory] = useState<CourtSession[]>([]);
  const [stats, setStats] = useState<Stats>({ total_courts: 0, active_sessions: 0, today_revenue: 0 });
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [activeSession, setActiveSession] = useState<CourtSession | null>(null);
  const [sessionOrders, setSessionOrders] = useState<OrderItem[]>([]);
  const [receipt, setReceipt] = useState<CourtSession | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchCourts = useCallback(async () => {
    try { setCourts(await getCourts()); } catch { /* ignore */ }
  }, []);

  const fetchProducts = useCallback(async () => {
    try { setProducts(await getProducts()); } catch { /* ignore */ }
  }, []);

  const fetchStats = useCallback(async () => {
    try { setStats(await getStats()); } catch { /* ignore */ }
  }, []);

  const fetchReservations = useCallback(async () => {
    try { setReservations(await getReservations()); } catch { /* ignore */ }
  }, []);

  const fetchHistory = useCallback(async () => {
    try { setHistory(await getSessionHistory()); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchCourts();
    fetchProducts();
    fetchStats();
    fetchReservations();
    fetchHistory();

    const interval = setInterval(() => {
      fetchCourts();
      fetchStats();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchCourts, fetchProducts, fetchStats, fetchReservations, fetchHistory]);

  // Open court detail
  const openCourtDetail = async (court: Court) => {
    setSelectedCourt(court);
    if (court.status === 'active') {
      try {
        const session = await getActiveSession(court.id);
        setActiveSession(session);
        setSessionOrders(session?.order_items ?? []);
      } catch {
        setActiveSession(null);
        setSessionOrders([]);
      }
    } else {
      setActiveSession(null);
      setSessionOrders([]);
    }
  };

  const handleStartSession = async (courtId: string) => {
    setLoading(true);
    try {
      const session = await startCourtSession(courtId);
      await fetchCourts();
      await fetchStats();
      if (selectedCourt?.id === courtId) {
        setActiveSession(session);
        setSessionOrders([]);
        setCourts(prev => prev.map(c => c.id === courtId ? { ...c, status: 'active' } : c));
        setSelectedCourt(prev => prev ? { ...prev, status: 'active' } : prev);
      }
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Failed to start session');
    } finally {
      setLoading(false);
    }
  };

  const handleStopSession = async (courtId: string) => {
    if (!confirm('Are you sure you want to stop this session?')) return;
    setLoading(true);
    try {
      const { session } = await stopCourtSession(courtId);
      setReceipt(session); // Show receipt
      setActiveSession(null);
      setSessionOrders([]);
      await fetchCourts();
      await fetchStats();
      await fetchHistory();
      setSelectedCourt(null); // Close sidebar
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Failed to stop session');
    } finally {
      setLoading(false);
    }
  };

  const handleAddOrder = async (product: Product) => {
    if (!selectedCourt || selectedCourt.status !== 'active') return;
    try {
      const item = await addOrderItem(selectedCourt.id, product.id, 1);
      setSessionOrders(prev => {
        const existing = prev.find(o => o.product_id === product.id);
        if (existing) {
          return prev.map(o => o.product_id === product.id
            ? { ...o, quantity: item.quantity, subtotal: item.subtotal }
            : o
          );
        }
        return [...prev, item];
      });
    } catch { alert('Failed to add item'); }
  };

  const handleDecreaseOrder = async (productId: string) => {
    if (!selectedCourt || selectedCourt.status !== 'active') return;
    try {
      const res = await decreaseOrderItem(selectedCourt.id, productId);
      if (res.deleted) {
        setSessionOrders(prev => prev.filter(o => o.product_id !== productId));
      } else {
        setSessionOrders(prev => prev.map(o => o.product_id === productId
          ? { ...o, quantity: res.quantity, subtotal: res.subtotal }
          : o
        ));
      }
    } catch { alert('Failed to decrease item'); }
  };

  const orderTotal = sessionOrders.reduce((s, o) => s + o.subtotal, 0);

  return (
    <div className="min-h-screen flex text-white overflow-hidden font-sans" style={{ background: '#0A0A0A' }}>
      {/* ── Sidebar ── */}
      <aside style={{ width: 240, background: 'rgba(255,255,255,0.02)', borderRight: '1px solid rgba(255,255,255,0.07)' }}
        className="flex flex-col p-6 sticky top-0 h-screen">
        <div className="flex items-center gap-3 mb-10 pl-2">
          <div style={{ background: '#4ADE80', borderRadius: 12 }}
            className="w-10 h-10 flex items-center justify-center text-black font-black text-xl shadow-lg shadow-green-400/20">P</div>
          <div>
            <h1 className="text-sm font-black leading-none uppercase tracking-tighter">PingPongClub</h1>
            <p className="text-[10px] text-white/30 mt-1 font-bold tracking-widest uppercase">CRM Systems</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {([
            { id: 'overview', icon: LayoutGrid, label: 'Overview' },
            { id: 'products', icon: Package, label: 'Products' },
            { id: 'reservations', icon: Calendar, label: 'Reservations' },
            { id: 'history', icon: History, label: 'Order History' },
            { id: 'analytics', icon: TrendingUp, label: 'Analytics' },
          ] as { id: Page; icon: any; label: string }[]).map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setPage(id)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all text-left group',
                page === id
                  ? 'text-black'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              )}
              style={page === id ? { background: '#4ADE80' } : {}}>
              <Icon size={17} className={cn(page === id ? 'text-black' : 'text-current group-hover:scale-110 transition-transform')} />
              {label}
            </button>
          ))}
        </nav>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }} className="pt-4 mt-4">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
            <div style={{ background: '#4ADE80', borderRadius: '50%' }} className="w-8 h-8 flex items-center justify-center text-black font-bold text-sm">A</div>
            <div>
              <p className="text-xs font-bold">Administrator</p>
              <p className="text-[10px] text-white/30 uppercase tracking-tighter">Premium Access</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 overflow-y-auto max-h-screen relative">
        {page === 'overview' && (
          <OverviewPage
            courts={courts}
            stats={stats}
            onOpenCourt={openCourtDetail}
            onOpenAdd={() => {}}
            onRefresh={fetchCourts}
          />
        )}
        {page === 'products' && (
          <ProductsPage
            products={products}
            onRefresh={fetchProducts}
          />
        )}
        {page === 'reservations' && (
          <ReservationsPage 
            reservations={reservations} 
            courts={courts} 
            onRefresh={fetchReservations} 
          />
        )}
        {page === 'history' && (
          <HistoryPage history={history} />
        )}
        {page === 'analytics' && (
          <AnalyticsPage stats={stats} courts={courts} />
        )}
      </main>

      {/* ── Court Detail Modal (Side Panel) ── */}
      {selectedCourt && (
        <CourtDetailModal
          court={selectedCourt}
          session={activeSession}
          orders={sessionOrders}
          orderTotal={orderTotal}
          products={products}
          loading={loading}
          onClose={() => setSelectedCourt(null)}
          onStart={() => handleStartSession(selectedCourt.id)}
          onStop={() => handleStopSession(selectedCourt.id)}
          onAddOrder={handleAddOrder}
          onDecreaseOrder={handleDecreaseOrder}
          onEditCourt={async (updated) => {
            try {
              const c = await updateCourt(selectedCourt.id, updated);
              setCourts(prev => prev.map(x => x.id === c.id ? c : x));
              setSelectedCourt(c);
            } catch { alert('Failed to update court'); }
          }}
        />
      )}

      {/* ── Receipt Modal ── */}
      {receipt && (
        <ReceiptModal session={receipt} onClose={() => setReceipt(null)} />
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// OVERVIEW PAGE
// ══════════════════════════════════════════════════════════════
const OverviewPage: React.FC<{
  courts: Court[];
  stats: Stats;
  onOpenCourt: (c: Court) => void;
  onOpenAdd: () => void;
  onRefresh: () => void;
}> = ({ courts, stats, onOpenCourt }) => {
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const filtered = courts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 pb-16">
      <header className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-3xl font-black tracking-tight mb-1">Board Control</h2>
          <p className="text-white/40 text-sm">Real-time status of all ping pong boards</p>
        </div>
        <div className="flex items-center gap-6">
          <DigitalClock />
          <div className="h-10 w-px bg-white/10" />
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={15} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search table..." type="text"
                className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-green-400/50 transition-all w-56" />
            </div>
            <button onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-black transition-all hover:scale-105 active:scale-95 shadow-lg shadow-green-400/20"
              style={{ background: '#4ADE80' }}>
              <Plus size={16} /> New Board
            </button>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-5 mb-10">
        <StatCard label="Live Boards" value={stats.total_courts} icon={<LayoutGrid size={20} className="text-blue-400" />} color="#3B82F6" />
        <StatCard label="Active Sessions" value={stats.active_sessions} icon={<Activity size={20} className="text-green-400" />} color="#4ADE80" />
        <StatCard label="Revenue (Today)" value={`$${Number(stats.today_revenue || 0).toFixed(2)}`} icon={<DollarSign size={20} className="text-yellow-400" />} color="#FACC15" />
      </div>

      {/* Courts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.map(court => (
          <CourtCard key={court.id} court={court} onClick={() => onOpenCourt(court)} />
        ))}
      </div>

      {showAddModal && <AddCourtModal onClose={() => setShowAddModal(false)} onSaved={() => { setShowAddModal(false); }} />}
    </div>
  );
};

// ── Court Card ─────────────────────────────────────────────────
const CourtCard: React.FC<{ court: Court; onClick: () => void }> = ({ court, onClick }) => {
  const statusStyle: Record<string, { bg: string; text: string; label: string }> = {
    available:   { bg: 'rgba(74,222,128,0.1)',  text: '#4ADE80', label: 'Idle' },
    active:      { bg: 'rgba(59,130,246,0.1)',  text: '#60A5FA', label: 'In Play' },
    reserved:    { bg: 'rgba(251,191,36,0.1)',  text: '#FBBF24', label: 'Booked' },
    maintenance: { bg: 'rgba(239,68,68,0.1)',   text: '#F87171', label: 'Off-line' },
  };
  const s = statusStyle[court.status] ?? statusStyle.available;

  return (
    <button onClick={onClick} className="w-full text-left rounded-3xl p-6 transition-all duration-300 hover:shadow-xl hover:shadow-white/5 active:scale-[0.98] group"
      style={{
        background: court.status === 'active' ? 'rgba(74,222,128,0.04)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${court.status === 'active' ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.06)'}`,
      }}>
      <div className="flex justify-between items-start mb-6">
        <div>
          <span className="text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full"
            style={{ background: s.bg, color: s.text }}>{s.label}</span>
          <h3 className="text-xl font-bold mt-3 group-hover:text-green-400 transition-colors">{court.name}</h3>
          <p className="text-xs text-white/30 uppercase tracking-widest mt-1">{court.type} Table · ${court.price_per_hour}/hr</p>
        </div>
        <div className="p-3 rounded-2xl bg-white/5 group-hover:bg-white/10 transition-colors">
          <ChevronRight size={18} className="text-white/20 group-hover:text-white" />
        </div>
      </div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-white/20 flex items-center gap-2">
        {court.status === 'active' ? (
          <><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Live Session</>
        ) : 'Idle Board'}
      </div>
    </button>
  );
};

// ══════════════════════════════════════════════════════════════
// COURT DETAIL SIDE PANEL
// ══════════════════════════════════════════════════════════════
const CourtDetailModal: React.FC<{
  court: Court;
  session: CourtSession | null;
  orders: OrderItem[];
  orderTotal: number;
  products: Product[];
  loading: boolean;
  onClose: () => void;
  onStart: () => void;
  onStop: () => void;
  onAddOrder: (p: Product) => void;
  onDecreaseOrder: (pId: string) => void;
  onEditCourt: (updated: Partial<Court>) => Promise<void>;
}> = ({ court, session, orders, orderTotal, products, loading, onClose, onStart, onStop, onAddOrder, onDecreaseOrder, onEditCourt }) => {
  const [tab, setTab] = useState<'session' | 'edit'>('session');
  const [elapsed, setElapsed] = useState(0);
  const [editName, setEditName] = useState(court.name);
  const [editType, setEditType] = useState(court.type);
  const [editPrice, setEditPrice] = useState(String(court.price_per_hour));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEditName(court.name);
    setEditType(court.type);
    setEditPrice(String(court.price_per_hour));
  }, [court]);

  useEffect(() => {
    if (!session || session.status !== 'active') { setElapsed(0); return; }
    const start = new Date(session.start_time).getTime();
    const update = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [session]);

  const courtCostPerSec = court.price_per_hour / 3600;
  const currentCourtCost = elapsed * courtCostPerSec;
  const totalCurrent = currentCourtCost + orderTotal;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <div className="relative z-10 h-full w-full max-w-md flex flex-col shadow-2xl"
        style={{ background: '#0F0F0F', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-8 border-b border-white/8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
                style={{
                  background: court.status === 'active' ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.08)',
                  color: court.status === 'active' ? '#4ADE80' : '#9CA3AF',
                }}>
                {court.status === 'active' ? 'LIVE' : 'STANDBY'}
              </span>
              <span className="text-[10px] text-white/30 font-black uppercase tracking-widest">{court.type}</span>
            </div>
            <h2 className="text-2xl font-black">{court.name}</h2>
            <p className="text-sm font-bold text-white/40 mt-1">RATE: ${court.price_per_hour}/HOUR</p>
          </div>
          <button onClick={onClose} className="p-2.5 bg-white/5 rounded-2xl hover:bg-white/10 transition-all hover:rotate-90">
            <X size={20} className="text-white/50" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-4 border-b border-white/8 bg-white/[0.01]">
          {(['session', 'edit'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all relative',
                tab === t ? 'text-white' : 'text-white/20 hover:text-white/40')}>
              {t === 'session' ? 'Play' : 'Setup'}
              {tab === t && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-400 shadow-[0_-2px_8px_rgba(74,222,128,0.5)]" />}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {tab === 'session' && (
            <div className="p-8 space-y-8 pb-32">
              {court.status === 'active' ? (
                <>
                  {/* Timer UI */}
                  <div className="rounded-3xl p-8 text-center relative overflow-hidden" 
                    style={{ background: 'linear-gradient(135deg, rgba(74,222,128,0.1), rgba(0,0,0,0))', border: '1px solid rgba(74,222,128,0.15)' }}>
                    <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.3em] mb-4 flex items-center justify-center gap-2">
                       Active Time
                    </p>
                    <div className="text-6xl font-mono font-black tracking-tight text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,0.3)]">{formatTime(elapsed)}</div>
                    
                    <div className="flex justify-between items-end mt-10 pt-8 border-t border-white/10">
                      <div className="text-left">
                        <p className="text-[9px] text-white/20 font-black uppercase tracking-widest">Table Fee</p>
                        <p className="text-lg font-bold">${currentCourtCost.toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] text-white/20 font-black uppercase tracking-widest">Grand Total</p>
                        <p className="text-3xl font-black text-white">${totalCurrent.toFixed(2)}</p>
                      </div>
                    </div>
                    {/* Decorative pulse */}
                    <div className="absolute top-0 right-0 p-4">
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-ping" />
                    </div>
                  </div>

                  {/* Orders List */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Service Tabs</h4>
                      <span className="text-xs font-bold text-green-400">${orderTotal.toFixed(2)}</span>
                    </div>
                    {orders.length === 0 ? (
                      <div className="p-8 text-center border-2 border-dashed border-white/5 rounded-3xl">
                        <p className="text-white/20 text-xs font-bold uppercase tracking-widest">No Items Added</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {orders.map((o, i) => (
                          <div key={i} className="flex justify-between items-center p-4 rounded-2xl bg-white/[0.02] border border-white/5 group">
                            <div className="flex-1">
                              <p className="text-sm font-bold text-white group-hover:text-green-400 transition-colors uppercase tracking-tight">{o.product?.name ?? 'Item'}</p>
                              <p className="text-[10px] font-bold text-white/20 uppercase">Qty: {o.quantity} · ${o.price}</p>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl">
                                <button onClick={() => onDecreaseOrder(o.product_id)} 
                                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-500/20 text-red-400 transition-colors">
                                  <Minus size={14} />
                                </button>
                                <span className="w-6 text-center text-xs font-black">{o.quantity}</span>
                                <button onClick={() => onAddOrder(o.product as any)} 
                                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-green-500/20 text-green-400 transition-colors">
                                  <Plus size={14} />
                                </button>
                              </div>
                              <p className="w-16 text-right font-black text-sm">${o.subtotal.toFixed(2)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add Service Section */}
                  <div>
                    <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4">Quick Add Service</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {products.map(p => (
                        <button key={p.id} onClick={() => onAddOrder(p)}
                          className="p-4 rounded-2xl text-left transition-all hover:bg-white/5 active:scale-95 border border-white/5 flex flex-col justify-between h-24">
                          <Package size={16} className="text-white/20" />
                          <div>
                            <p className="text-xs font-bold leading-tight uppercase tracking-tighter">{p.name}</p>
                            <p className="text-green-400 font-black text-base mt-0.5">${p.price}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Final Stop Action */}
                  <div className="fixed bottom-0 left-0 right-0 p-8 pt-4 bg-gradient-to-t from-[#0F0F0F] via-[#0F0F0F] to-transparent pointer-events-none">
                    <button onClick={onStop} disabled={loading}
                      className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all hover:bg-red-500 hover:text-white pointer-events-auto border border-red-500/30 text-red-400"
                      style={{ background: 'rgba(239,68,68,0.1)' }}>
                      <Square size={16} fill="currentColor" />
                      {loading ? 'Processing...' : 'Stop Game & Billing'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-20">
                  <div className="w-24 h-24 rounded-full mx-auto mb-8 flex items-center justify-center bg-green-400/10 border-2 border-green-400/20">
                    <Play size={40} className="text-green-400" style={{ marginLeft: 6 }} />
                  </div>
                  <h3 className="text-2xl font-black mb-2 uppercase tracking-tighter">Ready for Action</h3>
                  <p className="text-white/30 text-sm mb-10 font-bold uppercase tracking-widest">Rate: ${court.price_per_hour}/hour</p>
                  <button onClick={onStart} disabled={loading}
                    className="px-12 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm text-black transition-all hover:scale-105 active:scale-95 shadow-xl shadow-green-400/20"
                    style={{ background: '#4ADE80' }}>
                    {loading ? 'Booting...' : 'Start Session'}
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === 'edit' && (
            <div className="p-8 space-y-6">
              <Field label="Board Identifier">
                <input value={editName} onChange={e => setEditName(e.target.value)} className="input-field" />
              </Field>
              <Field label="Table Category">
                <select value={editType} onChange={e => setEditType(e.target.value as any)} className="input-field">
                  <option value="indoor">Premium Indoor</option>
                  <option value="outdoor">Casual Outdoor</option>
                </select>
              </Field>
              <Field label="Hourly Tariff ($)">
                <input value={editPrice} onChange={e => setEditPrice(e.target.value)} type="number" step="0.5" className="input-field" />
              </Field>
              <div className="pt-6">
                <button onClick={async () => {
                   setSaving(true);
                   await onEditCourt({ name: editName, type: editType, price_per_hour: parseFloat(editPrice) });
                   setSaving(false);
                }} disabled={saving}
                  className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm text-black transition-all hover:bg-white/90"
                  style={{ background: '#4ADE80' }}>
                  {saving ? 'UPDATING...' : <><Check size={18} className="inline mr-2" />Sync Changes</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// RECEIPT MODAL
// ══════════════════════════════════════════════════════════════
const ReceiptModal: React.FC<{ session: CourtSession; onClose: () => void }> = ({ session, onClose }) => {
  const handlePrint = () => {
    const windowPrint = window.open('', '_blank', 'width=800,height=900');
    if (!windowPrint) {
      alert('Please allow popups to print receipts');
      return;
    }
    
    windowPrint.document.write(`
      <html>
        <head>
          <title>Receipt - ${session.id}</title>
          <style>
            @page { margin: 0; }
            body { 
              font-family: 'Courier New', Courier, monospace; 
              width: 80mm; 
              margin: 0 auto; 
              padding: 5mm; 
              color: #000; 
              font-size: 12px;
              line-height: 1.4;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .header { margin-bottom: 5mm; }
            .divider { border-top: 1px dashed #000; margin: 4mm 0; }
            .flex { display: flex; justify-content: space-between; }
            .item-row { margin-bottom: 2mm; }
            .total-area { font-size: 14px; margin-top: 5mm; }
            .qrcode { margin: 5mm 0; font-size: 10px; }
            @media print {
               body { width: 80mm; }
            }
          </style>
        </head>
        <body>
          <div class="center header">
            <h1 style="margin:0; font-size:18px;">PINGPONG CLUB</h1>
            <p style="margin:5px 0;">Premium Recreation Center</p>
            <div class="divider"></div>
            <p class="bold">OFFICIAL RECEIPT</p>
            <p>ID: #${session.id.toString().padStart(6, '0')}</p>
          </div>

          <div class="item-row flex">
            <span>Date:</span>
            <span>${new Date().toLocaleDateString('en-GB', { timeZone: 'Asia/Tashkent' })}</span>
          </div>
          <div class="item-row flex">
            <span>Time:</span>
            <span>${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tashkent' })}</span>
          </div>
          
          <div class="divider"></div>
          
          <div class="bold" style="margin-bottom:2mm;">SESSION DETAILS:</div>
          <div class="item-row flex">
            <span>Board:</span>
            <span>${session.court?.name}</span>
          </div>
          <div class="item-row flex">
            <span>Time In:</span>
            <span>${new Date(session.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tashkent' })}</span>
          </div>
          <div class="item-row flex">
            <span>Time Out:</span>
            <span>${new Date(session.end_time!).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tashkent' })}</span>
          </div>

          <div class="divider"></div>

          <div class="bold" style="margin-bottom:2mm;">ORDERED ITEMS:</div>
          ${session.order_items && session.order_items.length > 0 ? 
            session.order_items.map(o => `
            <div class="item-row flex">
              <span>${o.product?.name} x${o.quantity}</span>
              <span>$${o.subtotal.toFixed(2)}</span>
            </div>
            `).join('') : '<div class="center">No items</div>'
          }

          <div class="divider"></div>

          <div class="total-area bold">
            <div class="flex">
              <span>GRAND TOTAL:</span>
              <span>$${session.total_price.toFixed(2)}</span>
            </div>
          </div>

          <div class="divider"></div>
          
          <div class="center qrcode">
            <p>*** THANK YOU ***</p>
            <p>Please visit us again!</p>
            <p style="margin-top:10px;">${new Date().toLocaleString('en-GB', { timeZone: 'Asia/Tashkent' })}</p>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    windowPrint.document.close();
  };

  return (
    <Modal title="Session Settlement" onClose={onClose}>
      <div className="p-2 space-y-6">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center font-mono">
           <div className="mb-6 flex justify-center">
             <div className="bg-green-400/20 text-green-400 p-4 rounded-full"><Printer size={32} /></div>
           </div>
           <h3 className="text-xl font-black uppercase tracking-tighter mb-1">PingPongClub CRM</h3>
           <p className="text-[10px] text-white/30 uppercase tracking-[0.4em] mb-6">Payment Receipt</p>
           
           <div className="space-y-3 text-left border-y border-white/10 py-6 my-6">
              <div className="flex justify-between text-xs"><span className="text-white/30">BOARD:</span> <span className="font-bold">{session.court?.name}</span></div>
              <div className="flex justify-between text-xs"><span className="text-white/30">DURATION:</span> <span className="font-bold uppercase">${session.court?.price_per_hour}/hr</span></div>
              <div className="flex justify-between text-xs"><span className="text-white/30">ITEMS:</span> <span className="font-bold">{session.order_items?.length || 0} ITEMS</span></div>
           </div>

           <div className="flex justify-between items-center px-2">
              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Grand Total</span>
              <span className="text-4xl font-black text-green-400 tracking-tighter">${session.total_price.toFixed(2)}</span>
           </div>
        </div>

        <div className="flex gap-3">
          <button onClick={handlePrint} className="flex-1 py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
            <Printer size={16} /> Print Receipt
          </button>
          <button onClick={onClose} className="px-8 py-4 bg-white/5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-colors">
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ══════════════════════════════════════════════════════════════
// HISTORY PAGE
// ══════════════════════════════════════════════════════════════
const HistoryPage: React.FC<{ history: CourtSession[] }> = ({ history }) => {
  return (
    <div className="p-8 pb-16">
      <header className="mb-10">
        <h2 className="text-3xl font-black tracking-tight mb-2">Service History</h2>
        <p className="text-white/40 text-sm">Archived logs of completed sessions and billing</p>
      </header>

      {history.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-[3rem]">
          <History size={64} className="mx-auto mb-6 opacity-10" />
          <p className="text-white/20 font-black uppercase tracking-widest text-lg">Empty Logs</p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map(s => (
            <div key={s.id} className="rounded-3xl p-6 flex flex-col md:flex-row md:items-center gap-6 group transition-all hover:bg-white/[0.03] border border-white/5">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/20 font-black">
                 {s.court?.name?.charAt(s.court.name.length - 1) || '#'}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h4 className="font-black text-base uppercase tracking-tight">{s.court?.name || 'Unknown Board'}</h4>
                  <span className="text-[9px] font-black px-2 py-0.5 rounded bg-green-400/10 text-green-400 uppercase">Paid</span>
                </div>
                <p className="text-xs text-white/20 uppercase tracking-widest font-bold">
                  {new Date(s.start_time).toLocaleString('en-GB', { timeZone: 'Asia/Tashkent' })} · {s.order_items?.length || 0} Items
                </p>
              </div>
              <div className="text-right flex flex-col items-end">
                <p className="text-xl font-black text-white group-hover:text-green-400 transition-colors">${s.total_price.toFixed(2)}</p>
                <div className="flex gap-2 mt-2">
                   {s.order_items?.slice(0, 3).map((oi, idx) => (
                     <div key={idx} className="w-5 h-5 rounded bg-white/5 border border-white/10 flex items-center justify-center text-[8px] font-black" title={oi.product?.name}>
                        {oi.product?.name?.charAt(0)}
                     </div>
                   ))}
                   {(s.order_items?.length || 0) > 3 && <div className="text-[8px] font-black self-center text-white/20">+{s.order_items!.length - 3}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// PRODUCTS PAGE (Updated)
// ══════════════════════════════════════════════════════════════
const ProductsPage: React.FC<{ products: Product[]; onRefresh: () => void }> = ({ products, onRefresh }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you absolutely sure you want to remove this product from inventory?')) return;
    try { await deleteProduct(id); onRefresh(); } catch { alert('Failed to delete product'); }
  };

  return (
    <div className="p-8 pb-16">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-3xl font-black mb-2">Inventory</h2>
          <p className="text-white/40 text-sm">Manage items and services available for billing</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-black text-xs uppercase tracking-widest shadow-lg shadow-green-400/20"
          style={{ background: '#4ADE80' }}>
          <Plus size={16} /> Create Item
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map(p => (
          <div key={p.id} className="rounded-[2rem] p-6 flex flex-col group transition-all hover:bg-white/[0.04] border border-white/5 relative overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.02)' }}>
            <div className="flex-1 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-green-400/10 transition-all">
                <Package size={24} className="text-white/20 group-hover:text-green-400 transition-colors" />
              </div>
              <h3 className="font-black text-lg uppercase tracking-tight mb-1">{p.name}</h3>
              <p className="text-3xl font-black text-green-400 tracking-tighter">${p.price}</p>
            </div>
            <div className="flex gap-2 mt-8 relative z-10">
              <button onClick={() => setEditProduct(p)} className="flex-1 flex items-center justify-center p-3 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all">
                <Edit2 size={12} className="mr-2" /> Edit
              </button>
              <button onClick={() => handleDelete(p.id)} className="w-12 flex items-center justify-center p-3 rounded-xl bg-red-500/10 text-red-400/50 hover:text-red-400 hover:bg-red-500/20 transition-all">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showAdd && (
        <ProductFormModal title="New Inventory Item" onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); onRefresh(); }} />
      )}
      {editProduct && (
        <ProductFormModal title="Update Item" product={editProduct} onClose={() => setEditProduct(null)} onSaved={() => { setEditProduct(null); onRefresh(); }} />
      )}
    </div>
  );
};

const ProductFormModal: React.FC<{
  title: string; product?: Product;
  onClose: () => void; onSaved: () => void;
}> = ({ title, product, onClose, onSaved }) => {
  const [name, setName] = useState(product?.name ?? '');
  const [price, setPrice] = useState(String(product?.price ?? ''));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name || !price) return;
    setSaving(true);
    try {
      if (product) await updateProduct(product.id, { name, price: parseFloat(price) });
      else await createProduct({ name, price: parseFloat(price) });
      onSaved();
    } catch { alert('Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-6">
        <Field label="Item Nomenclature"><input value={name} onChange={e => setName(e.target.value)} className="input-field" placeholder="e.g. Energy Drink" /></Field>
        <Field label="Unit Price ($)"><input value={price} onChange={e => setPrice(e.target.value)} type="number" step="0.5" className="input-field" /></Field>
        <div className="pt-4">
          <button onClick={save} disabled={saving} className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs text-black" style={{ background: '#4ADE80' }}>
            {saving ? 'SYNCING...' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ══════════════════════════════════════════════════════════════
// RESERVATIONS PAGE (Dynamic)
// ══════════════════════════════════════════════════════════════
const ReservationsPage: React.FC<{ 
  reservations: Reservation[]; 
  courts: Court[]; 
  onRefresh: () => void 
}> = ({ reservations, courts, onRefresh }) => {
  const [showAdd, setShowAdd] = useState(false);
  const getCourtName = (id: string) => courts.find(c => String(c.id) === String(id))?.name ?? `Board ${id}`;

  return (
    <div className="p-8 pb-16">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-3xl font-black tracking-tight mb-2">Booking Log</h2>
          <p className="text-white/40 text-sm">Upcoming scheduled slots for boards</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-black text-xs uppercase tracking-widest"
          style={{ background: '#4ADE80' }}>
          <Plus size={16} /> New Slot
        </button>
      </header>

      {reservations.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-[3rem]">
          <Calendar size={64} className="mx-auto mb-6 opacity-10" />
          <p className="text-white/20 font-black uppercase tracking-widest">No Active Bookings</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reservations.map(r => (
            <div key={r.id} className="rounded-3xl p-6 flex items-center gap-6 border border-white/5 hover:bg-white/[0.03] transition-all">
              <div className="w-2 self-stretch rounded-full" style={{ background: r.status === 'confirmed' ? '#4ADE80' : r.status === 'cancelled' ? '#F87171' : '#FBBF24' }} />
              <div className="flex-1">
                <p className="font-black text-lg uppercase tracking-tight">{r.client_name}</p>
                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">{r.client_phone} · {getCourtName(r.court_id)}</p>
              </div>
              <div className="text-right mr-6">
                <p className="text-sm font-black uppercase tracking-tighter">{new Date(r.start_time).toLocaleDateString()}</p>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{new Date(r.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {r.duration_minutes} MIN</p>
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full border border-white/10"
                style={{
                  background: r.status === 'confirmed' ? 'rgba(74,222,128,0.1)' : r.status === 'cancelled' ? 'rgba(239,68,68,0.1)' : 'rgba(251,191,36,0.1)',
                  color: r.status === 'confirmed' ? '#4ADE80' : r.status === 'cancelled' ? '#F87171' : '#FBBF24',
                }}>
                {r.status ?? 'pending'}
              </span>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <AddReservationModal 
          courts={courts} 
          onClose={() => setShowAdd(false)} 
          onSaved={() => { setShowAdd(false); onRefresh(); }} 
        />
      )}
    </div>
  );
};

const AddReservationModal: React.FC<{ 
  courts: Court[]; 
  onClose: () => void; 
  onSaved: () => void 
}> = ({ courts, onClose, onSaved }) => {
  const [courtId, setCourtId] = useState(courts[0]?.id || '');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('60');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!courtId || !name || !phone || !date || !time) return;
    setSaving(true);
    try {
      await createReservation({
        court_id: courtId,
        client_name: name,
        client_phone: phone,
        start_time: `${date} ${time}`,
        duration_minutes: parseInt(duration),
        status: 'confirmed'
      });
      onSaved();
    } catch { alert('Failed to save reservation'); }
    finally { setSaving(false); }
  };

  return (
    <Modal title="Secure Board Slot" onClose={onClose}>
      <div className="space-y-6">
        <Field label="Table Choice">
          <select value={courtId} onChange={e => setCourtId(e.target.value)} className="input-field">
            {courts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Client Descriptor"><input value={name} onChange={e => setName(e.target.value)} className="input-field" placeholder="Full Name" /></Field>
        <Field label="Contact"><input value={phone} onChange={e => setPhone(e.target.value)} className="input-field" placeholder="+998" /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Date"><input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-field" /></Field>
          <Field label="Time"><input type="time" value={time} onChange={e => setTime(e.target.value)} className="input-field" /></Field>
        </div>
        <Field label="Session Window">
          <select value={duration} onChange={e => setDuration(e.target.value)} className="input-field">
            <option value="30">30 MINS</option>
            <option value="60">60 MINS</option>
            <option value="90">90 MINS</option>
            <option value="120">120 MINS</option>
          </select>
        </Field>
        <div className="pt-4">
          <button onClick={save} disabled={saving} className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs text-black" style={{ background: '#4ADE80' }}>
            {saving ? 'SECURING...' : 'Confirm Slot'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ══════════════════════════════════════════════════════════════
// ANALYTICS PAGE
// ══════════════════════════════════════════════════════════════
const AnalyticsPage: React.FC<{ stats: Stats; courts: Court[] }> = ({ stats, courts }) => {
  const activeCount = courts.filter(c => c.status === 'active').length;
  const availableCount = courts.filter(c => c.status === 'available').length;

  return (
    <div className="p-8 pb-16">
      <header className="mb-10">
        <h2 className="text-3xl font-black mb-2 tracking-tight">Intelligence</h2>
        <p className="text-white/40 text-sm font-bold uppercase tracking-widest">Club Performance & Metrics</p>
      </header>

      <div className="grid grid-cols-2 gap-6 mb-10">
        <StatCard label="Inventory Boards" value={stats.total_courts} icon={<LayoutGrid size={20} className="text-blue-400" />} color="#3B82F6" />
        <StatCard label="Live Performance" value={activeCount} icon={<Activity size={20} className="text-green-400" />} color="#4ADE80" />
        <StatCard label="Idle Capacity" value={availableCount} icon={<Check size={20} className="text-green-400" />} color="#4ADE80" />
        <StatCard label="Capital Inflow" value={`$${Number(stats.today_revenue || 0).toFixed(2)}`} icon={<DollarSign size={20} className="text-yellow-400" />} color="#FACC15" />
      </div>

      <div className="rounded-[2.5rem] p-8" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <h3 className="text-sm font-black uppercase tracking-[0.3em] mb-8 text-white/40">Real-time status breakdown</h3>
        <div className="space-y-5">
          {courts.map(c => (
            <div key={c.id} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/[0.02] transition-all">
              <div className="w-3 h-3 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.1)]" style={{
                background: c.status === 'active' ? '#4ADE80' : c.status === 'reserved' ? '#FBBF24' : c.status === 'maintenance' ? '#F87171' : '#444'
              }} />
              <span className="flex-1 text-sm font-black uppercase tracking-tight">{c.name}</span>
              <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">{c.status}</span>
              <span className="text-sm font-black text-green-400/80 tracking-tighter">${c.price_per_hour}/HR</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// SHARED UI COMPONENTS
// ══════════════════════════════════════════════════════════════
const StatCard: React.FC<{ label: string; value: string | number; icon: React.ReactNode; color: string }> = ({ label, value, icon, color }) => (
  <div className="rounded-[2rem] p-6 group transition-all hover:-translate-y-1" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
    <div className="flex justify-between items-center mb-6">
      <span className="text-[9px] text-white/20 uppercase tracking-[0.3em] font-black">{label}</span>
      <div className="p-3 rounded-2xl transition-all group-hover:scale-110" style={{ background: `${color}10` }}>{icon}</div>
    </div>
    <div className="text-4xl font-black tracking-tighter" style={{ color }}>{value}</div>
  </div>
);

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
    <div className="absolute inset-0 bg-black/80 backdrop-blur-lg" onClick={onClose} />
    <div className="relative z-10 w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl overflow-hidden" 
      style={{ background: '#0F0F0F', border: '1px solid rgba(255,255,255,0.1)' }}>
      {/* Decorative gradient */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-green-400/10 blur-[100px] rounded-full pointer-events-none" />
      
      <div className="flex justify-between items-center mb-10 relative z-10">
        <h3 className="text-2xl font-black uppercase tracking-tighter">{title}</h3>
        <button onClick={onClose} className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 transition-all"><X size={20} className="text-white/40" /></button>
      </div>
      <div className="relative z-10">
        {children}
      </div>
    </div>
  </div>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-2 px-1">{label}</label>
    {children}
  </div>
);

const AddCourtModal: React.FC<{ onClose: () => void; onSaved: () => void }> = ({ onClose, onSaved }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<'indoor' | 'outdoor'>('indoor');
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name || !price) return;
    setSaving(true);
    try {
      await createCourt({ name, type, price_per_hour: parseFloat(price), status: 'available' });
      onSaved();
      window.location.reload();
    } catch { alert('Failed to create board'); }
    finally { setSaving(false); }
  };

  return (
    <Modal title="Deploy New Board" onClose={onClose}>
      <div className="space-y-6">
        <Field label="Board Name/Number"><input value={name} onChange={e => setName(e.target.value)} placeholder="Board Alpha" className="input-field" /></Field>
        <Field label="Board Type">
          <select value={type} onChange={e => setType(e.target.value as any)} className="input-field">
            <option value="indoor">Premium Indoor</option>
            <option value="outdoor">Casual Outdoor</option>
          </select>
        </Field>
        <Field label="Tariff ($/Hour)"><input value={price} onChange={e => setPrice(e.target.value)} type="number" step="0.5" placeholder="0.00" className="input-field" /></Field>
        <div className="pt-4">
          <button onClick={save} disabled={saving} className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs text-black" style={{ background: '#4ADE80' }}>
            {saving ? 'DEPLOYING...' : 'Register Board'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
