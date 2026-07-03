import apiService from './apiService';

class OrderService {
  /**
   * Get all orders for the authenticated dealer.
   * Hits: GET /api/dealer/orders
   * Returns dealer-specific SalesOrders (filtered by dealerId/customer/erpClientId).
   */
  async getOrders(params = {}) {
    try {
      const response = await apiService.get('/orders', params);
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get order detail by orderId or mongodbId.
   * Hits: GET /api/dealer/orders/:id
   */
  async getOrderById(id) {
    try {
      const response = await apiService.get(`/orders/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create new order from cart items.
   * Hits: POST /api/dealer/orders/create
   * Passes idempotency key as header to prevent duplicate orders.
   */
  async createOrder(orderData, idempotencyKey) {
    try {
      const headers = idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {};
      return await apiService.request('/orders/create', {
        method: 'POST',
        body: orderData,
        headers,
      });
    } catch (error) {
      throw error;
    }
  }

  // Cancel order
  async cancelOrder(id, reason) {
    try {
      const response = await apiService.post(`/orders/${id}/cancel`, { reason });
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Track order — returns status + docket tracking info
  async trackOrder(id) {
    try {
      const response = await apiService.get(`/orders/${id}/track`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Get cart
  async getCart() {
    try {
      const response = await apiService.get('/cart');
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Add to cart
  async addToCart(productId, quantity) {
    try {
      const response = await apiService.post('/cart/add', { productId, quantity });
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Update cart item
  async updateCartItem(itemId, quantity) {
    try {
      const response = await apiService.put(`/cart/update/${itemId}`, { quantity });
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Remove from cart
  async removeFromCart(itemId) {
    try {
      const response = await apiService.delete(`/cart/remove/${itemId}`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Clear cart
  async clearCart() {
    try {
      const response = await apiService.delete('/cart/clear');
      return response;
    } catch (error) {
      throw error;
    }
  }
}

export default new OrderService();
