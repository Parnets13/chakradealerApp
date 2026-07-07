/**
 * OrdersPage.js — React Native
 * "My Orders" screen for the dealer app.
 * Wraps OrderManagementSection and exports status constants
 * used by TrackOrderPage.
 */
import React from 'react';
import OrderManagementSection from './OrderManagementSection';

// ─── Status constants (used by TrackOrderPage) ────────────────────────────────
export const ALL_STATUSES = [
  'All',
  'Order Placed',
  'Pending Approval',
  'Approved',
  'Rejected',
  'Picking Started',
  'Picking Completed',
  'Sorting Started',
  'Sorting Completed',
  'Packing Started',
  'Packing Completed',
  'Invoice Generated',
  'Ready for Dispatch',
  'Dispatched',
  'In Transit',
  'Delivered',
  'Cancelled',
];

export const STATUS_STYLE = {
  'Order Placed':       { color: '#10B981', bg: '#D1FAE5' },
  'Pending Approval':   { color: '#F59E0B', bg: '#FEF3C7' },
  'Approved':           { color: '#3B82F6', bg: '#DBEAFE' },
  'Rejected':           { color: '#EF4444', bg: '#FEE2E2' },
  'Picking Started':    { color: '#8B5CF6', bg: '#EDE9FE' },
  'Picking Completed':  { color: '#6D28D9', bg: '#EDE9FE' },
  'Sorting Started':    { color: '#06B6D4', bg: '#CFFAFE' },
  'Sorting Completed':  { color: '#0891B2', bg: '#CFFAFE' },
  'Packing Started':    { color: '#0EA5E9', bg: '#E0F2FE' },
  'Packing Completed':  { color: '#0284C7', bg: '#E0F2FE' },
  'Invoice Generated':  { color: '#059669', bg: '#D1FAE5' },
  'Ready for Dispatch': { color: '#F97316', bg: '#FFEDD5' },
  'Dispatched':         { color: '#EA580C', bg: '#FFEDD5' },
  'In Transit':         { color: '#F97316', bg: '#FFEDD5' },
  'Delivered':          { color: '#10B981', bg: '#D1FAE5' },
  'Cancelled':          { color: '#EF4444', bg: '#FEE2E2' },
};

// ─── Screen component ─────────────────────────────────────────────────────────
// Props passed through:
//   onBack                  — go back to home
//   onNavigateToDispatch(orderId)  — opens Track & Dispatch screen for the given order
export default function OrdersPage(props) {
  return <OrderManagementSection {...props} />;
}