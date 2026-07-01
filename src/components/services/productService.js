import apiService from './apiService';

class ProductService {
  // Get all products
  async getProducts(params = {}) {
    try {
      const response = await apiService.get('/products', params);
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Get product by ID
  async getProductById(id) {
    try {
      const response = await apiService.get(`/products/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Get products by category
  async getProductsByCategory(categoryId, params = {}) {
    try {
      const response = await apiService.get(`/products/category/${categoryId}`, params);
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Search products
  async searchProducts(query) {
    try {
      const response = await apiService.get('/products/search', { q: query });
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Get all categories
  async getCategories() {
    try {
      const response = await apiService.get('/products/categories');
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Get category by ID
  async getCategoryById(id) {
    try {
      const response = await apiService.get(`/categories/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  }
}

export default new ProductService();
