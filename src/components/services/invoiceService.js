import apiService from './apiService';

/**
 * Maps UI filter chip label → backend query param.
 * Backend GET /api/dealer/invoices accepts:
 *   paymentStatus = Paid | Pending | Partial
 *   status        = Overdue
 */
const buildFilterParams = (filter) => {
  switch (filter) {
    case 'Paid':    return { paymentStatus: 'Paid' };
    case 'Pending': return { paymentStatus: 'Pending' };
    case 'Overdue': return { status: 'Overdue' };
    case 'Partial': return { paymentStatus: 'Partial' };
    default:        return {};   // 'All' — no filter
  }
};

class InvoiceService {
  /**
   * Fetch all invoices for the logged-in dealer.
   *
   * @param {object} opts
   * @param {string} [opts.filter]  - 'All' | 'Paid' | 'Pending' | 'Overdue'
   * @param {string} [opts.search]  - free-text search string
   * @param {number} [opts.page]    - page number (1-based)
   * @param {number} [opts.limit]   - results per page
   */
  async getInvoices({ filter = 'All', search, page, limit } = {}) {
    const params = { ...buildFilterParams(filter) };
    if (search) params.search = search;
    if (page)   params.page   = page;
    if (limit)  params.limit  = limit;
    // Endpoint: GET /invoices   (apiService prepends API_BASE_URL = .../api/dealer)
    return apiService.get('/invoices', params);
  }

  /** Fetch one invoice by its MongoDB _id */
  async getInvoiceById(id) {
    return apiService.get(`/invoices/${id}`);
  }

  /** Download / get PDF URL */
  async downloadInvoice(id) {
    return apiService.get(`/invoices/${id}/download`);
  }

  /** Record payment for an invoice */
  async payInvoice(id, paymentData = {}) {
    return apiService.post(`/invoices/${id}/pay`, paymentData);
  }
}

export default new InvoiceService();
