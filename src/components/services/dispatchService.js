import apiService from './apiService';

class DispatchService {
  // Get all dispatches
  async getDispatches(params = {}) {
    try {
      const response = await apiService.get('/dispatch', params);
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Track dispatch
  async trackDispatch(id) {
    try {
      const response = await apiService.get(`/dispatch/${id}/track`);
      return response;
    } catch (error) {
      throw error;
    }
  }
}

export default new DispatchService();
