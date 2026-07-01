import { Platform } from 'react-native';

// ═══════════════════════════════════════════════════════════════
// DEALER APP API CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

// ────────────────────────────────────────────────────────────────
// OPTION 1: LOCAL BACKEND (For Development)
// ────────────────────────────────────────────────────────────────
// Use your computer's actual IP address: 192.168.1.21
// Find your IP: Run "ipconfig" on Windows, "ifconfig" on Mac/Linux
const LOCAL_BACKEND_URL = 'http://192.168.1.21:5000/api/dealer';

// ────────────────────────────────────────────────────────────────
// OPTION 2: PRODUCTION BACKEND (Always works)
// ────────────────────────────────────────────────────────────────
const PRODUCTION_BACKEND_URL = 'https://chakraindustries-backend.onrender.com/api/dealer';

// ────────────────────────────────────────────────────────────────
// SELECT WHICH BACKEND TO USE
// ────────────────────────────────────────────────────────────────
// Change this to switch between local and production
const USE_LOCAL_BACKEND = true;  // Set to false to use production

// Auto-select based on environment
const getApiBaseURL = () => {
  if (!isDev) {
    // Production build always uses production backend
    return PRODUCTION_BACKEND_URL;
  }
  
  // Development: Use selected backend
  if (USE_LOCAL_BACKEND) {
    console.log('📱 Using LOCAL backend:', LOCAL_BACKEND_URL);
    return LOCAL_BACKEND_URL;
  } else {
    console.log('📱 Using PRODUCTION backend:', PRODUCTION_BACKEND_URL);
    return PRODUCTION_BACKEND_URL;
  }
};

export const API_BASE_URL = getApiBaseURL();
export const API_TIMEOUT = 30000; // 30 seconds

// ────────────────────────────────────────────────────────────────
// CONFIGURATION LOGGING
// ────────────────────────────────────────────────────────────────
console.log('');
console.log('═══════════════════════════════════════════════════════════');
console.log('🔧 DEALER APP API CONFIGURATION');
console.log('═══════════════════════════════════════════════════════════');
console.log('📱 Platform:', Platform.OS);
console.log('🌍 Environment:', isDev ? 'DEVELOPMENT' : 'PRODUCTION');
console.log('🔗 Backend:', USE_LOCAL_BACKEND ? 'LOCAL' : 'PRODUCTION');
console.log('📡 API URL:', API_BASE_URL);
console.log('⏱️  Timeout:', API_TIMEOUT / 1000, 'seconds');
console.log('═══════════════════════════════════════════════════════════');
console.log('');

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    SEND_OTP: '/auth/send-otp',
    VERIFY_OTP: '/auth/verify-otp',
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    ME: '/auth/me'
  },
  
  // Profile & Dashboard
  PROFILE: {
    DASHBOARD: '/profile/dashboard',
    GET: '/profile',
    UPDATE: '/profile/update'
  },
  
  // Products
  PRODUCTS: {
    LIST: '/products',
    DETAILS: '/products/:id',
    CATEGORIES: '/products/categories',
    SEARCH: '/products/search'
  },
  
  // Cart
  CART: {
    GET: '/cart',
    ADD: '/cart/add',
    UPDATE: '/cart/update/:itemId',
    REMOVE: '/cart/remove/:itemId',
    CLEAR: '/cart/clear'
  },
  
  // Orders
  ORDERS: {
    LIST: '/orders',
    CREATE: '/orders/create',
    DETAILS: '/orders/:id',
    CANCEL: '/orders/:id/cancel',
    TRACK: '/orders/:id/track'
  },
  
  // Inventory
  INVENTORY: {
    LIST: '/inventory',
    STOCK: '/inventory/stock',
    PRODUCT: '/inventory/product/:productId'
  },
  
  // Invoices
  INVOICES: {
    LIST: '/invoices',
    DETAILS: '/invoices/:id',
    DOWNLOAD: '/invoices/:id/download'
  },
  
  // Returns
  RETURNS: {
    LIST: '/returns',
    CREATE: '/returns/create',
    DETAILS: '/returns/:id',
    TRACK: '/returns/:id/track'
  },
  
  // Dispatch & Tracking
  DISPATCH: {
    LIST: '/dispatch',
    TRACK: '/dispatch/:id/track'
  },
  
  // Reports
  REPORTS: {
    DASHBOARD: '/reports/dashboard',
    SALES: '/reports/sales',
    INVENTORY: '/reports/inventory'
  }
};
