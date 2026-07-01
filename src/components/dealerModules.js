export const dealerModules = [
  {
    id: 'profile',
    shortTitle: 'Profile',
    title: 'Login & Profile Management',
    icon: 'account-circle',
    color: '#B74722',
    softColor: '#FFF0EA',
    summary: 'Secure login, profile, payment details, notification and language setup.',
    features: [
      {
        priority: 'required',
        title: 'Dealer login - mobile OTP or username/password',
        note: 'Role-based access so dealers only see their own data.',
      },
      {
        priority: 'required',
        title: 'Dealer profile - name, address, GST, and contact details',
        note: 'Allow profile updates after onboarding.',
      },
      {
        priority: 'important',
        title: 'Bank details & payment info update',
      },
      {
        priority: 'important',
        title: 'Notification preferences - SMS, email, app',
      },
      {
        priority: 'good',
        title: 'Multi-language support - Hindi / English',
      },
    ],
  },
  {
    id: 'orders',
    shortTitle: 'Orders',
    title: 'Order Placement & Management',
    icon: 'cart',
    color: '#0F766E',
    softColor: '#E7FAF5',
    summary: 'Catalogue, cart, bulk orders, dealer pricing and repeat order flows.',
    features: [
      {
        priority: 'required',
        title: 'Browse product catalogue - SKU, price, and image',
        note: 'Include category and brand filters.',
      },
      {
        priority: 'required',
        title: 'Place order - quantity selection, cart, and checkout',
      },
      {
        priority: 'required',
        title: 'Bulk order - Excel upload or large quantity entry',
        note: 'SOW 3.1 - Excel upload for bulk processing.',
      },
      {
        priority: 'required',
        title: 'Show dealer-specific pricing',
        note: 'Show GST separately with SOW 3.1 GST and base price fields.',
      },
      {
        priority: 'important',
        title: 'Order history - view past orders and reorder',
      },
      {
        priority: 'important',
        title: 'Custom packaging / branding request',
        note: 'SOW 3.5 - Custom packaging for corporate/bulk.',
      },
      {
        priority: 'good',
        title: 'Saved order templates - frequently ordered items',
      },
    ],
  },
  {
    id: 'inventory',
    shortTitle: 'Stock',
    title: 'Inventory & Stock Visibility',
    icon: 'package-variant',
    color: '#2563EB',
    softColor: '#EEF5FF',
    summary: 'Live stock, restock alerts, minimum stock and batch tracking.',
    features: [
      {
        priority: 'required',
        title: 'View real-time stock availability at SKU level',
        note: 'SOW 3.2 - Real-time inventory sync.',
      },
      {
        priority: 'required',
        title: 'Out of stock alert & expected restock date',
      },
      {
        priority: 'important',
        title: 'Minimum stock alert for dealer warehouse',
        note: 'SOW 3.2 - Minimum stock alerts and auto reorder.',
      },
      {
        priority: 'important',
        title: 'Batch number & expiry visibility',
        note: 'SOW 3.2 - Batch and barcode tracking.',
      },
      {
        priority: 'good',
        title: 'Dealer stock entry for secondary sales tracking',
      },
    ],
  },
  {
    id: 'dispatch',
    shortTitle: 'Dispatch',
    title: 'Dispatch & Delivery Tracking',
    icon: 'truck-delivery',
    color: '#EA580C',
    softColor: '#FFF3E8',
    summary: 'Order status, courier tracking, POD and delivery pendency.',
    features: [
      {
        priority: 'required',
        title: 'Order status tracking - confirmed to packed to delivered',
      },
      {
        priority: 'required',
        title: 'Courier tracking link - Delhivery / India Post AWB number',
        note: 'SOW 3.6 - Courier API integration.',
      },
      {
        priority: 'required',
        title: 'Show expected delivery date',
      },
      {
        priority: 'important',
        title: 'POD - view photo/signature proof',
        note: 'SOW 3.6 - POD digital capture.',
      },
      {
        priority: 'important',
        title: 'Pendency dashboard - identify blocked orders',
        note: 'SOW 3.6 - Pendency tracking dashboard.',
      },
      {
        priority: 'good',
        title: 'Delivery schedule calendar - upcoming deliveries',
      },
    ],
  },
  {
    id: 'returns',
    shortTitle: 'Returns',
    title: 'Returns & Complaints',
    icon: 'keyboard-return',
    color: '#7C3AED',
    softColor: '#F4EEFF',
    summary: 'Return request, complaint, transport status and credit note tracking.',
    features: [
      {
        priority: 'required',
        title: 'Raise return request - item, reason, and photo',
        note: 'SOW 3.7 - Material return tracking with docket ID.',
      },
      {
        priority: 'required',
        title: 'Track return status - pickup to in-transit to received',
        note: 'SOW 3.7 - Transport tracking.',
      },
      {
        priority: 'important',
        title: 'Credit note status after return approval',
        note: 'SOW 3.7 - Debit/Credit note reconciliation.',
      },
      {
        priority: 'important',
        title: 'Raise complaint - quality issue or short delivery',
      },
      {
        priority: 'good',
        title: 'Return history & credit note ledger',
      },
    ],
  },
  {
    id: 'finance',
    shortTitle: 'Ledger',
    title: 'Finance & Ledger',
    icon: 'cash',
    color: '#059669',
    softColor: '#EAF8F0',
    summary: 'Ledger, invoices, payment history, reminders and online payments.',
    features: [
      {
        priority: 'required',
        title: 'View ledger - outstanding amount and credit limit',
        note: 'SOW 3.8 - Real-time sync from Tally.',
      },
      {
        priority: 'required',
        title: 'Invoice download - PDF format with GST invoice',
        note: 'Auto-generated from Tally.',
      },
      {
        priority: 'required',
        title: 'Payment history with transaction timeline',
      },
      {
        priority: 'important',
        title: 'View credit note and debit note list',
        note: 'SOW 3.8 - Credit/Debit note reconciliation.',
      },
      {
        priority: 'important',
        title: 'Payment due reminder alerts',
        note: 'SOW 3.1 - Credit note alerts/reminders.',
      },
      {
        priority: 'good',
        title: 'Online payment option - UPI/bank transfer',
      },
    ],
  },
  {
    id: 'reports',
    shortTitle: 'Reports',
    title: 'Reports & Dashboard',
    icon: 'chart-bar',
    color: '#DB2777',
    softColor: '#FFF0F6',
    summary: 'Purchase analytics, top products, brand breakdown and demand planning.',
    features: [
      {
        priority: 'important',
        title: 'Purchase summary by month and quarter',
        note: 'SOW 3.13 - Sales analytics.',
      },
      {
        priority: 'important',
        title: 'Top products by order volume',
      },
      {
        priority: 'good',
        title: 'Brand-wise purchase breakdown',
        note: 'SOW 3.13 - Brand-wise revenue.',
      },
      {
        priority: 'good',
        title: 'Demand forecasting suggestions for next order planning',
        note: 'SOW 3.9 - Demand forecasting engine.',
      },
    ],
  },
];
