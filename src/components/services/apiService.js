import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, API_TIMEOUT } from '../config/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.timeout = API_TIMEOUT;
  }

  // Get stored token
  async getToken() {
    try {
      return await AsyncStorage.getItem('authToken');
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  // Set token
  async setToken(token) {
    try {
      await AsyncStorage.setItem('authToken', token);
    } catch (error) {
      console.error('Error setting token:', error);
    }
  }

  // Remove token
  async removeToken() {
    try {
      await AsyncStorage.removeItem('authToken');
    } catch (error) {
      console.error('Error removing token:', error);
    }
  }

  // Make API request
  async request(endpoint, options = {}) {
    const token = await this.getToken();
    
    const config = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...(options.body && { body: JSON.stringify(options.body) }),
    };

    const fullURL = `${this.baseURL}${endpoint}`;
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`🌐 API Request: ${config.method} ${fullURL}`);
    if (options.body) {
      console.log('📤 Body:', JSON.stringify(options.body, null, 2));
    }
    console.log('═══════════════════════════════════════════════════════════');

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => {
        const errorMsg = `Request timeout after ${this.timeout/1000}s.\n\n` +
                        `Backend URL: ${this.baseURL}\n\n` +
                        `Please ensure:\n` +
                        `1. Backend is running on port 5001\n` +
                        `2. Your phone and computer are on same WiFi\n` +
                        `3. Check api.js for correct IP address\n` +
                        `4. Test URL in phone browser first:\n` +
                        `   ${this.baseURL.replace('/api/dealer', '/api/health')}`;
        reject(new Error(errorMsg));
      }, this.timeout)
    );

    try {
      const fetchPromise = fetch(fullURL, config);
      const response = await Promise.race([fetchPromise, timeoutPromise]);

      console.log(`📥 Response Status: ${response.status}`);

      // Try to parse JSON response
      let data;
      try {
        data = await response.json();
        console.log('📥 Response Data:', JSON.stringify(data, null, 2));
      } catch (parseError) {
        console.error('❌ Failed to parse JSON response');
        throw new Error(`Invalid response from server. Status: ${response.status}`);
      }

      if (!response.ok) {
        const errorMessage = data.message || `API request failed with status ${response.status}`;
        console.error('❌ API Error:', errorMessage);
        throw new Error(errorMessage);
      }

      console.log('✅ Request successful');
      return data;
      
    } catch (error) {
      console.error('❌ API Error:', error.message);
      
      // Provide helpful error messages
      if (error.message.includes('Network request failed') || 
          error.message.includes('Failed to fetch') ||
          error.message.includes('Network Error')) {
        const helpfulError = new Error(
          `Cannot connect to backend server.\n\n` +
          `Current URL: ${this.baseURL}\n\n` +
          `Troubleshooting:\n` +
          `1. Check backend is running: npm run dev\n` +
          `2. Verify IP address in api.js (currently: ${this.baseURL})\n` +
          `3. Test in phone browser: ${this.baseURL.replace('/api/dealer', '/api/health')}\n` +
          `4. Ensure same WiFi network\n` +
          `5. Check Windows Firewall (allow port 5001)`
        );
        throw helpfulError;
      }
      
      throw error;
    }
  }

  // GET request
  async get(endpoint, params = {}) {
    // Filter out undefined/null params
    const cleanParams = {};
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') cleanParams[k] = v;
    });
    const queryString = new URLSearchParams(cleanParams).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  // POST request
  async post(endpoint, body = {}) {
    return this.request(endpoint, { method: 'POST', body });
  }

  // PUT request
  async put(endpoint, body = {}) {
    return this.request(endpoint, { method: 'PUT', body });
  }

  // DELETE request
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

export default new ApiService();
