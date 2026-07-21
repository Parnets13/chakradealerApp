import apiService from './apiService';
import { API_ENDPOINTS } from '../config/api';

class AuthService {
  // Register new dealer with photo (multipart/form-data)
  async registerDealerFormData(formData) {
    try {
      console.log('📋 Registering dealer (with photo / FormData)');
      const response = await apiService.request('/auth/register', {
        method: 'POST',
        body: formData, // FormData — apiService auto-sets correct Content-Type
      });
      console.log('✅ Register (FormData) Response:', response);
      if (response.success && response.dealer) {
        try {
          const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
          await AsyncStorage.setItem('dealerProfile', JSON.stringify(response.dealer));
        } catch (storageErr) {
          console.warn('⚠ Could not save reg dealer data:', storageErr.message);
        }
      }
      return response;
    } catch (error) {
      console.error('❌ Register (FormData) Error:', error);
      throw error;
    }
  }

  // Register new dealer
  async registerDealer(data) {
    try {
      console.log('📋 Registering dealer:', data.mobile);
      const response = await apiService.post(API_ENDPOINTS.AUTH.REGISTER, data);
      console.log('✅ Register Response:', response);
      // Save dealer data from registration response so profile is pre-populated before login
      if (response.success && response.dealer) {
        try {
          const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
          await AsyncStorage.setItem('dealerProfile', JSON.stringify(response.dealer));
          console.log('✅ Registration dealer data saved to AsyncStorage');
        } catch (storageErr) {
          console.warn('⚠ Could not save reg dealer data to storage:', storageErr.message);
        }
      }
      return response;
    } catch (error) {
      console.error('❌ Register Error:', error);
      throw error;
    }
  }

  // Send OTP to mobile number
  async sendOTP(mobile) {
    try {
      console.log('📱 Sending OTP to:', mobile);
      const response = await apiService.post(API_ENDPOINTS.AUTH.SEND_OTP, { mobile });
      const otp = String(
        response.otp       ??
        response.otpCode   ??
        response.otp_code  ??
        response.data?.otp ??
        ''
      ).trim();
      console.log('✅ OTP Response:', response);
      return { success: response.success, otp, message: response.message, dealer: response.dealer };
    } catch (error) {
      console.error('❌ Send OTP Error:', error);
      throw error;
    }
  }

  // Verify OTP and login
  async verifyOTP(mobile, otp) {
    try {
      console.log(' Verifying OTP for:', mobile);
      const response = await apiService.post(API_ENDPOINTS.AUTH.VERIFY_OTP, {
        mobile: String(mobile).trim(),
        otp: String(otp).trim(),
      });
      console.log('✅ Verify Response:', response);
      if (response.success && response.token) {
        await apiService.setToken(response.token);
        console.log('✅ Token saved successfully');
      }
      // Persist dealer data locally so profile screen always has it
      if (response.success && response.dealer) {
        try {
          const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
          await AsyncStorage.setItem('dealerProfile', JSON.stringify(response.dealer));
          console.log('✅ Dealer profile saved to AsyncStorage');
        } catch (storageErr) {
          console.warn('⚠ Could not save dealer profile to storage:', storageErr.message);
        }
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
