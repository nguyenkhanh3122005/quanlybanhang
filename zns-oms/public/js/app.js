/**
 * ZNS ORDER MASTER PRO - ENTERPRISE FRONTEND APPLICATION CORE
 * Tích hợp RBAC, Strict State Machine, PII Masking, Webhooks & Disaster Recovery
 */

// Application State
const state = {
  activeTab: 'dashboard',
  currentUserId: 'usr-admin-1',
  currentUser: { id: 'usr-admin-1', name: 'Nguyễn Quản Trị', role: 'admin' },
  permissions: {},
  orders: [],
  filteredOrders: [],
  customers: [],
  products: [],
  categories: [],
  settings: {},
  znsLogs: [],
  auditLogs: [],
  backups: [],
  queueJobs: [],
  currentOrderForDetail: null,
  currentOrderForPrint: null,
  printFormat: 'a4',
  newOrderCart: [],
  charts: {
    revenue: null,
    status: null,
    reports: null
  }
};

// Helper: Custom fetch with RBAC headers & Dynamic Backend Base URL (Render.com / Custom Cloud Backend)
const API_BASE_URL = window.API_BASE_URL || localStorage.getItem('ZNS_API_BASE_URL') || '';

async function apiFetch(url, options = {}) {
  const headers = options.headers || {};
  headers['x-user-id'] = state.currentUserId;
  options.headers = headers;

  const fullUrl = (url.startsWith('/api') && API_BASE_URL)
    ? API_BASE_URL.replace(/\/+$/, '') + url
    : url;

  return fetch(fullUrl, options);
}

// Currency Formatter
const formatVND = (num) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);

// Date Formatter
const formatDate = (isoStr) => {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// Chuẩn hóa và kiểm tra số điện thoại di động Việt Nam hợp lệ (10 số, đầu 3,5,7,8,9)
function validateAndFormatVNPhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return {
      isValid: false,
      formattedPhone: '',
      displayPhone: '',
      message: 'Số điện thoại không được để trống.',
    };
  }

  let cleanPhone = phone.replace(/[\s.()\-]/g, '');
  const regex = /^(?:\+84|84|0)[35789]\d{8}$/;

  if (!regex.test(cleanPhone)) {
    return {
      isValid: false,
      formattedPhone: cleanPhone,
      displayPhone: cleanPhone,
      message: 'Số điện thoại không đúng định dạng di động Việt Nam (10 số).',
    };
  }

  let znsPhone = cleanPhone;
  if (znsPhone.startsWith('+84')) {
    znsPhone = znsPhone.slice(1);
  } else if (znsPhone.startsWith('0')) {
    znsPhone = '84' + znsPhone.slice(1);
  }

  let displayPhone = '0' + znsPhone.slice(2);

  return {
    isValid: true,
    formattedPhone: znsPhone,
    displayPhone,
    message: 'Hợp lệ',
  };
}

// Toast Notifications
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const bg = type === 'success' ? 'bg-emerald-600 text-white' : type === 'error' ? 'bg-rose-600 text-white' : 'bg-slate-900 text-white';
  const icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-triangle-exclamation' : 'fa-circle-info';

  toast.className = `${bg} px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold pointer-events-auto animate-in slide-in-from-bottom duration-200`;
  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ==============================================
// INITIALIZATION
// ==============================================
document.addEventListener('DOMContentLoaded', async () => {
  await loadCurrentUser();
  await loadSettings();
  await loadCategories();
  await loadProducts();
  await loadCustomers();
  await loadOrders();
  await loadDashboard();
  loadZaloLeads();

  const hash = window.location.hash.replace('#', '');
  if (hash && ['dashboard', 'orders', 'customers', 'products', 'logistics', 'reconciliation', 'zns', 'zalobot', 'audit', 'backups', 'monitoring', 'reports', 'settings'].includes(hash)) {
    switchTab(hash);
  } else {
    switchTab('dashboard');
  }
});

// ==============================================
// RBAC USER & ROLE MANAGEMENT
// ==============================================
async function loadCurrentUser() {
  try {
    const res = await apiFetch('/api/users/current');
    const data = await res.json();
    if (data.success) {
      state.currentUser = data.currentUser;
      state.permissions = data.permissions;

      // Update header avatar & text
      document.getElementById('top-user-name').innerText = data.currentUser.name;
      document.getElementById('top-user-avatar').src = data.currentUser.avatar;
      document.getElementById('top-user-role-badge').innerText = data.currentUser.role.toUpperCase();
      document.getElementById('user-role-select').value = data.currentUser.id;

      applyRoleUiRestrictions();
    }
  } catch (err) {
    console.error('Lỗi tải người dùng:', err);
  }
}

async function switchUserRole(userId) {
  state.currentUserId = userId;
  await loadCurrentUser();
  await loadProducts();
  await loadCustomers();
  await loadOrders();
  await loadDashboard();
  showToast(`Đã chuyển sang vai trò: ${state.currentUser.name} (${state.currentUser.role.toUpperCase()})`, 'info');
}

function applyRoleUiRestrictions() {
  const isWarehouse = state.currentUser.role === 'warehouse';

  // Warehouse: Hide revenue cards and revenue charts
  document.querySelectorAll('.kpi-revenue-card').forEach(el => {
    el.style.display = isWarehouse ? 'none' : 'block';
  });
  const revChartBox = document.getElementById('box-chart-revenue');
  if (revChartBox) revChartBox.style.display = isWarehouse ? 'none' : 'block';

  // Warehouse: Hide cost price columns
  document.querySelectorAll('.col-cost-price').forEach(el => {
    el.style.display = isWarehouse ? 'none' : 'table-cell';
  });

  // Buttons visibility
  const btnTopAdd = document.getElementById('btn-top-create-order');
  const btnSideAdd = document.getElementById('btn-sidebar-create-order');
  const btnOrderAdd = document.getElementById('btn-order-add');
  const canCreate = state.permissions.createOrder;

  if (btnTopAdd) btnTopAdd.style.display = canCreate ? 'flex' : 'none';
  if (btnSideAdd) btnSideAdd.style.display = canCreate ? 'flex' : 'none';
  if (btnOrderAdd) btnOrderAdd.style.display = canCreate ? 'flex' : 'none';
}

// ==============================================
// MOBILE DRAWER & PHONE CONNECT
// ==============================================
function toggleMobileSidebar() {
  const sidebar = document.getElementById('app-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (!sidebar) return;
  const isOpen = sidebar.classList.contains('sidebar-open');
  if (isOpen) {
    closeMobileSidebar();
  } else {
    sidebar.classList.add('sidebar-open');
    if (backdrop) backdrop.classList.add('active');
  }
}

function closeMobileSidebar() {
  const sidebar = document.getElementById('app-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (sidebar) sidebar.classList.remove('sidebar-open');
  if (backdrop) backdrop.classList.remove('active');
}

async function openPhoneConnectModal() {
  const modal = document.getElementById('modal-phone-connect');
  if (!modal) return;
  modal.classList.remove('hidden');

  try {
    const res = await fetch('/api/system/network-info');
    const data = await res.json();
    if (data.success) {
      const urlInput = document.getElementById('phone-access-url');
      const qrImg = document.getElementById('phone-qr-img');
      if (urlInput) urlInput.value = data.networkUrl;
      if (qrImg) qrImg.src = data.qrCodeUrl;
    }
  } catch (err) {
    console.error('Lỗi lấy thông tin mạng:', err);
  }
}

function closePhoneConnectModal() {
  const modal = document.getElementById('modal-phone-connect');
  if (modal) modal.classList.add('hidden');
}

function copyPhoneUrl() {
  const urlInput = document.getElementById('phone-access-url');
  if (!urlInput) return;
  urlInput.select();
  navigator.clipboard.writeText(urlInput.value).then(() => {
    showToast('Đã sao chép link truy cập vào bộ nhớ tạm!');
  }).catch(() => {
    showToast('Vui lòng bôi đen và sao chép thủ công', 'error');
  });
}

// ==============================================
// TAB NAVIGATION
// ==============================================
function switchTab(tabId) {
  state.activeTab = tabId;
  window.location.hash = tabId;

  // Auto close mobile drawer when switching view
  closeMobileSidebar();

  // Desktop sidebar navigation links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('bg-blue-600', 'text-white', 'shadow-md', 'shadow-blue-600/30');
    link.classList.add('text-slate-400', 'hover:bg-slate-800', 'hover:text-white');
  });

  const activeNav = document.getElementById(`nav-${tabId}`);
  if (activeNav) {
    activeNav.classList.remove('text-slate-400', 'hover:bg-slate-800', 'hover:text-white');
    activeNav.classList.add('bg-blue-600', 'text-white', 'shadow-md', 'shadow-blue-600/30');
  }

  // Mobile bottom navigation bar links
  document.querySelectorAll('.bottom-nav-btn').forEach(btn => {
    btn.classList.remove('text-blue-600');
    btn.classList.add('text-slate-500');
  });
  const activeBNav = document.getElementById(`bnav-${tabId}`);
  if (activeBNav) {
    activeBNav.classList.remove('text-slate-500');
    activeBNav.classList.add('text-blue-600');
  }

  const viewSections = ['dashboard', 'orders', 'customers', 'products', 'logistics', 'reconciliation', 'zns', 'zalobot', 'audit', 'backups', 'monitoring', 'reports', 'settings'];
  viewSections.forEach(v => {
    const el = document.getElementById(`view-${v}`);
    if (el) el.classList.add('hidden');
  });

  const activeView = document.getElementById(`view-${tabId}`);
  if (activeView) activeView.classList.remove('hidden');

  const titles = {
    dashboard: 'Bàn làm việc Tổng quan',
    orders: 'Quản lý Đơn hàng & Vận chuyển (Atomic Transactions)',
    customers: 'Quản trị Khách hàng (CRM & PII Protection)',
    products: 'Danh mục Sản phẩm & Tồn kho (Optimistic Locking)',
    logistics: 'Vận chuyển Bưu cục & Webhook Simulator',
    reconciliation: 'Đối soát Tiền COD & VietQR Webhook',
    zns: 'Zalo Notification Service (ZNS) Hub',
    zalobot: 'Zalo Chatbot & Tự Động Thu Thập Khách Hàng (AI Lead Engine)',
    audit: 'Nhật ký Kiểm toán Toàn diện (Audit Trail)',
    backups: 'Quản trị Bản sao lưu & Khôi phục CSDL',
    monitoring: 'Hàng đợi Tác vụ Ngầm & Giám sát Hệ thống',
    reports: 'Báo cáo & Phân tích Doanh thu',
    settings: 'Cài đặt Cửa hàng & In ấn'
  };
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.innerText = titles[tabId] || 'Quản lý Đơn hàng';

  if (tabId === 'dashboard') loadDashboard();
  else if (tabId === 'orders') renderOrdersTable();
  else if (tabId === 'customers') renderCustomersTable();
  else if (tabId === 'products') renderProductsTable();
  else if (tabId === 'logistics') loadLogisticsData();
  else if (tabId === 'reconciliation') loadReconciliationData();
  else if (tabId === 'zalobot') { loadZaloLeads(); loadZaloBotConfig(); }
  else if (tabId === 'audit') loadAuditLogs();
  else if (tabId === 'backups') loadBackupsData();
  else if (tabId === 'monitoring') loadMonitoringData();
  else if (tabId === 'zns') { loadZnsLogs(); previewZnsSmartphone(); renderZnsModeBanner(); }
  else if (tabId === 'reports') loadReportsData();
}

function handleGlobalSearch(val) {
  if (state.activeTab !== 'orders') switchTab('orders');
  const orderSearchInput = document.getElementById('order-search-input');
  if (orderSearchInput) orderSearchInput.value = val;
  debounceOrderSearch(val);
}

// ==============================================
// 1. DASHBOARD & CHARTS
// ==============================================
async function loadDashboard() {
  try {
    const res = await apiFetch('/api/reports/dashboard');
    const data = await res.json();
    if (!data.success) return;

    const { kpis, revenueTimeline, statusCounts, topSellingProducts, lowStockAlerts, canViewRevenue } = data;

    if (canViewRevenue) {
      document.getElementById('kpi-revenue').innerText = formatVND(kpis.totalRevenue);
      document.getElementById('kpi-expected-revenue').innerText = formatVND(kpis.expectedRevenue);
      renderRevenueChart(revenueTimeline);
    }

    document.getElementById('kpi-total-orders').innerText = kpis.totalOrders;
    document.getElementById('badge-total-orders').innerText = kpis.totalOrders;
    document.getElementById('kpi-success-rate').innerText = `${kpis.completionRate}%`;
    document.getElementById('kpi-processing-orders').innerText = kpis.pendingOrders + kpis.shippingOrders;
    document.getElementById('kpi-shipping-orders').innerText = kpis.shippingOrders;
    document.getElementById('kpi-pending-orders').innerText = kpis.pendingOrders;
    document.getElementById('kpi-zns-sent').innerText = kpis.znsMessagesSent;

    renderStatusChart(statusCounts);

    // Recent orders
    const recentOrders = [...state.orders].slice(0, 5);
    const recentTable = document.getElementById('dashboard-recent-orders');
    if (recentTable) {
      if (!recentOrders.length) {
        recentTable.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-slate-400">Chưa có đơn hàng nào</td></tr>`;
      } else {
        recentTable.innerHTML = recentOrders.map(o => `
          <tr class="hover:bg-slate-50/80 transition">
            <td class="px-4 py-3 font-semibold text-blue-600 font-mono">${o.code}</td>
            <td class="px-4 py-3 font-medium text-slate-800">${o.customerName}</td>
            <td class="px-4 py-3 font-bold text-slate-900">${canViewRevenue ? formatVND(o.totalAmount) : '***'}</td>
            <td class="px-4 py-3">${getStatusBadgeHTML(o.orderStatus)}</td>
            <td class="px-4 py-3 text-right">
              <button onclick="openOrderDetailModal('${o.id}')" class="text-blue-600 hover:text-blue-800 font-semibold text-xs">
                Chi tiết &rarr;
              </button>
            </td>
          </tr>
        `).join('');
      }
    }

    // Low stock
    const lowStockCountEl = document.getElementById('low-stock-count');
    if (lowStockCountEl) lowStockCountEl.innerText = lowStockAlerts.length;
    const lowStockList = document.getElementById('low-stock-list');
    if (lowStockList) {
      if (!lowStockAlerts.length) {
        lowStockList.innerHTML = `<p class="text-xs text-slate-400 italic">Tồn kho an toàn, không có hàng cần báo động.</p>`;
      } else {
        lowStockList.innerHTML = lowStockAlerts.map(p => `
          <div class="flex items-center justify-between p-2 rounded-lg bg-rose-50/50 border border-rose-100 text-xs">
            <div class="flex items-center gap-2">
              <img src="${p.image}" class="w-8 h-8 rounded object-cover border border-slate-200">
              <div>
                <p class="font-semibold text-slate-900 line-clamp-1">${p.name}</p>
                <p class="text-[10px] text-slate-500 font-mono">${p.sku}</p>
              </div>
            </div>
            <span class="font-bold text-rose-600 px-2 py-0.5 bg-rose-100 rounded-md">Còn ${p.stock}</span>
          </div>
        `).join('');
      }
    }

    // Top selling
    const topSellingList = document.getElementById('top-selling-list');
    if (topSellingList) {
      if (!topSellingProducts.length) {
        topSellingList.innerHTML = `<p class="text-xs text-slate-400 italic">Chưa có dữ liệu bán hàng.</p>`;
      } else {
        topSellingList.innerHTML = topSellingProducts.map((p, idx) => `
          <div class="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 text-xs">
            <div class="flex items-center gap-2.5">
              <span class="w-5 h-5 rounded-full ${idx === 0 ? 'bg-amber-400 text-white' : 'bg-slate-200 text-slate-700'} flex items-center justify-center font-bold text-[10px]">${idx + 1}</span>
              <div>
                <p class="font-semibold text-slate-800 line-clamp-1">${p.name}</p>
                <p class="text-[10px] text-slate-500">${canViewRevenue ? formatVND(p.revenue) : ''}</p>
              </div>
            </div>
            <span class="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">${p.quantity} cái</span>
          </div>
        `).join('');
      }
    }
  } catch (err) {
    console.error('Lỗi dashboard:', err);
  }
}

function renderRevenueChart(timeline) {
  const ctx = document.getElementById('chartRevenue');
  if (!ctx) return;
  const labels = timeline.map(t => t.date);
  const data = timeline.map(t => t.revenue);

  if (state.charts.revenue) state.charts.revenue.destroy();
  state.charts.revenue = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Doanh thu (VND)',
        data,
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        borderWidth: 2.5,
        fill: true,
        tension: 0.35,
        pointBackgroundColor: '#2563eb',
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: (val) => (val >= 1000000 ? (val / 1000000).toFixed(1) + 'M' : val.toLocaleString()) }
        }
      }
    }
  });
}

function renderStatusChart(statusCounts) {
  const ctx = document.getElementById('chartStatus');
  if (!ctx) return;
  if (state.charts.status) state.charts.status.destroy();
  state.charts.status = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Chờ duyệt', 'Đang đóng gói', 'Đang giao', 'Hoàn thành', 'Đã hủy'],
      datasets: [{
        data: [statusCounts.pending, statusCounts.processing, statusCounts.shipping, statusCounts.completed, statusCounts.cancelled],
        backgroundColor: ['#f59e0b', '#6366f1', '#0284c7', '#10b981', '#ef4444'],
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } } },
      cutout: '65%'
    }
  });
}

function getStatusBadgeHTML(status) {
  switch (status) {
    case 'pending': return `<span class="badge-pending px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1"><i class="fa-solid fa-clock"></i> Chờ duyệt</span>`;
    case 'processing': return `<span class="badge-processing px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1"><i class="fa-solid fa-box"></i> Đóng gói</span>`;
    case 'shipping': return `<span class="badge-shipping px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1"><i class="fa-solid fa-truck-fast"></i> Đang giao</span>`;
    case 'completed': return `<span class="badge-completed px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1"><i class="fa-solid fa-circle-check"></i> Hoàn thành</span>`;
    case 'cancelled': return `<span class="badge-cancelled px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1"><i class="fa-solid fa-circle-xmark"></i> Đã hủy</span>`;
    case 'returned': return `<span class="bg-rose-100 text-rose-800 px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1"><i class="fa-solid fa-rotate-left"></i> Chuyển hoàn</span>`;
    default: return `<span class="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full text-[11px] font-semibold">${status}</span>`;
  }
}

// ==============================================
// 2. ORDERS MANAGEMENT
// ==============================================
async function loadOrders() {
  try {
    const res = await apiFetch('/api/orders');
    const data = await res.json();
    if (data.success) {
      state.orders = data.orders;
      state.filteredOrders = [...data.orders];
      updateOrderStatusTabCounts();
      renderOrdersTable();
    }
  } catch (err) {
    console.error('Lỗi tải danh sách đơn:', err);
  }
}

function updateOrderStatusTabCounts() {
  const counts = { all: state.orders.length, pending: 0, processing: 0, shipping: 0, completed: 0, cancelled: 0 };
  state.orders.forEach(o => {
    if (counts[o.orderStatus] !== undefined) counts[o.orderStatus]++;
  });

  const tabAll = document.getElementById('tab-count-all');
  if (tabAll) tabAll.innerText = counts.all;
  const tabPending = document.getElementById('tab-count-pending');
  if (tabPending) tabPending.innerText = counts.pending;
  const tabProc = document.getElementById('tab-count-processing');
  if (tabProc) tabProc.innerText = counts.processing;
  const tabShip = document.getElementById('tab-count-shipping');
  if (tabShip) tabShip.innerText = counts.shipping;
  const tabComp = document.getElementById('tab-count-completed');
  if (tabComp) tabComp.innerText = counts.completed;
  const tabCanc = document.getElementById('tab-count-cancelled');
  if (tabCanc) tabCanc.innerText = counts.cancelled;

  const totalBadge = document.getElementById('badge-total-orders');
  if (totalBadge) totalBadge.innerText = counts.all;
  const bnavBadge = document.getElementById('bnav-order-badge');
  if (bnavBadge) bnavBadge.innerText = counts.all;
}

let currentFilterStatus = 'all';
function filterOrdersByStatus(status) {
  currentFilterStatus = status;
  document.querySelectorAll('.status-tab-btn').forEach(btn => {
    if (btn.getAttribute('data-status') === status) {
      btn.className = 'status-tab-btn px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white';
    } else {
      btn.className = 'status-tab-btn px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100';
    }
  });
  applyOrderFilters();
}

let searchDebounceTimeout = null;
function debounceOrderSearch(val) {
  clearTimeout(searchDebounceTimeout);
  searchDebounceTimeout = setTimeout(() => applyOrderFilters(), 250);
}

function applyOrderFilters() {
  const searchVal = (document.getElementById('order-search-input')?.value || '').toLowerCase().trim();
  const paymentFilter = document.getElementById('filter-payment-status')?.value || 'all';

  let list = [...state.orders];
  if (currentFilterStatus !== 'all') list = list.filter(o => o.orderStatus === currentFilterStatus);
  if (paymentFilter !== 'all') list = list.filter(o => o.paymentStatus === paymentFilter);
  if (searchVal) {
    list = list.filter(o =>
      (o.code && o.code.toLowerCase().includes(searchVal)) ||
      (o.customerName && o.customerName.toLowerCase().includes(searchVal)) ||
      (o.customerPhone && o.customerPhone.includes(searchVal)) ||
      (o.trackingCode && o.trackingCode.toLowerCase().includes(searchVal))
    );
  }
  state.filteredOrders = list;
  renderOrdersTable();
}

function renderOrdersTable() {
  const tbody = document.getElementById('orders-table-body');
  if (!tbody) return;

  const countEl = document.getElementById('orders-showing-count');
  if (countEl) countEl.innerText = state.filteredOrders.length;

  if (!state.filteredOrders.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="px-6 py-12 text-center text-slate-400 font-medium">Không tìm thấy đơn hàng nào</td></tr>`;
    return;
  }

  const isWarehouse = state.currentUser.role === 'warehouse';

  tbody.innerHTML = state.filteredOrders.map(o => {
    const itemCount = Array.isArray(o.items) ? o.items.reduce((s, it) => s + (it.quantity || 1), 0) : 0;
    const itemNames = Array.isArray(o.items) ? o.items.map(it => `${it.name} (x${it.quantity})`).join(', ') : '';

    return `
      <tr class="hover:bg-slate-50/80 transition group">
        <td class="px-4 py-3.5">
          <div class="font-mono font-bold text-blue-600 hover:underline cursor-pointer" onclick="openOrderDetailModal('${o.id}')">
            ${o.code}
          </div>
          <div class="text-[10px] text-slate-400 mt-0.5">${formatDate(o.createdAt)}</div>
        </td>

        <td class="px-4 py-3.5">
          <div class="font-semibold text-slate-900">${o.customerName}</div>
          <div class="text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
            <i class="fa-solid fa-phone text-slate-400 text-[10px]"></i> ${o.customerPhone}
            ${!isWarehouse ? `<a href="https://zalo.me/${o.customerPhone}" target="_blank" title="Nhắn Zalo" class="text-blue-500 hover:text-blue-700"><i class="fa-solid fa-comment-dots"></i></a>` : ''}
          </div>
        </td>

        <td class="px-4 py-3.5 max-w-xs">
          <div class="font-semibold text-slate-800">${itemCount} sản phẩm</div>
          <div class="text-[10px] text-slate-500 truncate" title="${itemNames}">${itemNames}</div>
        </td>

        <td class="px-4 py-3.5">
          <div class="font-bold text-slate-900 text-sm">${isWarehouse ? '***' : formatVND(o.totalAmount)}</div>
          <div class="text-[10px] mt-0.5">
            ${o.paymentStatus === 'paid'
              ? '<span class="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold"><i class="fa-solid fa-check"></i> Đã trả</span>'
              : '<span class="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-semibold"><i class="fa-solid fa-clock"></i> Chưa trả</span>'
            }
            <span class="text-slate-400 font-mono">(${o.paymentMethod})</span>
          </div>
        </td>

        <td class="px-4 py-3.5">
          <div class="font-medium text-slate-700">${o.carrier || 'Tự giao'}</div>
          <div class="text-[10px] text-blue-600 font-mono">${o.trackingCode || 'Chưa có mã'}</div>
        </td>

        <td class="px-4 py-3.5">${getStatusBadgeHTML(o.orderStatus)}</td>

        <td class="px-4 py-3.5">
          ${o.znsSent 
            ? '<span class="text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1"><i class="fa-solid fa-check-double"></i> ZNS</span>'
            : '<span class="text-slate-400 text-[10px]">Chưa gửi</span>'
          }
        </td>

        <td class="px-4 py-3.5 text-right space-x-1">
          <button onclick="openOrderDetailModal('${o.id}')" title="Xem chi tiết" class="p-1.5 text-slate-600 hover:text-blue-600 rounded hover:bg-slate-200/60">
            <i class="fa-solid fa-eye"></i>
          </button>
          <button onclick="openPrintModal('${o.id}')" title="In phiếu / Tem nhãn" class="p-1.5 text-slate-600 hover:text-emerald-600 rounded hover:bg-slate-200/60">
            <i class="fa-solid fa-print"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// ==============================================
// 3. CREATE ORDER MODAL (ATOMIC TRANSACTION)
// ==============================================
function openCreateOrderModal() {
  if (!state.permissions.createOrder) {
    showToast('Vai trò của bạn không có quyền tạo đơn hàng', 'error');
    return;
  }
  state.newOrderCart = [];
  document.getElementById('new-order-phone').value = '';
  document.getElementById('new-order-name').value = '';
  document.getElementById('new-order-address').value = '';
  document.getElementById('new-order-customer-note').value = '';
  document.getElementById('calc-shipping').value = '30000';
  document.getElementById('calc-discount').value = '0';
  document.getElementById('toggle-send-zns').checked = true;

  populateProductDropdown();
  renderNewOrderCart();

  const modal = document.getElementById('modal-create-order');
  if (modal) modal.classList.remove('hidden');
}

function closeCreateOrderModal() {
  const modal = document.getElementById('modal-create-order');
  if (modal) modal.classList.add('hidden');
}

function populateProductDropdown() {
  const select = document.getElementById('quick-add-product-select');
  if (!select) return;

  select.innerHTML = '<option value="">+ Chọn nhanh sản phẩm từ kho...</option>' +
    state.products.map(p => `
      <option value="${p.id}" ${p.stock <= 0 ? 'disabled' : ''}>
        ${p.name} - Giá: ${formatVND(p.salePrice)} (Còn: ${p.stock})
      </option>
    `).join('');
}

function lookupCustomerByPhone(phone) {
  const cleanPhone = phone.trim();
  if (cleanPhone.length >= 9) {
    const cust = state.customers.find(c => c.phone === cleanPhone);
    if (cust) {
      document.getElementById('new-order-name').value = cust.name;
      document.getElementById('new-order-address').value = cust.address || '';
      showToast(`Đã nhận diện khách quen: ${cust.name}`, 'info');
    }
  }
}

function addProductToNewOrder(productId) {
  if (!productId) return;
  const prod = state.products.find(p => p.id === productId);
  if (!prod) return;

  if (prod.stock <= 0) {
    showToast(`Sản phẩm "${prod.name}" đã hết hàng!`, 'error');
    return;
  }

  const existing = state.newOrderCart.find(it => it.productId === prod.id);
  if (existing) {
    if (existing.quantity >= prod.stock) {
      showToast(`Tối đa tồn kho hiện có là ${prod.stock}`, 'error');
      return;
    }
    existing.quantity += 1;
  } else {
    state.newOrderCart.push({
      productId: prod.id,
      name: prod.name,
      sku: prod.sku,
      price: prod.salePrice,
      quantity: 1,
      stockMax: prod.stock,
      expectedVersion: prod.version || 1 // Optimistic Locking Version Check
    });
  }

  document.getElementById('quick-add-product-select').value = '';
  renderNewOrderCart();
}

function updateCartItemQty(prodId, delta) {
  const item = state.newOrderCart.find(it => it.productId === prodId);
  if (!item) return;

  item.quantity += delta;
  if (item.quantity > item.stockMax) {
    item.quantity = item.stockMax;
    showToast(`Tối đa tồn kho hiện có là ${item.stockMax}`, 'error');
  }

  if (item.quantity <= 0) {
    state.newOrderCart = state.newOrderCart.filter(it => it.productId !== prodId);
  }

  renderNewOrderCart();
}

function removeCartItem(prodId) {
  state.newOrderCart = state.newOrderCart.filter(it => it.productId !== prodId);
  renderNewOrderCart();
}

function renderNewOrderCart() {
  const tbody = document.getElementById('new-order-items-table');
  if (!tbody) return;

  if (!state.newOrderCart.length) {
    tbody.innerHTML = `
      <tr id="empty-cart-row">
        <td colspan="6" class="px-4 py-8 text-center text-slate-400">Chưa có sản phẩm nào trong đơn hàng.</td>
      </tr>
    `;
  } else {
    tbody.innerHTML = state.newOrderCart.map(it => `
      <tr class="hover:bg-slate-50/70">
        <td class="px-3 py-2.5 font-semibold text-slate-900">${it.name}</td>
        <td class="px-3 py-2.5 font-mono text-slate-500 text-[11px]">${it.sku}</td>
        <td class="px-3 py-2.5 font-medium text-slate-700">${formatVND(it.price)}</td>
        <td class="px-3 py-2.5">
          <div class="flex items-center gap-1.5">
            <button onclick="updateCartItemQty('${it.productId}', -1)" class="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 font-bold text-slate-700">-</button>
            <span class="font-bold w-6 text-center">${it.quantity}</span>
            <button onclick="updateCartItemQty('${it.productId}', 1)" class="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 font-bold text-slate-700">+</button>
          </div>
        </td>
        <td class="px-3 py-2.5 font-bold text-slate-900">${formatVND(it.price * it.quantity)}</td>
        <td class="px-3 py-2.5 text-center">
          <button onclick="removeCartItem('${it.productId}')" class="text-rose-500 hover:text-rose-700"><i class="fa-solid fa-trash-can"></i></button>
        </td>
      </tr>
    `).join('');
  }

  recalculateOrderSummary();
}

function recalculateOrderSummary() {
  const subtotal = state.newOrderCart.reduce((sum, it) => sum + (it.price * it.quantity), 0);
  const shipping = Number(document.getElementById('calc-shipping')?.value || 0);
  const discount = Number(document.getElementById('calc-discount')?.value || 0);
  const total = Math.max(0, subtotal + shipping - discount);

  document.getElementById('calc-subtotal').innerText = formatVND(subtotal);
  document.getElementById('calc-total').innerText = formatVND(total);
}

async function submitNewOrder() {
  const name = document.getElementById('new-order-name')?.value.trim();
  const phone = document.getElementById('new-order-phone')?.value.trim();
  const address = document.getElementById('new-order-address')?.value.trim();
  const carrier = document.getElementById('new-order-carrier')?.value;
  const paymentMethod = document.getElementById('new-order-payment-method')?.value;
  const customerNote = document.getElementById('new-order-customer-note')?.value.trim();
  const shippingFee = Number(document.getElementById('calc-shipping')?.value || 0);
  const discount = Number(document.getElementById('calc-discount')?.value || 0);
  const sendZns = document.getElementById('toggle-send-zns')?.checked;

  if (!name || !address) {
    showToast('Vui lòng nhập đầy đủ tên và địa chỉ khách hàng!', 'error');
    return;
  }

  // Xác thực và chuẩn hóa số điện thoại di động Việt Nam
  const phoneCheck = validateAndFormatVNPhone(phone);
  if (!phoneCheck.isValid) {
    showToast(phoneCheck.message, 'error');
    return;
  }

  if (!state.newOrderCart.length) {
    showToast('Đơn hàng chưa có sản phẩm nào!', 'error');
    return;
  }

  try {
    const payload = {
      customerName: name,
      customerPhone: phoneCheck.displayPhone,
      customerAddress: address,
      items: state.newOrderCart.map(it => ({
        productId: it.productId,
        quantity: it.quantity,
        expectedVersion: it.expectedVersion
      })),
      shippingFee,
      discount,
      carrier,
      paymentMethod,
      customerNote,
      sendZns
    };

    const res = await apiFetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!data.success) {
      showToast(data.message || 'Lỗi khi tạo đơn hàng qua Transaction', 'error');
      return;
    }

    showToast(`Đã tạo đơn ${data.order.code} thành công qua Transaction!`, 'success');
    if (sendZns && data.zns?.success) {
      showToast(`Đã gửi thông báo Zalo ZNS tới ${phone}!`, 'info');
    }

    closeCreateOrderModal();
    await loadProducts();
    await loadCustomers();
    await loadOrders();
    await loadDashboard();
    openOrderDetailModal(data.order.id);
  } catch (err) {
    showToast('Lỗi mạng khi tạo đơn hàng', 'error');
  }
}

// ==============================================
// 4. ORDER DETAIL & STRICT STATE MACHINE
// ==============================================
async function openOrderDetailModal(orderId) {
  try {
    const res = await apiFetch(`/api/orders/${orderId}`);
    const data = await res.json();
    if (!data.success) {
      showToast('Không tìm thấy đơn hàng', 'error');
      return;
    }

    const o = data.order;
    state.currentOrderForDetail = o;

    document.getElementById('detail-order-code').innerText = o.code;
    document.getElementById('detail-order-date').innerText = `Ngày tạo: ${formatDate(o.createdAt)}`;
    document.getElementById('detail-status-badge').innerHTML = getStatusBadgeHTML(o.orderStatus);

    // Populate ONLY valid next states from State Machine
    const nextStatesSelect = document.getElementById('detail-change-status-select');
    if (nextStatesSelect) {
      const available = data.availableNextStates || [];
      if (!available.length) {
        nextStatesSelect.innerHTML = `<option value="">(Trạng thái kết thúc - Không thể đổi)</option>`;
        nextStatesSelect.disabled = true;
      } else {
        nextStatesSelect.disabled = false;
        nextStatesSelect.innerHTML = available.map(s => `
          <option value="${s.status}">${s.label}</option>
        `).join('');
      }
    }

    document.getElementById('detail-customer-name').innerText = o.customerName;
    document.getElementById('detail-customer-phone').innerText = o.customerPhone;
    document.getElementById('detail-zalo-link').href = `https://zalo.me/${o.customerPhone}`;
    document.getElementById('detail-customer-address').innerText = o.customerAddress;

    document.getElementById('detail-carrier').innerText = o.carrier || 'Chưa chọn';
    document.getElementById('detail-tracking').innerText = o.trackingCode || 'Chưa cập nhật';
    document.getElementById('detail-payment-method').innerText = o.paymentMethod;
    document.getElementById('detail-payment-status').innerText = o.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán (Thu COD)';
    document.getElementById('detail-notes').innerText = o.customerNote || 'Không có ghi chú';

    const canViewRev = state.permissions.viewRevenue;
    const itemsTbody = document.getElementById('detail-items-table');
    if (itemsTbody) {
      itemsTbody.innerHTML = (o.items || []).map(it => `
        <tr class="hover:bg-slate-50/70">
          <td class="px-4 py-2.5 font-semibold text-slate-900">${it.name}</td>
          <td class="px-4 py-2.5 font-mono text-slate-500">${it.sku}</td>
          <td class="px-4 py-2.5">${canViewRev ? formatVND(it.price) : '***'}</td>
          <td class="px-4 py-2.5 font-bold">${it.quantity}</td>
          <td class="px-4 py-2.5 text-right font-bold text-slate-900">${canViewRev ? formatVND(it.total) : '***'}</td>
        </tr>
      `).join('');
    }

    document.getElementById('detail-subtotal').innerText = canViewRev ? formatVND(o.subtotal) : '***';
    document.getElementById('detail-shipping').innerText = canViewRev ? formatVND(o.shippingFee) : '***';
    document.getElementById('detail-discount').innerText = canViewRev ? `-${formatVND(o.discount)}` : '***';
    document.getElementById('detail-total').innerText = canViewRev ? formatVND(o.totalAmount) : '***';

    const timelineBox = document.getElementById('detail-timeline-container');
    if (timelineBox) {
      timelineBox.innerHTML = (o.timeline || []).map(tl => `
        <div class="relative pl-3 pb-2">
          <div class="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow-sm"></div>
          <div class="flex items-center justify-between text-[11px]">
            <strong class="text-slate-900 font-bold">${tl.title}</strong>
            <span class="text-slate-400">${formatDate(tl.time)}</span>
          </div>
          <p class="text-slate-600 text-[11px] mt-0.5">${tl.desc}</p>
          <span class="text-[10px] text-slate-400">Bởi: ${tl.user || 'Hệ thống'}</span>
        </div>
      `).join('');
    }

    const modal = document.getElementById('modal-order-detail');
    if (modal) modal.classList.remove('hidden');
  } catch (err) {
    console.error('Lỗi xem chi tiết đơn:', err);
  }
}

function closeOrderDetailModal() {
  const modal = document.getElementById('modal-order-detail');
  if (modal) modal.classList.add('hidden');
}

async function unmaskCurrentOrderPII() {
  if (!state.currentOrderForDetail) return;
  const reason = prompt('Nhập lý do xem thông tin đầy đủ khách hàng (sẽ ghi vào Audit Log bảo mật):', 'Liên hệ bưu tá giao hàng');
  if (!reason) return;

  try {
    const res = await apiFetch(`/api/orders/${state.currentOrderForDetail.id}/unmask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    const data = await res.json();
    if (data.success) {
      document.getElementById('detail-customer-phone').innerText = data.customerPhone;
      document.getElementById('detail-customer-address').innerText = data.customerAddress;
      document.getElementById('detail-zalo-link').href = `https://zalo.me/${data.customerPhone}`;
      showToast('Đã mở khóa thông tin PII khách hàng thành công (Audit logged)', 'info');
    }
  } catch (err) {
    showToast('Lỗi khi mở khóa PII', 'error');
  }
}

async function updateOrderStatusFromDetail() {
  if (!state.currentOrderForDetail) return;
  const newStatus = document.getElementById('detail-change-status-select')?.value;
  if (!newStatus) return;

  try {
    const res = await apiFetch(`/api/orders/${state.currentOrderForDetail.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, sendZns: true })
    });

    const data = await res.json();
    if (data.success) {
      showToast(`Đã chuyển trạng thái đơn sang [${newStatus}]!`, 'success');
      if (data.zns?.success) showToast('Đã tự động gửi ZNS cho khách hàng!', 'info');
      await loadOrders();
      await loadDashboard();
      openOrderDetailModal(state.currentOrderForDetail.id);
    } else {
      showToast(data.message || 'Lỗi cập nhật trạng thái', 'error');
    }
  } catch (err) {
    showToast('Lỗi kết nối máy chủ', 'error');
  }
}

function printCurrentOrder() {
  if (state.currentOrderForDetail) openPrintModal(state.currentOrderForDetail.id);
}

// ==============================================
// 5. PRINT INVOICE & SHIPPING LABELS (A4, A5, A6, K80)
// ==============================================
function openPrintModal(orderId) {
  const order = state.orders.find(o => o.id === orderId || o.code === orderId) || state.currentOrderForDetail;
  if (!order) return;
  state.currentOrderForPrint = order;
  state.printFormat = 'a4';
  renderPrintableArea();
  const modal = document.getElementById('modal-print');
  if (modal) modal.classList.remove('hidden');
}

function closePrintModal() {
  const modal = document.getElementById('modal-print');
  if (modal) modal.classList.add('hidden');
}

function setPrintFormat(format) {
  state.printFormat = format;
  ['a4', 'a5', 'a6', 'k80'].forEach(f => {
    const btn = document.getElementById(`btn-format-${f}`);
    if (btn) {
      if (f === format) btn.className = 'px-2.5 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white';
      else btn.className = 'px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:text-white';
    }
  });
  renderPrintableArea();
}

function renderPrintableArea() {
  const container = document.getElementById('printable-area');
  if (!container || !state.currentOrderForPrint) return;

  const o = state.currentOrderForPrint;
  const s = state.settings;
  const vietQrUrl = `https://api.vietqr.io/image/${s.bankBin || '970422'}-${s.bankAccount || '090912345688'}-compact2.jpg?amount=${o.totalAmount}&addInfo=${encodeURIComponent(o.code)}`;

  if (state.printFormat === 'a4') {
    // A4 DELIVERY NOTE
    container.className = 'receipt-a4';
    container.innerHTML = `
      <div class="space-y-6">
        <div class="flex items-start justify-between border-b-2 border-slate-900 pb-4">
          <div>
            <h1 class="text-xl font-extrabold uppercase text-slate-900">${s.storeName || 'CỬA HÀNG BÁN LẺ'}</h1>
            <p class="text-xs text-slate-600 mt-1">Địa chỉ: ${s.storeAddress || ''}</p>
            <p class="text-xs text-slate-600">Hotline: <strong>${s.storePhone || ''}</strong></p>
          </div>
          <div class="text-right">
            <h2 class="text-base font-black uppercase text-blue-700">PHIẾU XUẤT KHO KIÊM GIAO HÀNG</h2>
            <p class="text-xs font-mono font-bold text-slate-800 mt-1">Mã đơn: #${o.code}</p>
            <p class="text-[11px] text-slate-500">Ngày: ${formatDate(o.createdAt)}</p>
            <svg id="barcode-print" class="mt-1 ml-auto"></svg>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-6 text-xs p-3.5 bg-slate-50 rounded-lg border border-slate-200">
          <div>
            <h4 class="font-bold text-slate-800 uppercase mb-1">KHÁCH HÀNG:</h4>
            <p>Họ tên: <strong class="text-slate-900">${o.customerName}</strong></p>
            <p>Số điện thoại: <strong class="font-mono text-slate-900">${o.customerPhone}</strong></p>
            <p>Địa chỉ: ${o.customerAddress}</p>
          </div>
          <div>
            <h4 class="font-bold text-slate-800 uppercase mb-1">VẬN CHUYỂN & THANH TOÁN:</h4>
            <p>ĐVVC: <strong>${o.carrier || 'N/A'}</strong></p>
            <p>Mã vận đơn: <strong class="font-mono text-blue-700">${o.trackingCode || 'N/A'}</strong></p>
            <p>Thanh toán: <strong>${o.paymentMethod}</strong> (${o.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Thu tiền COD'})</p>
          </div>
        </div>

        <table class="w-full text-xs text-left border border-slate-300">
          <thead class="bg-slate-100 font-bold border-b border-slate-300">
            <tr>
              <th class="p-2 border-r border-slate-300 w-10 text-center">STT</th>
              <th class="p-2 border-r border-slate-300">Tên sản phẩm</th>
              <th class="p-2 border-r border-slate-300 w-28">Mã SKU</th>
              <th class="p-2 border-r border-slate-300 w-24 text-right">Đơn giá</th>
              <th class="p-2 border-r border-slate-300 w-16 text-center">SL</th>
              <th class="p-2 text-right w-28">Thành tiền</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            ${(o.items || []).map((it, idx) => `
              <tr>
                <td class="p-2 border-r border-slate-200 text-center">${idx + 1}</td>
                <td class="p-2 border-r border-slate-200 font-medium">${it.name}</td>
                <td class="p-2 border-r border-slate-200 font-mono text-[11px]">${it.sku}</td>
                <td class="p-2 border-r border-slate-200 text-right">${formatVND(it.price)}</td>
                <td class="p-2 border-r border-slate-200 text-center font-bold">${it.quantity}</td>
                <td class="p-2 text-right font-bold">${formatVND(it.total)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot class="border-t-2 border-slate-300 font-bold bg-slate-50">
            <tr class="text-sm bg-blue-50/60">
              <td colspan="5" class="p-2.5 text-right text-blue-900 font-extrabold uppercase">TỔNG THANH TOÁN:</td>
              <td class="p-2.5 text-right text-blue-700 font-black text-base">${formatVND(o.totalAmount)}</td>
            </tr>
          </tfoot>
        </table>

        <div class="flex items-center gap-4 p-3 border border-slate-200 rounded-lg bg-slate-50">
          <img src="${vietQrUrl}" alt="Mã VietQR" class="w-24 h-24 object-contain rounded border border-slate-300">
          <div class="text-[11px] space-y-0.5">
            <strong class="text-slate-900 block font-bold">QUÉT MÃ VIETQR ĐỂ THANH TOÁN</strong>
            <p class="text-slate-600">Ngân hàng: ${s.bankName} - STK: <strong class="font-mono text-blue-700">${s.bankAccount}</strong></p>
            <p class="text-slate-600">Chủ TK: ${s.bankOwner} | Nội dung: ${o.code}</p>
          </div>
        </div>
      </div>
    `;
  } else if (state.printFormat === 'a6') {
    // A6 SHIPPING LABEL (TEM NHÃN NHIỆT DÁN GÓI HÀNG BƯU CỤC)
    container.className = 'w-[105mm] p-3 mx-auto bg-white border border-slate-300 font-sans text-[11px] leading-tight';
    container.innerHTML = `
      <div class="space-y-2 border-2 border-black p-2 rounded">
        <div class="flex items-center justify-between border-b border-black pb-1.5">
          <div>
            <h2 class="font-black text-sm uppercase">${o.carrier || 'GHN'}</h2>
            <p class="text-[9px] font-mono font-bold">MÃ: ${o.code}</p>
          </div>
          <div class="text-right">
            <span class="bg-black text-white px-2 py-0.5 text-xs font-black uppercase rounded">GIAO TIÊU CHUẨN</span>
          </div>
        </div>

        <div class="text-center py-1">
          <svg id="barcode-print" class="mx-auto"></svg>
          <p class="font-mono font-black text-xs mt-0.5 tracking-wider">${o.trackingCode || o.code}</p>
        </div>

        <div class="grid grid-cols-2 gap-2 border-t border-b border-black py-1.5 text-[10px]">
          <div>
            <p class="font-bold uppercase text-[9px] text-slate-500">NGƯỜI GỬI:</p>
            <p class="font-bold">${s.storeName}</p>
            <p>Hotline: ${s.storePhone}</p>
          </div>
          <div>
            <p class="font-bold uppercase text-[9px] text-slate-500">NGƯỜI NHẬN:</p>
            <p class="font-bold text-xs">${o.customerName}</p>
            <p class="font-mono font-bold">${o.customerPhone}</p>
            <p class="line-clamp-2">${o.customerAddress}</p>
          </div>
        </div>

        <div class="bg-slate-100 p-2 rounded border border-black flex items-center justify-between">
          <div>
            <span class="text-[9px] font-bold uppercase block">TIỀN THU HỘ (COD):</span>
            <span class="text-base font-black text-rose-700">${o.paymentStatus === 'paid' ? '0 đ (ĐÃ TRẢ)' : formatVND(o.totalAmount)}</span>
          </div>
          <div class="text-right text-[9px]">
            <p class="font-bold">Cho xem hàng: CÓ</p>
            <p>Khối lượng: ~500g</p>
          </div>
        </div>

        <div class="text-[9px] text-slate-600 border-t border-dashed border-black pt-1">
          <p><strong>Nội dung hàng:</strong> ${(o.items || []).map(i => `${i.name} (x${i.quantity})`).join(', ')}</p>
        </div>
      </div>
    `;
  } else if (state.printFormat === 'a5') {
    // A5 PACKING SLIP (PHIẾU NHẶT HÀNG KHO)
    container.className = 'w-[148mm] p-4 mx-auto bg-white border border-slate-300 font-sans text-xs leading-normal';
    container.innerHTML = `
      <div class="space-y-3">
        <div class="flex items-center justify-between border-b border-slate-900 pb-2">
          <div>
            <h2 class="font-black text-sm uppercase">PHIẾU NHẶT HÀNG & ĐÓNG GÓI KHO</h2>
            <p class="font-mono font-bold text-blue-700">Mã đơn: #${o.code}</p>
          </div>
          <svg id="barcode-print"></svg>
        </div>

        <div class="bg-slate-50 p-2 rounded text-[11px] border border-slate-200">
          <p>Người nhận: <strong>${o.customerName}</strong> | SĐT: ${o.customerPhone}</p>
          <p>ĐVVC: ${o.carrier} | Mã vận đơn: ${o.trackingCode || 'Chưa gán'}</p>
          <p>Ghi chú kho: <em>${o.staffNote || o.customerNote || 'Không có'}</em></p>
        </div>

        <table class="w-full text-xs text-left border border-slate-300">
          <thead class="bg-slate-100 font-bold border-b border-slate-300">
            <tr>
              <th class="p-2 border-r border-slate-300">Vị trí / Mã SKU</th>
              <th class="p-2 border-r border-slate-300">Tên mặt hàng cần nhặt</th>
              <th class="p-2 border-r border-slate-300 w-16 text-center">Số lượng</th>
              <th class="p-2 w-16 text-center">Đã nhặt</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            ${(o.items || []).map(it => `
              <tr>
                <td class="p-2 border-r border-slate-200 font-mono font-bold">${it.sku}</td>
                <td class="p-2 border-r border-slate-200 font-medium">${it.name}</td>
                <td class="p-2 border-r border-slate-200 text-center font-black text-base text-blue-600">${it.quantity}</td>
                <td class="p-2 text-center text-slate-300 text-lg">&#x25A2;</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="flex justify-between items-center text-[10px] text-slate-500 pt-2 border-t border-slate-200">
          <span>Nhân viên kho kiểm đếm: .............................</span>
          <span>Ký xác nhận đóng gói: .............................</span>
        </div>
      </div>
    `;
  } else {
    // K80 THERMAL RECEIPT
    container.className = 'receipt-k80';
    container.innerHTML = `
      <div class="text-center space-y-1">
        <h2 class="font-bold text-sm uppercase">${s.storeName}</h2>
        <p class="text-[10px]">${s.storeAddress}</p>
        <p class="text-[10px]">Hotline: ${s.storePhone}</p>
        <div class="border-b border-dashed border-black my-2"></div>
        <h3 class="font-bold text-xs uppercase">HÓA ĐƠN BÁN LẺ</h3>
        <p class="text-[11px] font-mono font-bold">#${o.code}</p>
      </div>

      <div class="border-b border-dashed border-black my-2"></div>

      <div class="text-[10px] space-y-0.5">
        <p>Khách: <strong>${o.customerName}</strong></p>
        <p>SĐT: ${o.customerPhone}</p>
      </div>

      <div class="border-b border-dashed border-black my-2"></div>

      <table class="w-full text-[10px]">
        <thead>
          <tr class="border-b border-black">
            <th class="text-left pb-1">Tên SP</th>
            <th class="text-center pb-1">SL</th>
            <th class="text-right pb-1">T.Tiền</th>
          </tr>
        </thead>
        <tbody>
          ${(o.items || []).map(it => `
            <tr>
              <td class="py-1">${it.name}</td>
              <td class="text-center py-1 font-bold">${it.quantity}</td>
              <td class="text-right py-1">${formatVND(it.total)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="border-b border-dashed border-black my-2"></div>

      <div class="text-[11px] space-y-1">
        <div class="flex justify-between font-bold text-xs border-t border-black pt-1">
          <span>TỔNG TIỀN:</span>
          <span>${formatVND(o.totalAmount)}</span>
        </div>
      </div>

      <div class="text-center space-y-1 mt-2">
        <img src="${vietQrUrl}" alt="QR" class="w-32 h-32 mx-auto object-contain">
        <svg id="barcode-print" class="mx-auto mt-2"></svg>
      </div>
    `;
  }

  setTimeout(() => {
    if (window.JsBarcode && document.getElementById('barcode-print')) {
      JsBarcode('#barcode-print', o.trackingCode || o.code, {
        format: 'CODE128',
        width: 1.2,
        height: 35,
        displayValue: false
      });
    }
  }, 50);
}

function executePrint() {
  window.print();
}

// ==============================================
// 6. LOGISTICS & SHIPPING WEBHOOKS
// ==============================================
async function loadLogisticsData() {
  const select = document.getElementById('logistics-order-select');
  if (select) {
    select.innerHTML = state.orders.map(o => `
      <option value="${o.id}">${o.code} - ${o.customerName} (${getStatusBadgeHTML(o.orderStatus)})</option>
    `).join('');
  }
}

async function pushOrderToCarrierAction() {
  const orderId = document.getElementById('logistics-order-select')?.value;
  const carrierCode = document.getElementById('logistics-carrier-select')?.value || 'GHN';
  if (!orderId) return;

  try {
    const res = await apiFetch('/api/shipping/push-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, carrierCode })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Đã đẩy đơn sang ${data.pushResult.carrierName}! Mã vận đơn: ${data.pushResult.trackingCode}`, 'success');
      document.getElementById('sim-webhook-tracking').value = data.pushResult.trackingCode;
      await loadOrders();
    } else {
      showToast(data.message || 'Lỗi khi đẩy đơn bưu cục', 'error');
    }
  } catch (err) {
    showToast('Lỗi kết nối máy chủ', 'error');
  }
}

async function triggerSimulatedShippingWebhook() {
  const trackingCode = document.getElementById('sim-webhook-tracking')?.value.trim();
  const event = document.getElementById('sim-webhook-event')?.value;
  if (!trackingCode) {
    showToast('Vui lòng nhập mã vận đơn để giả lập Webhook bưu tá!', 'error');
    return;
  }

  try {
    const res = await apiFetch('/api/webhooks/shipping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tracking_code: trackingCode, status: event })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Webhook bưu cục kích hoạt thành công! Đã tự động cập nhật đơn hàng & gửi ZNS.`, 'success');
      await loadOrders();
      await loadDashboard();
    } else {
      showToast(data.message || 'Lỗi xử lý webhook', 'error');
    }
  } catch (err) {
    showToast('Lỗi kết nối webhook', 'error');
  }
}

// ==============================================
// 7. RECONCILIATION & BANK WEBHOOKS
// ==============================================
async function loadReconciliationData() {
  try {
    const res = await apiFetch('/api/reconciliation');
    const data = await res.json();
    if (data.success) {
      const rec = data.reconciliation;
      document.getElementById('rec-cod-delivered').innerText = formatVND(rec.codDelivered);
      document.getElementById('rec-cod-transit').innerText = formatVND(rec.codInTransit);
      document.getElementById('rec-bank-paid').innerText = formatVND(rec.bankPaid);

      // Populate sim select
      const simSelect = document.getElementById('sim-payment-order-select');
      if (simSelect) {
        simSelect.innerHTML = state.orders.map(o => `
          <option value="${o.code}" data-total="${o.totalAmount}">${o.code} - ${o.customerName} (${formatVND(o.totalAmount)})</option>
        `).join('');
        if (state.orders.length) fillPaymentSimAmount(state.orders[0].code);
      }

      // Render payment logs table
      const tbody = document.getElementById('payment-logs-table-body');
      if (tbody) {
        if (!rec.paymentLogs.length) {
          tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-slate-400">Chưa có giao dịch biến động số dư nào</td></tr>`;
        } else {
          tbody.innerHTML = rec.paymentLogs.map(l => `
            <tr class="hover:bg-slate-50 text-xs">
              <td class="px-4 py-2.5 text-slate-500">${formatDate(l.timestamp)}</td>
              <td class="px-4 py-2.5 font-mono font-bold text-blue-600">${l.detectedCode || 'N/A'}</td>
              <td class="px-4 py-2.5 font-bold text-emerald-600">${formatVND(l.amount)}</td>
              <td class="px-4 py-2.5 text-slate-700 max-w-xs truncate">${l.content}</td>
              <td class="px-4 py-2.5 text-right">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${l.matched ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}">
                  ${l.matched ? 'Đã khớp đơn' : 'Không khớp'}
                </span>
              </td>
            </tr>
          `).join('');
        }
      }
    }
  } catch (err) {
    console.error('Lỗi đối soát:', err);
  }
}

function fillPaymentSimAmount(orderCode) {
  const o = state.orders.find(item => item.code === orderCode);
  if (o) {
    document.getElementById('sim-payment-amount').value = o.totalAmount;
    document.getElementById('sim-payment-content').value = `KHACH CHUYEN KHOAN ${o.code}`;
  }
}

async function triggerSimulatedPaymentWebhook() {
  const amount = Number(document.getElementById('sim-payment-amount')?.value || 0);
  const content = document.getElementById('sim-payment-content')?.value.trim();
  if (!amount || !content) {
    showToast('Vui lòng nhập số tiền và nội dung chuyển khoản!', 'error');
    return;
  }

  try {
    const res = await apiFetch('/api/webhooks/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, description: content })
    });
    const data = await res.json();
    if (data.matched) {
      showToast(`Webhook khớp thành công đơn #${data.orderCode} trị giá ${formatVND(data.amountMatched)}! Đã chuyển sang 'Đã thanh toán'.`, 'success');
      await loadOrders();
      await loadReconciliationData();
    } else {
      showToast('Đã nhận giao dịch nhưng không khớp được đơn nào', 'info');
      await loadReconciliationData();
    }
  } catch (err) {
    showToast('Lỗi khi bắn webhook ngân hàng', 'error');
  }
}

// ==============================================
// 8. AUDIT LOGS
// ==============================================
let auditSearchTimeout = null;
function debounceAuditSearch(val) {
  clearTimeout(auditSearchTimeout);
  auditSearchTimeout = setTimeout(() => loadAuditLogs(), 250);
}

async function loadAuditLogs() {
  const search = document.getElementById('audit-search-input')?.value.trim();
  const entityType = document.getElementById('filter-audit-entity')?.value || 'all';

  try {
    const res = await apiFetch(`/api/audit-logs?search=${encodeURIComponent(search || '')}&entityType=${entityType}`);
    const data = await res.json();
    if (data.success) {
      const tbody = document.getElementById('audit-logs-table-body');
      if (!tbody) return;

      if (!data.logs.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-slate-400">Chưa có nhật ký kiểm toán phù hợp</td></tr>`;
        return;
      }

      tbody.innerHTML = data.logs.map(l => {
        const changesText = (l.changes || []).map(c => `<code>${c.field}: ${c.oldVal} &rarr; ${c.newVal}</code>`).join('<br>');
        return `
          <tr class="hover:bg-slate-50 transition text-xs">
            <td class="px-4 py-3">
              <div class="font-medium text-slate-800">${formatDate(l.timestamp)}</div>
              <div class="text-[10px] text-slate-400 font-mono">${l.ip || '127.0.0.1'}</div>
            </td>
            <td class="px-4 py-3">
              <strong class="text-slate-900">${l.user?.name || 'Hệ thống'}</strong>
              <div class="text-[10px] text-blue-600 font-semibold uppercase">${l.user?.role || 'system'}</div>
            </td>
            <td class="px-4 py-3">
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">${l.action}</span>
            </td>
            <td class="px-4 py-3 font-mono font-bold text-blue-700">${l.entityId || 'N/A'}</td>
            <td class="px-4 py-3 max-w-sm">
              <div class="text-slate-800">${l.description}</div>
              ${changesText ? `<div class="text-[10px] text-slate-500 mt-1">${changesText}</div>` : ''}
            </td>
            <td class="px-4 py-3 text-slate-500 italic">${l.reason || ''}</td>
          </tr>
        `;
      }).join('');
    }
  } catch (err) {
    console.error('Lỗi nạp audit logs:', err);
  }
}

// ==============================================
// 9. BACKUPS & RESTORE
// ==============================================
async function loadBackupsData() {
  try {
    const res = await apiFetch('/api/backups');
    const data = await res.json();
    if (data.success) {
      const tbody = document.getElementById('backups-table-body');
      if (!tbody) return;

      if (!data.backups.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-slate-400">Chưa có bản sao lưu nào</td></tr>`;
        return;
      }

      tbody.innerHTML = data.backups.map(b => `
        <tr class="hover:bg-slate-50 transition text-xs">
          <td class="px-4 py-3 text-slate-600">${formatDate(b.createdAt)}</td>
          <td class="px-4 py-3 font-mono font-bold text-slate-900">${b.fileName}</td>
          <td class="px-4 py-3 text-slate-700 font-medium">${b.label}</td>
          <td class="px-4 py-3 font-mono text-purple-700 font-semibold">${b.sizeFormatted}</td>
          <td class="px-4 py-3 text-slate-600">${b.stats?.totalOrders || 0} đơn / ${b.stats?.totalCustomers || 0} khách</td>
          <td class="px-4 py-3 text-right space-x-2">
            <button onclick="restoreBackupAction('${b.id}')" class="bg-purple-50 text-purple-700 hover:bg-purple-600 hover:text-white px-2.5 py-1.5 rounded-lg font-bold text-xs transition">
              <i class="fa-solid fa-rotate-left"></i> Khôi phục (Restore)
            </button>
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error('Lỗi nạp backups:', err);
  }
}

async function createBackupAction() {
  const label = prompt('Nhập tên nhãn cho bản sao lưu:', 'Bản sao lưu trước khi xuất hàng');
  if (label === null) return;

  try {
    const res = await apiFetch('/api/backups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Đã tạo bản sao lưu ${data.backup.fileName} (${data.backup.sizeFormatted}) thành công!`, 'success');
      await loadBackupsData();
    } else {
      showToast(data.message || 'Lỗi tạo sao lưu', 'error');
    }
  } catch (err) {
    showToast('Lỗi kết nối máy chủ', 'error');
  }
}

async function restoreBackupAction(backupId) {
  if (!confirm(`CẢNH BÁO: Bạn có chắc chắn muốn khôi phục CSDL về bản sao lưu [${backupId}]? Hệ thống sẽ tự động tạo một Safety Checkpoint trước khi khôi phục.`)) return;

  try {
    const res = await apiFetch(`/api/backups/restore/${backupId}`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast('Đã khôi phục CSDL thành công!', 'success');
      await loadOrders();
      await loadProducts();
      await loadCustomers();
      await loadDashboard();
      await loadBackupsData();
    } else {
      showToast(data.message || 'Lỗi khôi phục CSDL', 'error');
    }
  } catch (err) {
    showToast('Lỗi khi khôi phục dữ liệu', 'error');
  }
}

// ==============================================
// 10. BACKGROUND QUEUE & MONITORING
// ==============================================
async function loadMonitoringData() {
  try {
    const [monRes, jobRes] = await Promise.all([
      apiFetch('/api/monitoring'),
      apiFetch('/api/jobs')
    ]);
    const monData = await monRes.json();
    const jobData = await jobRes.json();

    if (monData.success) {
      document.getElementById('mon-status').innerText = monData.status;
      document.getElementById('mon-uptime').innerText = `${monData.uptimeSeconds}s`;
      document.getElementById('mon-ram').innerText = `${monData.memory.heapUsedMB} MB`;
      document.getElementById('mon-node').innerText = monData.nodeVersion;
      document.getElementById('mon-error-count').innerText = (monData.recentErrors || []).length;
    }

    if (jobData.success) {
      document.getElementById('mon-queue-count').innerText = `${jobData.jobs.length} Tác vụ`;
      const tbody = document.getElementById('queue-jobs-table-body');
      if (tbody) {
        if (!jobData.jobs.length) {
          tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-slate-400">Chưa có tác vụ ngầm nào</td></tr>`;
        } else {
          tbody.innerHTML = jobData.jobs.map(j => `
            <tr class="hover:bg-slate-50 text-xs">
              <td class="px-4 py-2.5 font-mono font-bold text-slate-900">${j.id}</td>
              <td class="px-4 py-2.5 font-semibold text-blue-600">${j.type}</td>
              <td class="px-4 py-2.5">
                <div class="w-32 bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div class="bg-blue-600 h-2" style="width: ${j.progress}%"></div>
                </div>
                <span class="text-[10px] text-slate-500">${j.progress}%</span>
              </td>
              <td class="px-4 py-2.5">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${j.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : j.status === 'processing' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'}">
                  ${j.status}
                </span>
              </td>
              <td class="px-4 py-2.5 text-right text-slate-400">${formatDate(j.createdAt)}</td>
            </tr>
          `).join('');
        }
      }
    }
  } catch (err) {
    console.error('Lỗi giám sát:', err);
  }
}

async function triggerExcelExportJob() {
  try {
    const res = await apiFetch('/api/jobs/export-excel', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast(`Đã đẩy tác vụ xuất Excel vào hàng đợi ngầm (Job ID: ${data.job.id})! Giao diện không bị lag.`, 'info');
      await loadMonitoringData();
    }
  } catch (err) {
    showToast('Lỗi tạo job', 'error');
  }
}

// ==============================================
// 11. IMPORT CSV SẢN PHẨM HÀNG LOẠT
// ==============================================
function openImportCsvModal() {
  const modal = document.getElementById('modal-import-csv');
  if (modal) modal.classList.remove('hidden');
}

function closeImportCsvModal() {
  const modal = document.getElementById('modal-import-csv');
  if (modal) modal.classList.add('hidden');
}

function fillSampleCsvContent() {
  document.getElementById('import-csv-content').value = `Tên sản phẩm,Mã SKU,Giá bán,Số lượng tồn kho\nBàn phím cơ Không dây RGB,SP-BAN-PHIM-CO,650000,30\nChuột gaming công thái học,SP-CHUOT-GAMING,350000,45\nĐế tản nhiệt nhôm gấp gọn,SP-DE-TAN-NHIET,180000,60`;
}

async function submitImportCsv() {
  const csvContent = document.getElementById('import-csv-content')?.value.trim();
  if (!csvContent) {
    showToast('Vui lòng nhập nội dung CSV!', 'error');
    return;
  }

  try {
    const res = await apiFetch('/api/products/import-csv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csvContent })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Đã nhập kho thành công ${data.importedCount} sản phẩm từ CSV!`, 'success');
      closeImportCsvModal();
      await loadProducts();
      await loadDashboard();
    } else {
      showToast(data.message || 'Lỗi nhập CSV', 'error');
    }
  } catch (err) {
    showToast('Lỗi mạng', 'error');
  }
}

// ==============================================
// 12. CUSTOMERS, PRODUCTS & ZNS HELPERS
// ==============================================
async function loadCustomers() {
  try {
    const res = await apiFetch('/api/customers');
    const data = await res.json();
    if (data.success) {
      state.customers = data.customers;
      renderCustomersTable();
    }
  } catch (err) {
    console.error('Lỗi nạp khách hàng:', err);
  }
}

function debounceCustomerSearch(val) {
  renderCustomersTable(val);
}

function renderCustomersTable(searchQuery = '') {
  const tbody = document.getElementById('customers-table-body');
  if (!tbody) return;

  let list = [...state.customers];
  if (searchQuery) {
    const q = searchQuery.toLowerCase().trim();
    list = list.filter(c =>
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  }

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-slate-400">Không tìm thấy khách hàng nào</td></tr>`;
    return;
  }

  const isWarehouse = state.currentUser.role === 'warehouse';

  tbody.innerHTML = list.map(c => `
    <tr class="hover:bg-slate-50/80 transition">
      <td class="px-4 py-3.5">
        <div class="font-bold text-slate-900">${c.name}</div>
        <div class="text-[10px] text-slate-400">${c.email || 'Chưa có email'}</div>
      </td>
      <td class="px-4 py-3.5">
        <div class="font-mono font-semibold text-slate-800">${c.phone}</div>
        ${!isWarehouse ? `<a href="https://zalo.me/${c.phone}" target="_blank" class="text-[11px] text-blue-600 hover:underline flex items-center gap-1 mt-0.5"><i class="fa-solid fa-comment"></i> Nhắn tin Zalo</a>` : ''}
      </td>
      <td class="px-4 py-3.5 max-w-xs text-slate-600 text-xs truncate" title="${c.address}">${c.address || 'Chưa cập nhật'}</td>
      <td class="px-4 py-3.5"><span class="tier-${(c.tier || 'standard').toLowerCase()} px-2 py-0.5 rounded text-[10px] font-bold uppercase">${c.tier || 'Standard'}</span></td>
      <td class="px-4 py-3.5 font-bold text-slate-900">${isWarehouse ? '***' : formatVND(c.totalSpent || 0)}</td>
      <td class="px-4 py-3.5 font-semibold text-slate-700">${c.orderCount || 0} đơn</td>
      <td class="px-4 py-3.5 text-right">
        ${state.permissions.createOrder ? `<button onclick="quickCreateOrderForCustomer('${c.id}')" class="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold"><i class="fa-solid fa-cart-plus"></i> Lên đơn</button>` : ''}
      </td>
    </tr>
  `).join('');
}

function openCustomerModal() {
  document.getElementById('cust-form-name').value = '';
  document.getElementById('cust-form-phone').value = '';
  document.getElementById('cust-form-email').value = '';
  document.getElementById('cust-form-address').value = '';
  document.getElementById('modal-customer')?.classList.remove('hidden');
}

function closeCustomerModal() {
  document.getElementById('modal-customer')?.classList.add('hidden');
}

async function saveNewCustomer() {
  const name = document.getElementById('cust-form-name')?.value.trim();
  const phone = document.getElementById('cust-form-phone')?.value.trim();
  const email = document.getElementById('cust-form-email')?.value.trim();
  const address = document.getElementById('cust-form-address')?.value.trim();
  if (!name || !phone) return showToast('Tên và số điện thoại là bắt buộc!', 'error');

  try {
    const res = await apiFetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, email, address })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Thêm khách hàng thành công!', 'success');
      closeCustomerModal();
      await loadCustomers();
    } else showToast(data.message || 'Lỗi thêm khách', 'error');
  } catch (err) { showToast('Lỗi mạng', 'error'); }
}

function quickCreateOrderForCustomer(custId) {
  const c = state.customers.find(item => item.id === custId);
  if (!c) return;
  openCreateOrderModal();
  document.getElementById('new-order-phone').value = c.phone;
  document.getElementById('new-order-name').value = c.name;
  document.getElementById('new-order-address').value = c.address || '';
}

async function loadCategories() {
  try {
    const res = await apiFetch('/api/categories');
    const data = await res.json();
    if (data.success) {
      state.categories = data.categories;
      const catSelect = document.getElementById('filter-product-category');
      if (catSelect) {
        catSelect.innerHTML = '<option value="all">Tất cả danh mục</option>' + data.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
      }
    }
  } catch (err) {}
}

async function loadProducts() {
  try {
    const res = await apiFetch('/api/products');
    const data = await res.json();
    if (data.success) {
      state.products = data.products;
      renderProductsTable();
    }
  } catch (err) {}
}

function debounceProductSearch(val) {
  renderProductsTable();
}

function renderProductsTable() {
  const tbody = document.getElementById('products-table-body');
  if (!tbody) return;

  const searchQuery = (document.getElementById('product-search-input')?.value || '').toLowerCase().trim();
  const catFilter = document.getElementById('filter-product-category')?.value || 'all';
  const lowStockOnly = document.getElementById('filter-low-stock')?.checked;

  let list = [...state.products];
  if (catFilter !== 'all') list = list.filter(p => p.categoryId === catFilter);
  if (lowStockOnly) list = list.filter(p => p.stock <= p.minStock);
  if (searchQuery) {
    list = list.filter(p =>
      (p.name && p.name.toLowerCase().includes(searchQuery)) ||
      (p.sku && p.sku.toLowerCase().includes(searchQuery)) ||
      (p.barcode && p.barcode.includes(searchQuery))
    );
  }

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="p-8 text-center text-slate-400">Không tìm thấy sản phẩm nào</td></tr>`;
    return;
  }

  const isWarehouse = state.currentUser.role === 'warehouse';

  tbody.innerHTML = list.map(p => {
    const isLow = p.stock <= p.minStock;
    return `
      <tr class="hover:bg-slate-50/80 transition">
        <td class="px-4 py-3.5">
          <div class="flex items-center gap-3">
            <img src="${p.image}" class="w-10 h-10 rounded-lg object-cover border border-slate-200">
            <div>
              <div class="font-bold text-slate-900">${p.name}</div>
              <div class="text-[10px] text-slate-400">${p.unit || 'Chiếc'}</div>
            </div>
          </div>
        </td>
        <td class="px-4 py-3.5 font-mono text-xs">${p.sku}</td>
        <td class="px-4 py-3.5 text-xs text-slate-600">${p.categoryName || 'Chung'}</td>
        <td class="px-4 py-3.5 col-cost-price">${isWarehouse ? '***' : formatVND(p.costPrice)}</td>
        <td class="px-4 py-3.5 font-bold text-slate-900">${formatVND(p.salePrice)}</td>
        <td class="px-4 py-3.5">
          <div class="flex items-center gap-2">
            <span class="font-black text-sm ${isLow ? 'text-rose-600' : 'text-slate-900'}">${p.stock}</span>
            <span class="text-[9px] bg-slate-100 text-slate-500 font-mono px-1 py-0.5 rounded" title="Optimistic Version Tag">v${p.version || 1}</span>
            ${isLow ? '<span class="text-[9px] bg-rose-100 text-rose-700 font-bold px-1.5 py-0.5 rounded">Cảnh báo</span>' : ''}
          </div>
        </td>
        <td class="px-4 py-3.5">
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${p.stock > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}">
            ${p.stock > 0 ? 'Còn hàng' : 'Hết hàng'}
          </span>
        </td>
        <td class="px-4 py-3.5 text-right space-x-1">
          ${state.permissions.manageInventory ? `
            <button onclick="editProductModal('${p.id}')" class="p-1.5 text-slate-600 hover:text-blue-600"><i class="fa-solid fa-pen-to-square"></i></button>
            <button onclick="deleteProduct('${p.id}')" class="p-1.5 text-slate-600 hover:text-rose-600"><i class="fa-solid fa-trash-can"></i></button>
          ` : '<span class="text-[10px] text-slate-400">Chỉ xem</span>'}
        </td>
      </tr>
    `;
  }).join('');
}

function openProductModal() {
  document.getElementById('product-modal-title').innerText = 'Thêm Sản Phẩm Mới';
  document.getElementById('prod-form-id').value = '';
  document.getElementById('prod-form-name').value = '';
  document.getElementById('prod-form-sku').value = '';
  document.getElementById('prod-form-cost').value = '0';
  document.getElementById('prod-form-price').value = '0';
  document.getElementById('prod-form-stock').value = '10';
  document.getElementById('prod-form-min-stock').value = '5';
  document.getElementById('prod-form-image').value = '';

  const catSelect = document.getElementById('prod-form-category');
  if (catSelect) catSelect.innerHTML = state.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  document.getElementById('modal-product')?.classList.remove('hidden');
}

function editProductModal(prodId) {
  const prod = state.products.find(p => p.id === prodId);
  if (!prod) return;

  document.getElementById('product-modal-title').innerText = 'Chỉnh Sửa Sản Phẩm';
  document.getElementById('prod-form-id').value = prod.id;
  document.getElementById('prod-form-name').value = prod.name;
  document.getElementById('prod-form-sku').value = prod.sku;
  document.getElementById('prod-form-cost').value = prod.costPrice || 0;
  document.getElementById('prod-form-price').value = prod.salePrice;
  document.getElementById('prod-form-stock').value = prod.stock;
  document.getElementById('prod-form-min-stock').value = prod.minStock;
  document.getElementById('prod-form-image').value = prod.image || '';

  const catSelect = document.getElementById('prod-form-category');
  if (catSelect) catSelect.innerHTML = state.categories.map(c => `<option value="${c.id}" ${c.id === prod.categoryId ? 'selected' : ''}>${c.name}</option>`).join('');
  document.getElementById('modal-product')?.classList.remove('hidden');
}

function closeProductModal() {
  document.getElementById('modal-product')?.classList.add('hidden');
}

async function saveProductForm() {
  const id = document.getElementById('prod-form-id')?.value;
  const name = document.getElementById('prod-form-name')?.value.trim();
  const sku = document.getElementById('prod-form-sku')?.value.trim();
  const categoryId = document.getElementById('prod-form-category')?.value;
  const costPrice = Number(document.getElementById('prod-form-cost')?.value || 0);
  const salePrice = Number(document.getElementById('prod-form-price')?.value || 0);
  const stock = Number(document.getElementById('prod-form-stock')?.value || 0);
  const minStock = Number(document.getElementById('prod-form-min-stock')?.value || 5);
  const image = document.getElementById('prod-form-image')?.value.trim();

  if (!name || salePrice <= 0) return showToast('Tên và giá bán là bắt buộc!', 'error');

  const payload = { name, sku, categoryId, costPrice, salePrice, stock, minStock, image };
  const method = id ? 'PUT' : 'POST';
  const url = id ? `/api/products/${id}` : '/api/products';

  try {
    const res = await apiFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      showToast('Lưu sản phẩm thành công', 'success');
      closeProductModal();
      await loadProducts();
      await loadDashboard();
    } else showToast(data.message || 'Lỗi', 'error');
  } catch (err) { showToast('Lỗi mạng', 'error'); }
}

async function deleteProduct(prodId) {
  if (!confirm('Bạn có chắc muốn xóa sản phẩm này khỏi kho?')) return;
  try {
    const res = await apiFetch(`/api/products/${prodId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast('Đã xóa sản phẩm', 'success');
      await loadProducts();
    }
  } catch (err) {}
}

// Render Banner cảnh báo chế độ Sandbox vs Live
function renderZnsModeBanner() {
  const zs = state.settings?.znsSettings || {};
  const isLive = zs.mode === 'live';
  const banner = document.getElementById('zns-mode-alert-banner');
  const badge = document.getElementById('zns-active-mode-badge');
  const sidebarBadge = document.getElementById('sidebar-zns-mode');

  if (sidebarBadge) {
    sidebarBadge.innerText = isLive ? 'Live Zalo' : 'Sandbox';
    sidebarBadge.className = isLive ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold';
  }

  if (badge) {
    badge.innerText = isLive ? '🟢 Đang ở Chế độ: LIVE OPENAPI' : '🟠 Đang ở Chế độ: SANDBOX MÔ PHỎNG';
    badge.className = isLive
      ? 'px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300'
      : 'px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300';
  }

  if (banner) {
    if (isLive) {
      banner.className = 'p-3.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-950 text-xs flex items-start gap-3 shadow-sm';
      banner.innerHTML = `
        <i class="fa-solid fa-circle-check text-emerald-600 text-lg mt-0.5"></i>
        <div class="space-y-1">
          <div class="font-bold text-emerald-900 flex items-center gap-2">
            <span>CHẾ ĐỘ GỬI THẬT (LIVE OPENAPI ĐANG BẬT)</span>
            <span class="bg-emerald-200 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold">GỬI THẬT ĐẾN ZALO KHÁCH</span>
          </div>
          <p class="text-slate-700 leading-relaxed text-[11px]">
            Mọi tin nhắn gửi đi sẽ được chuyển <strong>trực tiếp tới ứng dụng Zalo trên điện thoại khách hàng</strong> qua Zalo Cloud OpenAPI (Phí ~180đ/tin). Vui lòng đảm bảo tài khoản ZCA có số dư và Mẫu tin đã được Zalo duyệt.
          </p>
        </div>
      `;
    } else {
      banner.className = 'p-3.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-950 text-xs flex items-start gap-3 shadow-sm';
      banner.innerHTML = `
        <i class="fa-solid fa-triangle-exclamation text-amber-600 text-lg mt-0.5"></i>
        <div class="space-y-1.5">
          <div class="font-bold text-amber-900 flex items-center gap-2">
            <span>CHẾ ĐỘ MÔ PHỎNG (SANDBOX ĐANG BẬT)</span>
            <span class="bg-amber-200 text-amber-900 text-[10px] px-2 py-0.5 rounded-full font-bold">KHÔNG GỬI MÁY THẬT</span>
          </div>
          <p class="text-slate-700 leading-relaxed text-[11px]">
            Khi bấm gửi, hệ thống chỉ lưu nhật ký mô phỏng nội bộ để kiểm tra giao diện, <strong>tin nhắn KHÔNG gửi tới điện thoại thật (Điện thoại sẽ không nhận được thông báo Zalo)</strong>.
          </p>
          <div class="pt-1 flex flex-wrap items-center gap-2">
            <button onclick="updateZnsMode('live')" class="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition">
              <i class="fa-solid fa-bolt"></i> Bật Chế độ Gửi Thật (Live OpenAPI)
            </button>
            <span class="text-[11px] text-amber-800 italic">(Để khách nhận được tin thật, cần có Access Token của Zalo OA)</span>
          </div>
        </div>
      `;
    }
  }
}

async function loadZnsLogs() {
  try {
    const res = await apiFetch('/api/zns/logs');
    const data = await res.json();
    if (data.success) {
      state.znsLogs = data.logs;
      const tbody = document.getElementById('zns-logs-table-body');
      if (tbody) {
        if (!data.logs.length) {
          tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-slate-400">Chưa có nhật ký ZNS</td></tr>`;
        } else {
          tbody.innerHTML = data.logs.map(l => {
            const isLive = l.mode === 'live';
            const isSent = l.status === 'sent';
            return `
              <tr class="hover:bg-slate-50 text-xs border-b border-slate-100">
                <td class="px-4 py-2.5 text-slate-500 whitespace-nowrap">${formatDate(l.sentAt)}</td>
                <td class="px-4 py-2.5">
                  <strong>${l.customerName || 'Khách hàng'}</strong>
                  <div class="font-mono text-slate-500">${l.phone || ''}</div>
                </td>
                <td class="px-4 py-2.5 whitespace-nowrap">
                  ${isLive 
                    ? '<span class="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-bold"><i class="fa-solid fa-bolt text-emerald-600 mr-1"></i>Live Thật</span>'
                    : '<span class="bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full text-[10px] font-bold"><i class="fa-solid fa-flask text-amber-600 mr-1"></i>Mô phỏng</span>'}
                </td>
                <td class="px-4 py-2.5 font-medium">${l.templateTitle || l.templateId}</td>
                <td class="px-4 py-2.5 font-mono text-blue-600 font-semibold">${l.orderCode || 'N/A'}</td>
                <td class="px-4 py-2.5">
                  <div>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${isSent ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}">
                      ${isSent ? (isLive ? 'Đã gửi máy thật' : 'Thành công (Mô phỏng)') : 'Thất bại'}
                    </span>
                    ${l.errorMessage ? `<div class="text-[10px] text-rose-600 mt-1 max-w-xs leading-tight">${l.errorMessage}</div>` : ''}
                  </div>
                </td>
                <td class="px-4 py-2.5 text-right font-mono font-semibold">${formatVND(l.cost || 180)}</td>
              </tr>
            `;
          }).join('');
        }
      }
    }
  } catch (err) {}
}

async function previewZnsSmartphone(eventType) {
  const evt = eventType || document.getElementById('test-zns-event')?.value || 'orderCompleted';
  try {
    const res = await apiFetch(`/api/zns/preview?eventType=${evt}`);
    const data = await res.json();
    if (data.success && data.preview) {
      if (document.getElementById('mockup-zns-title')) document.getElementById('mockup-zns-title').innerText = data.preview.title;
      if (document.getElementById('mockup-zns-id')) document.getElementById('mockup-zns-id').innerText = `#${data.preview.templateId}`;
      if (document.getElementById('mockup-zns-body')) document.getElementById('mockup-zns-body').innerText = data.preview.body;
      if (document.getElementById('mockup-header-store')) document.getElementById('mockup-header-store').innerText = state.settings.storeName || 'ZNS Store OA';
    }
  } catch (err) {}
}

async function triggerTestZnsSend() {
  const phone = document.getElementById('test-zns-phone')?.value.trim();
  const customerName = document.getElementById('test-zns-name')?.value.trim();
  const eventType = document.getElementById('test-zns-event')?.value;
  const totalAmount = document.getElementById('test-zns-amount')?.value;

  // Xác thực và chuẩn hóa số điện thoại di động Việt Nam (phoneValidator)
  const phoneCheck = validateAndFormatVNPhone(phone);
  if (!phoneCheck.isValid) {
    return showToast(phoneCheck.message, 'error');
  }

  const cleanPhone = phoneCheck.displayPhone;
  const znsFormattedPhone = phoneCheck.formattedPhone;

  const zs = state.settings?.znsSettings || {};
  const isLive = zs.mode === 'live';

  try {
    const res = await apiFetch('/api/zns/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: znsFormattedPhone, customerName, eventType, totalAmount: Number(totalAmount) || 0 })
    });
    const data = await res.json();

    if (data.success) {
      if (data.mode === 'live') {
        showToast(`Đã gửi tin nhắn thật thành công tới Zalo của ${cleanPhone} (Chuẩn ZNS: ${znsFormattedPhone})!`, 'success');
      } else {
        showToast(`[Mô phỏng Sandbox] Gửi thử thành công tới ${cleanPhone} (Chuẩn ZNS: ${znsFormattedPhone}).`, 'info');
      }
    } else {
      showToast(`Gửi tin Zalo thất bại: ${data.errorMessage || data.message || 'Lỗi không xác định'}`, 'error');
    }
    await loadZnsLogs();
  } catch (err) {
    showToast('Lỗi gửi tin ZNS: ' + err.message, 'error');
  }
}

async function updateZnsMode(newMode) {
  try {
    const res = await apiFetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ znsSettings: { ...state.settings.znsSettings, mode: newMode } })
    });
    const data = await res.json();
    if (data.success) {
      state.settings = data.settings;
      applySettingsToUI();
      renderZnsModeBanner();
      if (newMode === 'live') {
        showToast('Đã chuyển sang chế độ GỬI THẬT (Live OpenAPI)! Tin nhắn sẽ gửi tới máy khách.', 'success');
      } else {
        showToast('Đã chuyển sang chế độ MÔ PHỎNG (Sandbox)!', 'info');
      }
    }
  } catch (err) {}
}

async function checkZaloOaConnection() {
  const box = document.getElementById('zalo-connection-status-box');
  if (!box) return;
  box.classList.remove('hidden');
  box.className = 'p-3 rounded-lg text-xs bg-slate-100 text-slate-700 flex items-center gap-2 border border-slate-200';
  box.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-blue-600"></i> Đang kết nối kiểm tra Zalo OpenAPI...';

  try {
    const res = await apiFetch('/api/zns/check-connection');
    const data = await res.json();

    if (data.success) {
      if (data.mode === 'simulation') {
        box.className = 'p-3 rounded-lg text-xs bg-amber-50 text-amber-900 border border-amber-300';
        box.innerHTML = `
          <div class="font-bold flex items-center gap-1.5 text-amber-800">
            <i class="fa-solid fa-flask"></i> Đang ở chế độ Mô Phỏng (Sandbox)
          </div>
          <p class="mt-1 text-slate-600">Để kiểm tra kết nối với Zalo OA thật, hãy chuyển sang chế độ <strong>Live OpenAPI</strong> và nhập Access Token.</p>
        `;
      } else {
        const oa = data.oaInfo || {};
        box.className = 'p-3 rounded-lg text-xs bg-emerald-50 text-emerald-900 border border-emerald-300 flex items-start gap-3';
        box.innerHTML = `
          <img src="${oa.avatar || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100'}" class="w-10 h-10 rounded-full border border-emerald-300 object-cover mt-0.5">
          <div>
            <div class="font-bold text-sm text-emerald-900 flex items-center gap-1.5">
              <span>${oa.name || 'Zalo Official Account'}</span>
              ${oa.is_verified ? '<span class="bg-amber-400 text-slate-900 text-[10px] px-1.5 py-0.2 rounded font-bold"><i class="fa-solid fa-certificate"></i> Tích vàng</span>' : '<span class="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.2 rounded">Chưa xác thực</span>'}
            </div>
            <div class="text-[11px] text-slate-600 mt-0.5">OA ID: <span class="font-mono font-semibold">${oa.oa_id || state.settings?.znsSettings?.oaId || 'N/A'}</span></div>
            <div class="text-[11px] text-emerald-700 font-semibold mt-1"><i class="fa-solid fa-check"></i> Kết nối Zalo OA thật hoạt động hoàn hảo! Đã sẵn sàng gửi tin nhắn thật tới khách.</div>
          </div>
        `;
      }
    } else {
      box.className = 'p-3 rounded-lg text-xs bg-rose-50 text-rose-900 border border-rose-300';
      box.innerHTML = `
        <div class="font-bold text-rose-800 flex items-center gap-1.5">
          <i class="fa-solid fa-circle-exclamation"></i> Kiểm tra kết nối Zalo OA thất bại
        </div>
        <p class="mt-1 text-slate-700 leading-relaxed font-medium">${data.message || 'Access token không hợp lệ hoặc đã hết hạn.'}</p>
        <p class="mt-1 text-[11px] text-slate-500">Mẹo: Nhập Secret Key và Refresh Token của App Zalo Developers để hệ thống tự động làm mới token.</p>
      `;
    }
  } catch (err) {
    box.className = 'p-3 rounded-lg text-xs bg-rose-50 text-rose-900 border border-rose-300';
    box.innerHTML = `<div class="font-bold text-rose-800"><i class="fa-solid fa-circle-exclamation"></i> Lỗi kết nối mạng: ${err.message}</div>`;
  }
}

async function refreshZaloTokenNow() {
  showToast('Đang làm mới Access Token từ Zalo...', 'info');
  try {
    const res = await apiFetch('/api/zns/refresh-token', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      if (document.getElementById('zns-access-token')) {
        document.getElementById('zns-access-token').value = data.accessToken;
      }
      showToast('Đã làm mới Access Token thành công!', 'success');
      await checkZaloOaConnection();
    } else {
      showToast(`Làm mới token thất bại: ${data.message || 'Kiểm tra lại App ID, Secret Key và Refresh Token'}`, 'error');
    }
  } catch (err) {
    showToast('Lỗi khi làm mới token', 'error');
  }
}

async function saveZnsCredentials() {
  const oaId = document.getElementById('zns-oa-id')?.value.trim();
  const appId = document.getElementById('zns-app-id')?.value.trim();
  const secretKey = document.getElementById('zns-secret-key')?.value.trim();
  const refreshToken = document.getElementById('zns-refresh-token')?.value.trim();
  const accessToken = document.getElementById('zns-access-token')?.value.trim();
  const mode = document.getElementById('zns-mode-select')?.value || 'simulation';

  const tplCreated = document.getElementById('zns-tpl-order-created')?.value.trim();
  const tplShipping = document.getElementById('zns-tpl-order-shipping')?.value.trim();
  const tplCompleted = document.getElementById('zns-tpl-order-completed')?.value.trim();
  const tplCancelled = document.getElementById('zns-tpl-order-cancelled')?.value.trim();

  const prevSettings = state.settings?.znsSettings || {};

  const znsSettings = {
    ...prevSettings,
    mode,
    oaId: oaId || prevSettings.oaId,
    appId: appId || prevSettings.appId,
    secretKey: secretKey || prevSettings.secretKey,
    refreshToken: refreshToken || prevSettings.refreshToken,
    accessToken: accessToken || prevSettings.accessToken,
    templates: {
      orderCreated: { id: tplCreated || '298370', name: 'Xác nhận tạo đơn hàng mới', enabled: true },
      orderShipping: { id: tplShipping || '298371', name: 'Thông báo xuất kho & Giao hàng', enabled: true },
      orderCompleted: { id: tplCompleted || '298372', name: 'Giao hàng thành công & Cảm ơn', enabled: true },
      orderCancelled: { id: tplCancelled || '298373', name: 'Thông báo hủy đơn hàng', enabled: true }
    }
  };

  try {
    const res = await apiFetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ znsSettings })
    });
    const data = await res.json();
    if (data.success) {
      state.settings = data.settings;
      applySettingsToUI();
      renderZnsModeBanner();
      showToast('Đã lưu cấu hình kết nối Zalo OA thành công!', 'success');
      await checkZaloOaConnection();
    }
  } catch (err) {
    showToast('Lỗi lưu cấu hình Zalo OA', 'error');
  }
}

async function loadReportsData() {
  try {
    const res = await apiFetch('/api/reports/dashboard');
    const data = await res.json();
    if (!data.success) return;
    const { kpis, revenueTimeline } = data;
    document.getElementById('report-net-revenue').innerText = formatVND(kpis.totalRevenue);
    document.getElementById('report-cancel-rate').innerText = `${kpis.cancelRate}%`;
    document.getElementById('report-zns-cost').innerText = formatVND(kpis.znsMessagesSent * 180);

    const ctx = document.getElementById('chartReportDetailed');
    if (!ctx) return;
    if (state.charts.reports) state.charts.reports.destroy();
    state.charts.reports = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: revenueTimeline.map(t => t.date),
        datasets: [{ label: 'Doanh số ngày (VND)', data: revenueTimeline.map(t => t.revenue), backgroundColor: '#3b82f6', borderRadius: 6 }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  } catch (err) {}
}

function exportReportsToCSV() {
  if (!state.orders.length) return showToast('Không có dữ liệu', 'error');
  const headers = ['Mã Đơn', 'Ngày Tạo', 'Khách Hàng', 'SĐT', 'Tổng Tiền', 'Trạng Thái', 'Vận Chuyển', 'Thanh Toán'];
  const rows = state.orders.map(o => [o.code, formatDate(o.createdAt), `"${o.customerName}"`, o.customerPhone, o.totalAmount, o.orderStatus, o.carrier, o.paymentMethod]);
  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const link = document.createElement('a');
  link.setAttribute('href', encodeURI(csvContent));
  link.setAttribute('download', `Bao_Cao_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  showToast('Đã xuất file CSV!', 'success');
}

async function loadSettings() {
  try {
    const res = await apiFetch('/api/settings');
    const data = await res.json();
    if (data.success) {
      state.settings = data.settings;
      applySettingsToUI();
    }
  } catch (err) {}
  loadWebhookAndDbStatus();
}

function applySettingsToUI() {
  const s = state.settings;
  const zs = s.znsSettings || {};
  renderZnsModeBanner();

  if (document.getElementById('setting-store-name')) document.getElementById('setting-store-name').value = s.storeName || '';
  if (document.getElementById('setting-store-phone')) document.getElementById('setting-store-phone').value = s.storePhone || '';
  if (document.getElementById('setting-store-address')) document.getElementById('setting-store-address').value = s.storeAddress || '';
  if (document.getElementById('setting-store-email')) document.getElementById('setting-store-email').value = s.storeEmail || '';
  if (document.getElementById('setting-bank-name')) document.getElementById('setting-bank-name').value = s.bankName || '';
  if (document.getElementById('setting-bank-bin')) document.getElementById('setting-bank-bin').value = s.bankBin || '';
  if (document.getElementById('setting-bank-account')) document.getElementById('setting-bank-account').value = s.bankAccount || '';
  if (document.getElementById('setting-bank-owner')) document.getElementById('setting-bank-owner').value = s.bankOwner || '';
  if (document.getElementById('setting-invoice-footer')) document.getElementById('setting-invoice-footer').value = s.invoiceFooterNote || '';

  if (document.getElementById('zns-mode-select')) document.getElementById('zns-mode-select').value = zs.mode || 'simulation';
  if (document.getElementById('zns-oa-id')) document.getElementById('zns-oa-id').value = zs.oaId || '';
  if (document.getElementById('zns-app-id')) document.getElementById('zns-app-id').value = zs.appId || '';
  if (document.getElementById('zns-secret-key')) document.getElementById('zns-secret-key').value = zs.secretKey || '';
  if (document.getElementById('zns-refresh-token')) document.getElementById('zns-refresh-token').value = zs.refreshToken || '';
  if (document.getElementById('zns-access-token')) document.getElementById('zns-access-token').value = zs.accessToken || '';

  const templates = zs.templates || {};
  if (document.getElementById('zns-tpl-order-created')) document.getElementById('zns-tpl-order-created').value = templates.orderCreated?.id || '298370';
  if (document.getElementById('zns-tpl-order-shipping')) document.getElementById('zns-tpl-order-shipping').value = templates.orderShipping?.id || '298371';
  if (document.getElementById('zns-tpl-order-completed')) document.getElementById('zns-tpl-order-completed').value = templates.orderCompleted?.id || '298372';
  if (document.getElementById('zns-tpl-order-cancelled')) document.getElementById('zns-tpl-order-cancelled').value = templates.orderCancelled?.id || '298373';
  if (document.getElementById('config-backend-api-url')) document.getElementById('config-backend-api-url').value = localStorage.getItem('ZNS_API_BASE_URL') || '';
}

async function saveStoreSettings() {
  const updated = {
    storeName: document.getElementById('setting-store-name')?.value.trim(),
    storePhone: document.getElementById('setting-store-phone')?.value.trim(),
    storeAddress: document.getElementById('setting-store-address')?.value.trim(),
    storeEmail: document.getElementById('setting-store-email')?.value.trim(),
    bankName: document.getElementById('setting-bank-name')?.value.trim(),
    bankBin: document.getElementById('setting-bank-bin')?.value.trim(),
    bankAccount: document.getElementById('setting-bank-account')?.value.trim(),
    bankOwner: document.getElementById('setting-bank-owner')?.value.trim(),
    invoiceFooterNote: document.getElementById('setting-invoice-footer')?.value.trim()
  };
  try {
    const res = await apiFetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });
    const data = await res.json();
    if (data.success) {
      state.settings = data.settings;
      showToast('Đã lưu cài đặt cửa hàng!', 'success');
    }
  } catch (err) {}
}

function saveAndTestBackendUrl() {
  const input = document.getElementById('config-backend-api-url');
  const badge = document.getElementById('badge-backend-status');
  if (!input) return;

  const rawUrl = input.value.trim().replace(/\/+$/, '');
  if (rawUrl) {
    localStorage.setItem('ZNS_API_BASE_URL', rawUrl);
    showToast(`Đã lưu Backend API URL: ${rawUrl}`, 'info');
  } else {
    localStorage.removeItem('ZNS_API_BASE_URL');
    showToast('Đã chuyển về kết nối Backend cùng Host (Mặc định)', 'info');
  }

  if (badge) {
    badge.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800';
    badge.innerText = 'Đang kiểm tra...';
  }

  const checkUrl = (rawUrl ? rawUrl : '') + '/api/settings';
  fetch(checkUrl)
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        if (badge) {
          badge.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800';
          badge.innerText = 'Kết nối thành công (200 OK)';
        }
        showToast('Kết nối Backend API Server thành công!', 'success');
      } else {
        throw new Error('Dữ liệu không khớp');
      }
    })
    .catch(err => {
      if (badge) {
        badge.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800';
        badge.innerText = 'Không thể kết nối';
      }
      showToast(`Không thể kết nối tới Backend URL: ${err.message}`, 'error');
    });
}

async function resetDemoData() {
  if (!confirm('Khôi phục toàn bộ CSDL về dữ liệu mẫu ban đầu?')) return;
  try {
    const res = await apiFetch('/api/settings/reset', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast('Đã khôi phục dữ liệu ban đầu', 'success');
      location.reload();
    }
  } catch (err) {}
}

async function loadWebhookAndDbStatus() {
  try {
    // 1. Tải Webhook URLs động
    const resHook = await apiFetch('/api/system/webhook-urls');
    const dataHook = await resHook.json();
    if (dataHook.success && dataHook.webhooks) {
      if (document.getElementById('webhook-url-shipping')) {
        document.getElementById('webhook-url-shipping').value = dataHook.webhooks.shipping.url;
      }
      if (document.getElementById('webhook-url-payment')) {
        document.getElementById('webhook-url-payment').value = dataHook.webhooks.payment.url;
      }
      if (document.getElementById('webhook-url-zns')) {
        document.getElementById('webhook-url-zns').value = dataHook.webhooks.zns.url;
      }
    }

    // 2. Tải trạng thái Cloud Database
    const resDb = await apiFetch('/api/system/db-status');
    const dataDb = await resDb.json();
    const badge = document.getElementById('badge-db-status');
    if (badge && dataDb.success && dataDb.storage) {
      const st = dataDb.storage;
      if (st.isCloudConnected) {
        badge.className = 'px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1.5';
        badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> ${st.engine}`;
      } else {
        badge.className = 'px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 flex items-center gap-1.5';
        badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span> ${st.engine}`;
      }
    }
  } catch (err) {
    console.warn('Lỗi tải thông tin webhook & CSDL:', err);
  }
}

function copyWebhookUrl(elementId) {
  const input = document.getElementById(elementId);
  if (!input || !input.value) return;
  navigator.clipboard.writeText(input.value).then(() => {
    showToast('Đã sao chép Webhook URL vào bộ nhớ đệm!', 'success');
  }).catch(() => {
    input.select();
    document.execCommand('copy');
    showToast('Đã sao chép Webhook URL!', 'success');
  });
}

// ==============================================
// 15. ZALO CHATBOT & CUSTOMER LEAD ENGINE
// ==============================================
let zaloLeadsData = [];

function switchZaloSubTab(subTab) {
  const tabs = ['leads', 'simulator', 'config'];
  tabs.forEach(t => {
    const btn = document.getElementById(`subtab-btn-${t}`);
    const content = document.getElementById(`subtab-content-${t}`);
    if (btn) {
      if (t === subTab) {
        btn.className = 'px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 text-white shadow-sm flex items-center gap-2 transition';
      } else {
        btn.className = 'px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-2 transition';
      }
    }
    if (content) {
      if (t === subTab) content.classList.remove('hidden');
      else content.classList.add('hidden');
    }
  });
}

async function loadZaloLeads() {
  try {
    const res = await apiFetch('/api/zalo-bot/leads');
    const data = await res.json();
    if (data.success) {
      zaloLeadsData = data.leads || [];
      renderZaloLeadsTable(zaloLeadsData);
      updateZaloLeadsStats(zaloLeadsData);
    }
  } catch (err) {
    console.error('Lỗi tải Zalo Leads:', err);
  }
}

function updateZaloLeadsStats(leads) {
  const total = leads.length;
  const newLeads = leads.filter(l => l.status === 'new').length;
  const converted = leads.filter(l => l.status === 'converted').length;

  if (document.getElementById('stat-total-leads')) document.getElementById('stat-total-leads').innerText = total;
  if (document.getElementById('stat-new-leads')) document.getElementById('stat-new-leads').innerText = newLeads;
  if (document.getElementById('stat-converted-leads')) document.getElementById('stat-converted-leads').innerText = converted;
  if (document.getElementById('subtab-lead-count')) document.getElementById('subtab-lead-count').innerText = total;

  const badgeNav = document.getElementById('badge-nav-leads');
  if (badgeNav) {
    if (newLeads > 0) {
      badgeNav.innerText = `${newLeads} Mới`;
      badgeNav.className = 'px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse';
    } else {
      badgeNav.innerText = 'AI Lead';
      badgeNav.className = 'px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30';
    }
  }
}

function filterZaloLeads() {
  const q = (document.getElementById('zalo-leads-search')?.value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('zalo-leads-filter-status')?.value || 'all';

  let filtered = zaloLeadsData.filter(l => {
    const matchStatus = statusFilter === 'all' || l.status === statusFilter;
    const matchQuery = !q ||
      (l.customerName && l.customerName.toLowerCase().includes(q)) ||
      (l.customerPhone && l.customerPhone.includes(q)) ||
      (l.interestedProduct && l.interestedProduct.toLowerCase().includes(q)) ||
      (l.customerAddress && l.customerAddress.toLowerCase().includes(q));
    return matchStatus && matchQuery;
  });

  renderZaloLeadsTable(filtered);
}

function renderZaloLeadsTable(leads) {
  const tbody = document.getElementById('zalo-leads-table-body');
  if (!tbody) return;

  if (!leads || leads.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-8 text-slate-400">
          <i class="fa-solid fa-address-book text-3xl mb-2 block opacity-40"></i>
          Không tìm thấy khách hàng tiềm năng nào từ Zalo
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = leads.map(l => {
    const lastMsg = l.messageHistory && l.messageHistory.length ? l.messageHistory[l.messageHistory.length - 1].text : (l.notes || '');
    const isConverted = l.status === 'converted';

    return `
      <tr class="hover:bg-slate-50/80 transition">
        <td class="px-4 py-3">
          <div class="font-bold text-slate-900">${escapeHtml(l.customerName || 'Khách Zalo')}</div>
          <div class="flex items-center gap-2 mt-0.5">
            <span class="font-mono text-blue-600 font-semibold">${l.customerPhone || 'N/A'}</span>
            <a href="https://zalo.me/${l.customerPhone}" target="_blank" class="text-[10px] text-blue-500 hover:text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded" title="Nhắn Zalo">
              <i class="fa-solid fa-comment-dots"></i> Zalo
            </a>
            <a href="tel:${l.customerPhone}" class="text-[10px] text-emerald-600 hover:text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded" title="Gọi điện">
              <i class="fa-solid fa-phone"></i> Gọi
            </a>
          </div>
        </td>
        <td class="px-4 py-3 text-slate-600 max-w-xs truncate" title="${escapeHtml(l.customerAddress || '')}">
          ${escapeHtml(l.customerAddress || 'Chưa có địa chỉ')}
        </td>
        <td class="px-4 py-3">
          <div class="font-semibold text-slate-800">${escapeHtml(l.interestedProduct || 'Tư vấn')}</div>
          ${l.productPrice ? `<div class="text-[11px] text-slate-500">${formatVND(l.productPrice)} (SL: ${l.quantity || 1})</div>` : ''}
        </td>
        <td class="px-4 py-3 text-slate-500 italic max-w-xs truncate" title="${escapeHtml(lastMsg)}">
          "${escapeHtml(lastMsg)}"
        </td>
        <td class="px-4 py-3 text-slate-500 whitespace-nowrap">
          ${formatDate(l.createdAt)}
        </td>
        <td class="px-4 py-3">
          <div class="relative inline-block">
            <select onchange="updateZaloLeadStatus('${l.id}', this.value)" class="text-[10px] font-bold rounded-full px-2 py-0.5 border cursor-pointer ${
              l.status === 'new' ? 'bg-amber-50 text-amber-800 border-amber-300' :
              l.status === 'converted' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
              l.status === 'contacted' ? 'bg-blue-50 text-blue-800 border-blue-300' :
              'bg-slate-50 text-slate-600 border-slate-300'
            }">
              <option value="new" ${l.status === 'new' ? 'selected' : ''}>Mới thu thập</option>
              <option value="contacted" ${l.status === 'contacted' ? 'selected' : ''}>Đang liên hệ</option>
              <option value="converted" ${l.status === 'converted' ? 'selected' : ''}>Đã chốt đơn</option>
              <option value="cancelled" ${l.status === 'cancelled' ? 'selected' : ''}>Hủy / Không nhu cầu</option>
            </select>
          </div>
          ${l.orderCode ? `<div class="mt-1 font-mono text-[10px] text-emerald-600 font-bold">#${l.orderCode}</div>` : ''}
        </td>
        <td class="px-4 py-3 text-right whitespace-nowrap">
          ${!isConverted ? `
            <button onclick="convertLeadToOrderFast('${l.id}')" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] px-2.5 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5 ml-auto transition">
              <i class="fa-solid fa-cart-plus"></i> Tạo đơn ngay
            </button>
          ` : `
            <span class="text-[11px] text-emerald-700 font-semibold flex items-center justify-end gap-1">
              <i class="fa-solid fa-check"></i> Đã tạo đơn
            </span>
          `}
        </td>
      </tr>
    `;
  }).join('');
}

async function updateZaloLeadStatus(leadId, newStatus) {
  try {
    const res = await apiFetch(`/api/zalo-bot/leads/${leadId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Đã cập nhật trạng thái khách hàng Zalo!', 'success');
      loadZaloLeads();
    }
  } catch (err) {
    showToast('Lỗi cập nhật trạng thái', 'error');
  }
}

async function convertLeadToOrderFast(leadId) {
  const lead = zaloLeadsData.find(l => l.id === leadId);
  if (!lead) return;

  if (!confirm(`Xác nhận chuyển đổi khách hàng [${lead.customerName} - ${lead.customerPhone}] thành Đơn hàng chính thức trong hệ thống OMS?`)) return;

  try {
    const res = await apiFetch(`/api/zalo-bot/leads/${leadId}/convert-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shippingFee: 30000,
        paymentMethod: 'COD'
      })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`🎉 Đã tạo thành công Đơn hàng #${data.order.code} từ Zalo Lead!`, 'success');
      await loadOrders();
      await loadZaloLeads();
      switchTab('orders');
    }
  } catch (err) {
    showToast('Lỗi khi chuyển đổi đơn hàng', 'error');
  }
}

// Zalo Live Chat Simulator
async function sendSimulatedZaloMessage() {
  const input = document.getElementById('sim-input-text');
  if (!input || !input.value.trim()) return;

  const userText = input.value.trim();
  input.value = '';

  const history = document.getElementById('sim-chat-history');
  if (!history) return;

  // Append user bubble
  const userBubble = document.createElement('div');
  userBubble.className = 'flex items-start justify-end gap-2';
  userBubble.innerHTML = `
    <div class="bg-[#0068ff] text-white p-2.5 rounded-2xl rounded-tr-none shadow-xs max-w-[85%] text-[11px] leading-relaxed">
      ${escapeHtml(userText)}
    </div>
  `;
  history.appendChild(userBubble);
  history.scrollTop = history.scrollHeight;

  // Append typing indicator
  const typingBubble = document.createElement('div');
  typingBubble.id = 'sim-typing-indicator';
  typingBubble.className = 'flex items-start gap-2';
  typingBubble.innerHTML = `
    <div class="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">Bot</div>
    <div class="bg-white p-2 rounded-2xl rounded-tl-none shadow-xs text-slate-400 text-[10px] flex items-center gap-1">
      <span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce"></span>
      <span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style="animation-delay: 0.2s"></span>
      <span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style="animation-delay: 0.4s"></span>
    </div>
  `;
  history.appendChild(typingBubble);
  history.scrollTop = history.scrollHeight;

  try {
    const res = await apiFetch('/api/zalo-bot/process-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: userText })
    });
    const data = await res.json();

    const typingEl = document.getElementById('sim-typing-indicator');
    if (typingEl) typingEl.remove();

    if (data.success && data.result) {
      const resData = data.result;
      const botBubble = document.createElement('div');
      botBubble.className = 'flex items-start gap-2';
      botBubble.innerHTML = `
        <div class="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">Bot</div>
        <div class="bg-white p-2.5 rounded-2xl rounded-tl-none shadow-xs max-w-[85%] text-slate-800 text-[11px] whitespace-pre-line leading-relaxed">
          ${escapeHtml(resData.botReply)}
        </div>
      `;
      history.appendChild(botBubble);
      history.scrollTop = history.scrollHeight;

      if (resData.leadCaptured && resData.extracted) {
        const alertBox = document.getElementById('sim-extraction-alert');
        if (alertBox) {
          alertBox.classList.remove('hidden');
          document.getElementById('alert-lead-name').innerText = resData.extracted.name || 'Khách hàng Zalo';
          document.getElementById('alert-lead-phone').innerText = resData.extracted.phone || '';
          document.getElementById('alert-lead-address').innerText = resData.extracted.address || 'Chưa cung cấp';
          document.getElementById('alert-lead-product').innerText = resData.extracted.matchedProduct ? `${resData.extracted.quantity}x ${resData.extracted.matchedProduct.name}` : 'Tư vấn chung';
        }
        showToast(`🎉 Đã tự động thu thập SĐT ${resData.extracted.phone} và lưu khách hàng vào OMS!`, 'success');
        loadZaloLeads();
        loadCustomers();
      }
    }
  } catch (err) {
    const typingEl = document.getElementById('sim-typing-indicator');
    if (typingEl) typingEl.remove();
    showToast('Lỗi gọi Zalo Bot Simulator', 'error');
  }
}

function useSimPreset(text) {
  const input = document.getElementById('sim-input-text');
  if (input) {
    input.value = text;
    sendSimulatedZaloMessage();
  }
}

// Zalo Bot Configuration Management
async function loadZaloBotConfig() {
  try {
    const res = await apiFetch('/api/zalo-bot/config');
    const data = await res.json();
    if (data.success && data.config) {
      const c = data.config;
      if (document.getElementById('bot-config-enabled')) document.getElementById('bot-config-enabled').checked = c.enabled !== false;
      if (document.getElementById('bot-config-welcome')) document.getElementById('bot-config-welcome').value = c.welcomeMessage || '';
      if (document.getElementById('bot-config-lead-success')) document.getElementById('bot-config-lead-success').value = c.leadSuccessMessage || '';

      const tbody = document.getElementById('bot-keywords-tbody');
      if (tbody) {
        const keywords = Array.isArray(c.keywords) ? c.keywords : [];
        tbody.innerHTML = '';
        keywords.forEach(kw => addBotKeywordRow(kw.keyword, kw.reply));
      }
    }
  } catch (err) {
    console.error('Lỗi tải cấu hình Zalo Bot:', err);
  }
}

function addBotKeywordRow(keyword = '', reply = '') {
  const tbody = document.getElementById('bot-keywords-tbody');
  if (!tbody) return;

  const row = document.createElement('tr');
  row.className = 'hover:bg-slate-50';
  row.innerHTML = `
    <td class="p-2">
      <input type="text" class="bot-kw-input w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-bold text-slate-800" value="${escapeHtml(keyword)}" placeholder="ví dụ: giá, ship, địa chỉ">
    </td>
    <td class="p-2">
      <input type="text" class="bot-reply-input w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-700" value="${escapeHtml(reply)}" placeholder="Câu trả lời của bot...">
    </td>
    <td class="p-2 text-center">
      <button onclick="this.closest('tr').remove()" class="text-rose-500 hover:text-rose-700 text-xs px-2 py-1">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    </td>
  `;
  tbody.appendChild(row);
}

async function saveZaloBotConfig() {
  const enabled = document.getElementById('bot-config-enabled')?.checked;
  const welcomeMessage = document.getElementById('bot-config-welcome')?.value.trim();
  const leadSuccessMessage = document.getElementById('bot-config-lead-success')?.value.trim();

  const keywordRows = document.querySelectorAll('#bot-keywords-tbody tr');
  const keywords = [];
  keywordRows.forEach(row => {
    const kw = row.querySelector('.bot-kw-input')?.value.trim();
    const rep = row.querySelector('.bot-reply-input')?.value.trim();
    if (kw && rep) {
      keywords.push({ keyword: kw, reply: rep });
    }
  });

  try {
    const res = await apiFetch('/api/zalo-bot/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enabled,
        welcomeMessage,
        leadSuccessMessage,
        keywords
      })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Đã lưu kịch bản Zalo Bot thành công!', 'success');
      const indicator = document.getElementById('bot-status-indicator');
      if (indicator) {
        if (enabled) {
          indicator.className = 'text-emerald-300 font-bold flex items-center gap-1';
          indicator.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Đang hoạt động';
        } else {
          indicator.className = 'text-slate-300 font-bold flex items-center gap-1';
          indicator.innerHTML = '<span class="w-2 h-2 rounded-full bg-slate-400"></span> Đang tạm tắt';
        }
      }
    }
  } catch (err) {
    showToast('Lỗi lưu kịch bản Bot', 'error');
  }
}


