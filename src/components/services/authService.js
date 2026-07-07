import apiService from './apiService';
import { API_ENDPOINTS } from '../config/api';

class AuthService {
  // Send OTP to mobile
  async sendOTP(mobile) {
    try {
      console.log('📱 Sending OTP to:', mobile);
      console.log('🔗 API URL:', `${API_ENDPOINTS.AUTH.SEND_OTP}`);
      
      const response = await apiService.post(API_ENDPOINTS.AUTH.SEND_OTP, { mobile });
      
      // Normalize OTP field — backend sends `otp` directly on the response object
      const otp = String(
        response.otp       ??   // primary field (dealer authRoutes.js)
        response.otpCode   ??   // fallback alias
        response.otp_code  ??   // snake_case fallback
        response.data?.otp ??   // nested fallback
        ''
      ).trim();

      console.log('✅ OTP Response:', response);
      console.log('🔢 Extracted OTP:', otp);

      return {
        success: response.success,
        otp,
        message: response.message,
        dealer: response.dealer,
      };
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
      
      // Backend expects { mobile, otp } — both as strings
      const response = await apiService.post(API_ENDPOINTS.AUTH.VERIFY_OTP, { 
        mobile: String(mobile).trim(),
        otp: String(otp).trim(),
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
