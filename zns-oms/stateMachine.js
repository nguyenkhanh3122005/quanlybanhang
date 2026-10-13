/**
 * ORDER STATE MACHINE (MÁY TRẠNG THÁI ĐƠN HÀNG CHẶT CHẼ)
 * Ngăn chặn tuyệt đối các bước nhảy trạng thái bất hợp lệ (ví dụ: đã hủy lại sang đang giao).
 */

class StateMachineError extends Error {
  constructor(message, currentStatus, targetStatus) {
    super(message);
    this.name = 'StateMachineError';
    this.currentStatus = currentStatus;
    this.targetStatus = targetStatus;
  }
}

// Bảng ma trận các trạng thái hợp lệ và quy tắc chuyển đổi
const ORDER_STATES = {
  DRAFT: 'draft',           // Đơn nháp
  PENDING: 'pending',       // Chờ duyệt / Tiếp nhận
  PROCESSING: 'processing', // Đang xử lý & Đóng gói
  SHIPPING: 'shipping',     // Đang giao hàng
  COMPLETED: 'completed',   // Giao thành công / Đã thanh toán
  CANCELLED: 'cancelled',   // Đã hủy đơn
  RETURNED: 'returned'      // Chuyển hoàn / Trả hàng
};

// Ma trận trạng thái kế tiếp cho phép (Allowed Transition Matrix)
const ALLOWED_TRANSITIONS = {
  [ORDER_STATES.DRAFT]: [ORDER_STATES.PENDING, ORDER_STATES.CANCELLED],
  [ORDER_STATES.PENDING]: [ORDER_STATES.PROCESSING, ORDER_STATES.CANCELLED],
  [ORDER_STATES.PROCESSING]: [ORDER_STATES.SHIPPING, ORDER_STATES.CANCELLED],
  [ORDER_STATES.SHIPPING]: [ORDER_STATES.COMPLETED, ORDER_STATES.RETURNED, ORDER_STATES.CANCELLED],
  [ORDER_STATES.COMPLETED]: [ORDER_STATES.RETURNED], // Đã giao chỉ có thể chuyển hoàn nếu khách trả hàng
  [ORDER_STATES.CANCELLED]: [],                      // Trạng thái kết thúc (Terminal state) - KHÔNG ĐƯỢC CHUYỂN TIẾP
  [ORDER_STATES.RETURNED]: []                       // Trạng thái kết thúc (Terminal state)
};

const STATE_LABELS = {
  draft: 'Đơn nháp',
  pending: 'Chờ duyệt / Tiếp nhận',
  processing: 'Đang đóng gói & chuẩn bị hàng',
  shipping: 'Đang giao hàng (Xuất kho)',
  completed: 'Giao hàng thành công',
  cancelled: 'Đã hủy đơn hàng',
  returned: 'Chuyển hoàn / Trả hàng'
};

const OrderStateMachine = {
  ORDER_STATES,
  STATE_LABELS,

  /**
   * Kiểm tra tính hợp lệ của việc chuyển đổi trạng thái
   */
  canTransition(currentStatus, targetStatus) {
    if (!currentStatus || !targetStatus) return false;
    if (currentStatus === targetStatus) return true; // Giữ nguyên trạng thái là hợp lệ
    const allowedNext = ALLOWED_TRANSITIONS[currentStatus] || [];
    return allowedNext.includes(targetStatus);
  },

  /**
   * Thực hiện xác thực chuyển đổi, ném ra ngoại lệ nếu vi phạm quy tắc
   */
  validateTransition(currentStatus, targetStatus) {
    if (!this.canTransition(currentStatus, targetStatus)) {
      const currLabel = STATE_LABELS[currentStatus] || currentStatus;
      const targetLabel = STATE_LABELS[targetStatus] || targetStatus;
      throw new StateMachineError(
        `Quy tắc vận hành vi phạm: Không thể chuyển trạng thái đơn hàng từ [${currLabel}] sang [${targetLabel}]. Trạng thái kế tiếp hợp lệ: [${(ALLOWED_TRANSITIONS[currentStatus] || []).map(s => STATE_LABELS[s]).join(', ') || 'Không có (trạng thái kết thúc)'}]`,
        currentStatus,
        targetStatus
      );
    }
    return true;
  },

  /**
   * Lấy danh sách các trạng thái tiếp theo khả dụng cho đơn hàng
   */
  getNextAvailableStates(currentStatus) {
    return (ALLOWED_TRANSITIONS[currentStatus] || []).map(status => ({
      status,
      label: STATE_LABELS[status] || status
    }));
  }
};

module.exports = {
  OrderStateMachine,
  StateMachineError,
  ORDER_STATES
};
