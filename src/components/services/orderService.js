import apiService from './apiService';

class OrderService {
  // Get all orders
  async getOrders(params = {}) {
    try {
      const response = await apiService.get('/orders', params);
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Get order by ID
  async getOrderById(id) {
    try {
      const response = await apiService.get(`/orders/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Create new order
  async createOrder(orderData) {
    try {
      const response = await apiService.post('/orders/create', orderData);
      return response;
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

  // Track order
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
