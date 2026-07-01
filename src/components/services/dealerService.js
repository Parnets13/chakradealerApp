import apiService from './apiService';
import { API_ENDPOINTS } from '../config/api';

class DealerService {
  // Get dashboard data
  async getDashboard() {
    try {
      const response = await apiService.get(API_ENDPOINTS.PROFILE.DASHBOARD);
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Get dealer profile
  async getProfile() {
    try {
      const response = await apiService.get(API_ENDPOINTS.PROFILE.GET);
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Update dealer profile
  async updateProfile(data) {
    try {
      const response = await apiService.put(API_ENDPOINTS.PROFILE.UPDATE, data);
      return response;
    } catch (error) {
      throw error;
    }
  }
}

export default new DealerService();
