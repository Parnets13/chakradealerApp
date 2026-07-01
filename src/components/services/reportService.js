import apiService from './apiService';

class ReportService {
  // Get dashboard report
  async getDashboard() {
    try {
      const response = await apiService.get('/reports/dashboard');
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Get sales report
  async getSalesReport(params = {}) {
    try {
      const response = await apiService.get('/reports/sales', params);
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Get inventory report
  async getInventoryReport(params = {}) {
    try {
      const response = await apiService.get('/reports/inventory', params);
      return response;
    } catch (error) {
      throw error;
    }
  }
}

export default new ReportService();
