/**
 * BACKGROUND JOBS & MESSAGE QUEUE ENGINE
 * Xử lý tác vụ ngầm bất đồng bộ (Gửi tin hàng loạt, Xuất báo cáo dung lượng lớn, Đồng bộ sàn)
 * Đảm bảo giao diện người dùng không bị tắc nghẽn (Zero UI freeze).
 */

class QueueService {
  constructor() {
    this.jobs = [];
    this.isProcessing = false;
    this.handlers = {};
  }

  registerHandler(jobType, handlerFn) {
    this.handlers[jobType] = handlerFn;
  }

  addJob(type, payload, metadata = {}) {
    const job = {
      id: 'job-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      type,
      payload,
      metadata,
      status: 'queued', // 'queued' | 'processing' | 'completed' | 'failed'
      progress: 0,
      result: null,
      error: null,
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null
    };

    this.jobs.unshift(job);
    if (this.jobs.length > 500) this.jobs = this.jobs.slice(0, 500);

    // Bắt đầu xử lý hàng đợi nếu đang rảnh
    setImmediate(() => this.processNext());
    return job;
  }

  async processNext() {
    if (this.isProcessing) return;

    const nextJob = this.jobs.slice().reverse().find(j => j.status === 'queued');
    if (!nextJob) return;

    this.isProcessing = true;
    nextJob.status = 'processing';
    nextJob.startedAt = new Date().toISOString();
    nextJob.progress = 10;

    const handler = this.handlers[nextJob.type];
    if (!handler) {
      nextJob.status = 'failed';
      nextJob.error = `Không tìm thấy trình xử lý (Handler) cho công việc '${nextJob.type}'`;
      nextJob.completedAt = new Date().toISOString();
      this.isProcessing = false;
      this.processNext();
      return;
    }

    try {
      const updateProgress = (percent) => {
        nextJob.progress = Math.min(99, Math.max(0, percent));
      };

      const result = await handler(nextJob.payload, updateProgress);
      nextJob.status = 'completed';
      nextJob.progress = 100;
      nextJob.result = result;
      nextJob.completedAt = new Date().toISOString();
    } catch (err) {
      console.error(`Lỗi thực thi Job ${nextJob.id}:`, err);
      nextJob.status = 'failed';
      nextJob.error = err.message || 'Lỗi không xác định khi chạy tác vụ ngầm';
      nextJob.completedAt = new Date().toISOString();
    } finally {
      this.isProcessing = false;
      // Kích hoạt xử lý job tiếp theo
      setTimeout(() => this.processNext(), 100);
    }
  }

  getJobs(limit = 50) {
    return this.jobs.slice(0, limit);
  }

  getJobById(id) {
    return this.jobs.find(j => j.id === id);
  }
}

module.exports = new QueueService();
