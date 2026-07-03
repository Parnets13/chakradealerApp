/**
 * returnService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Fetches MaterialReturn data via the dealer-protected route:
 *   GET  /api/dealer/returns        → materialReturn list (same data as Admin table)
 *   POST /api/dealer/returns/create → create new return request
 *
 * Uses API_BASE_URL (/api/dealer) + protectDealer JWT — so dealer token works.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import apiService from './apiService';

class ReturnService {
  /**
   * Fetch all material returns.
   * @param {object} params  Optional: { search } — partial match on mrId/invoiceNo/productName
   */
  async getReturns(params = {}) {
    // Filter out empty values so we don't send ?search= to backend
    const clean = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v != null && v !== ''),
    );
    return apiService.get('/returns', clean);
  }

  /**
   * Create a new return request.
   * Required: supplierName, invoiceNo, productName, returnQty, reason
   * Optional: value
   */
  async createReturn(returnData) {
    return apiService.post('/returns/create', returnData);
  }

  /**
   * Get a single return by MongoDB _id.
   */
  async getReturnById(id) {
    return apiService.get(`/returns/${id}`);
  }
}

export default new ReturnService();
