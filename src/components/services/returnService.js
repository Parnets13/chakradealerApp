/**
 * returnService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * All dealer return API calls via /api/dealer/returns
 * Uses the dealer JWT (protectDealer middleware) — token stored in AsyncStorage.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import apiService from './apiService';

class ReturnService {
  /**
   * Fetch delivered orders eligible for return.
   * Returns shaped { _id, orderId, orderDate, value, lineItems[] }
   */
  getEligibleOrders() {
    return apiService.get('/returns/eligible-orders');
  }

  /**
   * List this dealer's own return requests (MaterialReturn records).
   * @param {object} params  Optional: { stage, search }
   */
  getReturns(params = {}) {
    const clean = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v != null && v !== ''),
    );
    return apiService.get('/returns', clean);
  }

  /**
   * Create a new return request.
   * @param {object} data  { orderId, productName, returnQty, reason, ... }
   */
  createReturn(data) {
    return apiService.post('/returns', data);
  }

  /**
   * Get a single return by MongoDB _id.
   */
  getReturnById(id) {
    return apiService.get(`/returns/${id}`);
  }
}

export default new ReturnService();
