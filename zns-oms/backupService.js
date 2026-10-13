/**
 * AUTOMATED BACKUP & DISASTER RECOVERY ENGINE
 * Sao lưu CSDL định kỳ và khôi phục điểm phục hồi (Restore Points) an toàn.
 */

const fs = require('fs');
const path = require('path');

const BACKUP_DIR = path.join(__dirname, 'data', 'backups');

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

class BackupService {
  constructor() {
    this.initAutoBackupScheduler();
  }

  /**
   * Tạo bản sao lưu toàn diện (Snapshot) của toàn bộ hệ thống
   */
  createBackup(db, label = 'Sao lưu thủ công') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `snapshot_${timestamp}.json`;
    const filePath = path.join(BACKUP_DIR, fileName);

    const snapshotData = {
      version: '1.2.0',
      createdAt: new Date().toISOString(),
      label,
      data: {
        orders: db.getOrders(),
        customers: db.getCustomers(),
        products: db.getProducts(),
        categories: db.getCategories(),
        settings: db.getSettings(),
        znsLogs: db.getZnsLogs()
      },
      stats: {
        totalOrders: db.getOrders().length,
        totalCustomers: db.getCustomers().length,
        totalProducts: db.getProducts().length
      }
    };

    fs.writeFileSync(filePath, JSON.stringify(snapshotData, null, 2), 'utf8');

    const fileStat = fs.statSync(filePath);

    return {
      id: fileName.replace('.json', ''),
      fileName,
      filePath,
      label,
      sizeBytes: fileStat.size,
      sizeFormatted: (fileStat.size / 1024).toFixed(2) + ' KB',
      createdAt: snapshotData.createdAt,
      stats: snapshotData.stats
    };
  }

  /**
   * Lấy danh sách tất cả các điểm khôi phục có sẵn
   */
  listBackups() {
    try {
      const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.json'));
      const backups = files.map(fileName => {
        const filePath = path.join(BACKUP_DIR, fileName);
        const stat = fs.statSync(filePath);
        try {
          const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          return {
            id: fileName.replace('.json', ''),
            fileName,
            label: content.label || 'Bản sao lưu',
            sizeFormatted: (stat.size / 1024).toFixed(2) + ' KB',
            createdAt: content.createdAt || stat.mtime.toISOString(),
            stats: content.stats || {}
          };
        } catch {
          return {
            id: fileName.replace('.json', ''),
            fileName,
            label: 'Bản sao lưu không rõ',
            sizeFormatted: (stat.size / 1024).toFixed(2) + ' KB',
            createdAt: stat.mtime.toISOString(),
            stats: {}
          };
        }
      });

      // Sắp xếp mới nhất lên đầu
      backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return backups;
    } catch (err) {
      console.error('Lỗi đọc thư mục backups:', err);
      return [];
    }
  }

  /**
   * Khôi phục toàn bộ CSDL về một bản sao lưu cụ thể
   */
  restoreBackup(db, backupId) {
    const fileName = backupId.endsWith('.json') ? backupId : `${backupId}.json`;
    const filePath = path.join(BACKUP_DIR, fileName);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Không tìm thấy tệp sao lưu ${backupId}`);
    }

    // 1. Tạo điểm an toàn trước khi khôi phục (Safety Checkpoint)
    this.createBackup(db, 'Điểm an toàn trước khi khôi phục');

    // 2. Đọc và khôi phục dữ liệu
    const snapshot = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const { data } = snapshot;

    if (data.orders) db.saveOrders(data.orders);
    if (data.customers) db.saveCustomers(data.customers);
    if (data.products) db.saveProducts(data.products);
    if (data.categories) db.saveCategories(data.categories);
    if (data.settings) db.saveSettings(data.settings);
    if (data.znsLogs) db.saveZnsLogs(data.znsLogs);

    return {
      success: true,
      restoredFrom: backupId,
      timestamp: new Date().toISOString(),
      stats: snapshot.stats
    };
  }

  initAutoBackupScheduler() {
    // Tự động kiểm tra và tạo backup mỗi 12 giờ một lần
    setInterval(() => {
      try {
        const db = require('./db');
        this.createBackup(db, 'Sao lưu tự động định kỳ (Auto Backup)');
        console.log('✅ Đã tạo bản sao lưu tự động định kỳ');
      } catch (err) {
        console.error('Lỗi sao lưu tự động:', err);
      }
    }, 12 * 60 * 60 * 1000);
  }
}

module.exports = new BackupService();
