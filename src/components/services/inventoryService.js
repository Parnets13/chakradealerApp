import apiService from './apiService';
import { API_ENDPOINTS } from '../config/api';

class InventoryService {
  // Get inventory list
  async getInventory(params = {}) {
    try {
      const response = await apiService.get(API_ENDPOINTS.INVENTORY.LIST, params);
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Get inventory stock (admin data)
  async getInventoryStock(params = {}) {
    try {
      const response = await apiService.get(API_ENDPOINTS.INVENTORY.STOCK, params);
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Get product inventory
  async getProductInventory(productId) {
    try {
      const response = await apiService.get(`${API_ENDPOINTS.INVENTORY.PRODUCT.replace(':productId', productId)}`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Check product availability
  async checkAvailability(productId, quantity) {
    try {
      const response = await apiService.post('/inventory/check', { 
        productId, 
        quantity 
      });
      return response;
    } catch (error) {
      throw error;
    }
  }
}

export default new InventoryService();
