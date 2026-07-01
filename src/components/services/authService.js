import apiService from './apiService';
import { API_ENDPOINTS } from '../config/api';

class AuthService {
  // Send OTP to mobile
  async sendOTP(mobile) {
    try {
      console.log('📱 Sending OTP to:', mobile);
      console.log('🔗 API URL:', `${API_ENDPOINTS.AUTH.SEND_OTP}`);
      
      const response = await apiService.post(API_ENDPOINTS.AUTH.SEND_OTP, { mobile });
      
      console.log('✅ OTP Response:', response);
      return response;
    } catch (error) {
      console.error('❌ Send OTP Error:', error);
      throw error;
    }
  }

  // Verify OTP and login
  async verifyOTP(mobile, otp) {
    try {
      console.log('🔐 Verifying OTP for:', mobile);
      console.log('🔗 API URL:', `${API_ENDPOINTS.AUTH.VERIFY_OTP}`);
      
      const response = await apiService.post(API_ENDPOINTS.AUTH.VERIFY_OTP, { 
        mobile, 
        otp 
      });
      
      console.log('✅ Verify Response:', response);
      
      if (response.success && response.token) {
        await apiService.setToken(response.token);
        console.log('✅ Token saved successfully');
      }
      
      return response;
    } catch (error) {
      console.error('❌ Verify OTP Error:', error);
      throw error;
    }
  }

  // Login with password
  async login(mobile, password) {
    try {
      const response = await apiService.post(API_ENDPOINTS.AUTH.LOGIN, { 
        mobile, 
        password 
      });
      
      if (response.success && response.token) {
        await apiService.setToken(response.token);
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Get current user
  async getMe() {
    try {
      const response = await apiService.get(API_ENDPOINTS.AUTH.ME);
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Logout
  async logout() {
    try {
      await apiService.post(API_ENDPOINTS.AUTH.LOGOUT);
      await apiService.removeToken();
      return { success: true };
    } catch (error) {
      await apiService.removeToken();
      throw error;
    }
  }

  // Update profile
  async updateProfile(data) {
    try {
      const response = await apiService.put(API_ENDPOINTS.AUTH.UPDATE_PROFILE, data);
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Change password
  async changePassword(currentPassword, newPassword) {
    try {
      const response = await apiService.put(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, {
        currentPassword,
        newPassword
      });
      return response;
    } catch (error) {
      throw error;
    }
  }
}

export default new AuthService();
