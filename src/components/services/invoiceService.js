import apiService from './apiService';

class InvoiceService {
  // Get all invoices
  async getInvoices(params = {}) {
    try {
      const response = await apiService.get('/invoices', params);
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Get invoice by ID
  async getInvoiceById(id) {
    try {
      const response = await apiService.get(`/invoices/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Download invoice PDF
  async downloadInvoice(id) {
    try {
      const response = await apiService.get(`/invoices/${id}/download`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Pay invoice
  async payInvoice(id, paymentData) {
    try {
      const response = await apiService.post(`/invoices/${id}/pay`, paymentData);
      return response;
    } catch (error) {
      throw error;
    }
  }
}

export default new InvoiceService();
