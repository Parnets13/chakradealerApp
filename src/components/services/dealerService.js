import apiService from './apiService';
import { API_ENDPOINTS } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

  // Get dealer profile — tries API first, falls back to locally stored dealer data
  async getProfile() {
    try {
      const response = await apiService.get(API_ENDPOINTS.PROFILE.GET);
      if (response.success && (response.data || response.dealer)) {
        // Keep local copy in sync
        const freshData = response.data || response.dealer;
        await AsyncStorage.setItem('dealerProfile', JSON.stringify(freshData)).catch(() => {});
      }
      return response;
    } catch (error) {
      // API failed — try to return locally stored dealer data so profile is never blank
      try {
        const stored = await AsyncStorage.getItem('dealerProfile');
        if (stored) {
          const dealer = JSON.parse(stored);
          console.log('📦 Using cached dealer profile from AsyncStorage');
          return { success: true, data: dealer };
        }
      } catch (_) {}
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

  // Clear locally stored profile (call on logout)
  async clearLocalProfile() {
    try {
      await AsyncStorage.removeItem('dealerProfile');
    } catch (_) {}
  }
}

export default new DealerService();
