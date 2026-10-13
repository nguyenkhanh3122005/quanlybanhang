/**
 * AUDIT LOGGING SERVICE (NHẬT KÝ KIỂM TOÁN CHUYÊN SÂU)
 * Ghi lại mọi dấu vết nghiệp vụ: Ai sửa, Sửa cái gì, Thời gian nào, Giá trị cũ/mới để đối soát.
 */

const fs = require('fs');
const path = require('path');

const AUDIT_FILE = path.join(__dirname, 'data', 'audit_logs.json');

class AuditService {
  constructor() {
    this.logs = this.loadLogs();
  }

  loadLogs() {
    try {
      if (!fs.existsSync(AUDIT_FILE)) {
        fs.writeFileSync(AUDIT_FILE, '[]', 'utf8');
        return [];
      }
      return JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf8'));
    } catch (err) {
      console.error('Lỗi nạp audit logs:', err);
      return [];
    }
  }

  saveLogs() {
    try {
      fs.writeFileSync(AUDIT_FILE, JSON.stringify(this.logs, null, 2), 'utf8');
    } catch (err) {
      console.error('Lỗi lưu audit logs:', err);
    }
  }

  /**
   * Ghi một mục nhật ký kiểm toán mới
   */
  log({
    user = { id: 'usr-admin-1', name: 'Quản trị viên', role: 'admin' },
    entityType = 'ORDER',
    entityId,
    action,
    description,
    changes = [],
    reason = '',
    ip = '127.0.0.1'
  }) {
    const entry = {
      id: 'aud-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      user: {
        id: user.id || 'anonymous',
        name: user.name || 'Hệ thống',
        role: user.role || 'system'
      },
      entityType,
      entityId,
      action,
      description: description || `Thực hiện thao tác ${action} trên ${entityType} #${entityId}`,
      changes, // Mảng: [{ field: 'orderStatus', oldVal: 'pending', newVal: 'shipping' }]
      reason,
      ip
    };

    this.logs.unshift(entry);
    // Giữ tối đa 2000 log gần nhất
    if (this.logs.length > 2000) {
      this.logs = this.logs.slice(0, 2000);
    }

    this.saveLogs();
    return entry;
  }

  /**
   * Truy vấn nhật ký có lọc
   */
  query({ entityType, entityId, action, search, limit = 100 }) {
    let result = [...this.logs];

    if (entityType && entityType !== 'all') {
      result = result.filter(l => l.entityType === entityType);
    }

    if (entityId) {
      result = result.filter(l => l.entityId === entityId);
    }

    if (action && action !== 'all') {
      result = result.filter(l => l.action === action);
    }

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(l =>
        (l.description && l.description.toLowerCase().includes(q)) ||
        (l.entityId && l.entityId.toLowerCase().includes(q)) ||
        (l.user && l.user.name && l.user.name.toLowerCase().includes(q)) ||
        (l.reason && l.reason.toLowerCase().includes(q))
      );
    }

    return result.slice(0, limit);
  }
}

module.exports = new AuditService();
