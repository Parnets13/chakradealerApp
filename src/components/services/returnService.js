import apiService from './apiService';

class ReturnService {
  // Get all returns
  async getReturns(params = {}) {
    try {
      const response = await apiService.get('/returns', params);
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Get return by ID
  async getReturnById(id) {
    try {
      const response = await apiService.get(`/returns/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Create new return
  async createReturn(returnData) {
    try {
      const response = await apiService.post('/returns/create', returnData);
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Track return
  async trackReturn(id) {
    try {
      const response = await apiService.get(`/returns/${id}/track`);
      return response;
    } catch (error) {
      throw error;
    }
  }
}

export default new ReturnService();
