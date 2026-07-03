import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from './apiService';
import { API_ENDPOINTS, API_BASE_URL } from '../config/api';

// ─── Admin API base (same server, different prefix) ─────────────────────────
// Dealer base = http://192.168.x.x:5001/api/dealer
// Admin base  = http://192.168.x.x:5001/api
const ADMIN_BASE = API_BASE_URL.replace('/api/dealer', '/api');

// Generic fetch helper for admin (no dealer-auth needed for inventory-data routes)
const adminGet = async (path) => {
  try {
    const token = await AsyncStorage.getItem('authToken');
    const url = `${ADMIN_BASE}${path}`;
    console.log(`[inventoryService] GET ${url}`);
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const data = await res.json();
    console.log(`[inventoryService] ${path} → success:${data.success} items:${Array.isArray(data.data) ? data.data.length : 'N/A'}`);
    // Log first item to verify field names
    if (Array.isArray(data.data) && data.data.length > 0) {
      console.log(`[inventoryService] ${path} sample[0]:`, JSON.stringify(data.data[0]).slice(0, 200));
    }
    return data;
  } catch (err) {
    console.warn(`[inventoryService] adminGet ${path} failed:`, err.message);
    return { success: false, data: [] };
  }
};

class InventoryService {
  // ── Primary stock list (dealer route — proxies admin getAllInventory) ────────
  async getInventoryStock(params = {}) {
    try {
      const response = await apiService.get(API_ENDPOINTS.INVENTORY.STOCK, params);
      return response;
    } catch (error) {
      throw error;
    }
  }

  // ── Batch data (/api/batches) ─────────────────────────────────────────────
  // Returns raw Batch docs: [{ batchNo, sku, itemName, quantity, mfgDate, expiryDate, warehouse, status }]
  // NOTE: using /api/batches (direct) instead of /api/inventory-data/batches
  //       because the latter maps batch.batchNumber which is undefined in the Batch model
  //       (actual field is batchNo).
  async getBatches() {
    return adminGet('/batches');
  }

  // ── Storage locations (/api/inventory-data/storage) ─────────────────────────
  // Returns: [{ id, name, location, zones:[{ id, name, color, racks, shelves, bins }] }]
  async getStorageLocations() {
    return adminGet('/inventory-data/storage');
  }

  // ── Pincode stock (/api/inventory-data/pincode) ──────────────────────────────
  // Returns: [{ pincode, city, godowns:[{ id, name, locations:[{ sku, availableQty, batchNo, loc }] }] }]
  async getPincodeStock() {
    return adminGet('/inventory-data/pincode');
  }

  // ── Ageing stock (/api/inventory-data/ageing) ───────────────────────────────
  // Returns: [{ sku, item, wh, whName, qty, lastMov, days, bucket, value, action }]
  async getAgeingStock() {
    return adminGet('/inventory-data/ageing');
  }

  // ── Defective stock (/api/defective-stock) ──────────────────────────────────
  // Returns: [{ sku, name, qty, warehouseName, category, location, unitPrice, totalValue, dateAdded, action }]
  async getDefectiveStock() {
    return adminGet('/defective-stock');
  }

  // ── Legacy helpers (kept for backward compat) ────────────────────────────────
  async getInventory(params = {}) {
    return apiService.get(API_ENDPOINTS.INVENTORY.LIST, params);
  }

  async getProductInventory(productId) {
    return apiService.get(`${API_ENDPOINTS.INVENTORY.PRODUCT.replace(':productId', productId)}`);
  }

  async checkAvailability(productId, quantity) {
    return apiService.post('/inventory/check', { productId, quantity });
  }
}

export default new InventoryService();
