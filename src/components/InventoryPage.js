import React, {useState, useEffect} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {colors, shadow} from './theme';
import inventoryService from './services/inventoryService';

function InventoryPage({ onBack }) {
  const [showFilter, setShowFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState([
    { value: '0', label: 'Total SKU', color: colors.red },
    { value: '0', label: 'Critical Items', color: '#FFA726' },
    { value: '0', label: 'Warehouses', color: '#4CAF50' },
    { value: '0', label: 'Total Units', color: '#F44336' },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch inventory data
  const fetchInventoryData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('=== 📦 Fetching inventory from ADMIN PANEL ===');
      
      const response = await inventoryService.getInventoryStock();
      console.log('=== 📦 FULL Response from backend:', response);
      
      if (response.success) {
        const items = response.data || [];
        console.log('=== 📦 RAW Items from admin:', items.length, 'items');
        console.log('=== 📦 First item sample:', items[0]);
        
        // Map items for display - simple and robust
        const mappedProducts = items.map((item, index) => {
          // Get all possible name fields
          const name = item.name || item.itemName || item.productName || item.sku || 'Unknown Item';
          
          // Get all possible SKU fields
          const sku = item.sku || item.itemCode || item.itemId || `ITEM-${index}`;
          
          // Get quantity
          const qty = Number(item.qty || item.currentQuantity || item.total || item.available || 0);
          
          // Get warehouse
          const warehouse = item.warehouse || 'Main Warehouse';
          
          // Get category
          let categoryName = null;
          if (item.category && typeof item.category === 'object' && item.category.name) {
            categoryName = item.category.name;
          } else if (item.categoryName) {
            categoryName = item.categoryName;
          } else if (item.category && typeof item.category === 'string') {
            categoryName = item.category;
          }
          
          // Get admin status DIRECTLY - this is key!
          const adminStatus = item.status || 'Active';
          
          // Map to app display status
          let displayStatus = 'In Stock';
          let statusColor = '#4CAF50';
          
          if (adminStatus === 'Dead') {
            displayStatus = 'Out of Stock';
            statusColor = '#F44336';
          } else if (adminStatus === 'Critical') {
            displayStatus = 'Low Stock';
            statusColor = '#FFA726';
          } else if (adminStatus === 'Active') {
            displayStatus = 'In Stock';
            statusColor = '#4CAF50';
          }
          
          const mappedItem = {
            id: item._id || item.id || `item-${index}`,
            name,
            sku,
            stock: qty,
            warehouse,
            category: categoryName,
            status: displayStatus,
            statusColor,
            adminStatus // Store original admin status for filtering
          };
          
          console.log(`📦 Mapped item ${index}:`, { sku, name, adminStatus, displayStatus });
          return mappedItem;
        });
        
        console.log('=== 📦 Final mapped products:', mappedProducts.length, 'items');
        
        // Calculate stats
        console.log('=== 📊 Calculating stats from actual products ===');
        
        const totalSKU = mappedProducts.length;
        let criticalItems = 0;
        let totalUnits = 0;
        
        // Count unique warehouses from actual data (ignore 'Main Warehouse' fallback)
        const uniqueWarehouses = new Set();
        mappedProducts.forEach(item => {
          totalUnits += item.stock;
          if (item.adminStatus === 'Critical') criticalItems++;
          // Only count warehouse if it's a real name (not the fallback)
          if (item.warehouse && item.warehouse !== 'Main Warehouse') {
            uniqueWarehouses.add(item.warehouse);
          }
        });
        
        // Prefer backend-provided warehouse count (most accurate)
        // Fall back to unique count from items, then 1 if any items exist
        let warehousesCount = 0;
        if (response.statistics && response.statistics.warehouses) {
          warehousesCount = response.statistics.warehouses;
        } else if (uniqueWarehouses.size > 0) {
          warehousesCount = uniqueWarehouses.size;
        } else if (mappedProducts.length > 0) {
          warehousesCount = 1;
        }
        
        console.log('📊 Stats calculated:', { 
          totalSKU, 
          criticalItems, 
          totalUnits, 
          warehousesCount,
          uniqueWarehouses: Array.from(uniqueWarehouses)
        });
        
        setStats([
          { value: String(totalSKU), label: 'Total SKU', color: colors.red },
          { value: String(criticalItems), label: 'Critical Items', color: '#FFA726' },
          { value: String(warehousesCount), label: 'Warehouses', color: '#4CAF50' },
          { value: String(totalUnits), label: 'Total Units', color: '#F44336' },
        ]);
        
        setProducts(mappedProducts);
        console.log('✅ === Inventory loaded successfully! ===');
      } else {
        console.error('❌ Response not successful:', response);
        setError(response.message || 'Failed to load inventory');
      }
    } catch (error) {
      console.error('❌ Error fetching inventory:', error);
      setError(error.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  // Fetch on component mount
  useEffect(() => {
    fetchInventoryData();
  }, []);

  // Filter products based on active filter and search query
  const filteredProducts = products.filter(product => {
    // Apply search filter first
    const matchesSearch = 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Apply status filter - using adminStatus DIRECTLY!
    let matchesStatus = true;
    if (activeFilter === 'Active') {
      matchesStatus = product.adminStatus === 'Active';
    } else if (activeFilter === 'Critical') {
      matchesStatus = product.adminStatus === 'Critical';
    } else if (activeFilter === 'Dead') {
      matchesStatus = product.adminStatus === 'Dead';
    }
    
    return matchesSearch && matchesStatus;
  });

  return (
    <View style={styles.container}>
      {/* Top Navigation Bar */}
      <View style={styles.topNav}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#FFFFFF" />
        </Pressable>
        <View style={styles.topNavCenter}>
          <Text style={styles.topNavTitle}>Inventory</Text>
          <Icon name="package-variant" size={24} color="#FFFFFF" />
        </View>
        <Pressable 
          style={styles.filterButton}
          onPress={() => setShowFilter(!showFilter)}>
          <Icon name="filter-variant" size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBox}>
          <Icon name="magnify" size={20} color={colors.muted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search inventory..."
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={20} color={colors.muted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Filter Buttons Section */}
      <View style={styles.filterButtonsContainer}>
        <Pressable
          style={[
            styles.filterButtonItem,
            activeFilter === 'All' && styles.filterButtonActive
          ]}
          onPress={() => setActiveFilter('All')}
        >
          <Text style={[
            styles.filterButtonText,
            activeFilter === 'All' && styles.filterButtonTextActive
          ]}>
            All
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.filterButtonItem,
            activeFilter === 'Active' && styles.filterButtonActive,
            activeFilter === 'Active' && { backgroundColor: '#4CAF50' }
          ]}
          onPress={() => setActiveFilter('Active')}
        >
          <Text style={[
            styles.filterButtonText,
            activeFilter === 'Active' && styles.filterButtonTextActive
          ]}>
            Active
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.filterButtonItem,
            activeFilter === 'Critical' && styles.filterButtonActive,
            activeFilter === 'Critical' && { backgroundColor: '#FFA726' }
          ]}
          onPress={() => setActiveFilter('Critical')}
        >
          <Text style={[
            styles.filterButtonText,
            activeFilter === 'Critical' && styles.filterButtonTextActive
          ]}>
            Critical
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.filterButtonItem,
            activeFilter === 'Dead' && styles.filterButtonActive,
            activeFilter === 'Dead' && { backgroundColor: '#F44336' }
          ]}
          onPress={() => setActiveFilter('Dead')}
        >
          <Text style={[
            styles.filterButtonText,
            activeFilter === 'Dead' && styles.filterButtonTextActive
          ]}>
            Dead
          </Text>
        </Pressable>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsSection}>
        {stats.map((stat, index) => (
          <View key={index} style={styles.statBox}>
            <Text style={[styles.statValue, {color: stat.color}]}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Loading State */}
      {loading && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.red} />
          <Text style={styles.loadingText}>Loading inventory...</Text>
        </View>
      )}

      {/* Error State */}
      {error && !loading && (
        <View style={styles.centerContainer}>
          <Icon name="alert-circle" size={48} color={colors.red} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={fetchInventoryData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {/* Inventory List */}
      {!loading && !error && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}>
          {filteredProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
          {filteredProducts.length === 0 && (
            <View style={styles.centerContainer}>
              <Icon name="package-variant-off" size={48} color={colors.muted} />
              <Text style={styles.emptyText}>No inventory items found</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function ProductCard({ product }) {
  console.log('🎴 Rendering ProductCard with product:', product);
  
  const getBorderColor = () => {
    if (product.status === 'In Stock') return '#4CAF50';
    if (product.status === 'Out of Stock') return '#F44336';
    if (product.status === 'Low Stock') return '#FFA726';
    return colors.line;
  };

  return (
    <View style={[styles.productCard, { borderLeftColor: getBorderColor() }]}>
      {/* Product Name and SKU in one row */}
      <View style={styles.cardHeader}>
        <Text style={styles.productName} numberOfLines={2}>{product.name || 'Unknown Item'}</Text>
        <Text style={styles.skuBadge}>{product.sku || 'N/A'}</Text>
      </View>

      {/* Category Row (only if category exists) */}
      {product.category && (
        <View style={styles.detailRow}>
          <Icon name="folder" size={16} color={colors.muted} />
          <Text style={styles.detailLabel}>Category :</Text>
          <Text style={styles.detailValue}>{product.category}</Text>
        </View>
      )}

      {/* Warehouse Row */}
      <View style={styles.detailRow}>
        <Icon name="warehouse" size={16} color={colors.muted} />
        <Text style={styles.detailLabel}>Warehouse :</Text>
        <Text style={styles.detailValue}>{product.warehouse || 'Main Warehouse'}</Text>
      </View>

      {/* Quantity Row */}
      <View style={styles.detailRow}>
        <Icon name="package-variant" size={16} color={colors.muted} />
        <Text style={styles.detailLabel}>Qty :</Text>
        <Text style={styles.detailValue}>{product.stock || 0}</Text>
      </View>

      {/* Status Row - Bottom with label on left, badge on right */}
      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>Status :</Text>
        <View style={[styles.statusBadge, { backgroundColor: (product.statusColor || '#4CAF50') + '20' }]}>
          <Text style={[styles.statusText, { color: product.statusColor || '#4CAF50' }]}>
            {product.status || 'In Stock'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    color: colors.muted,
    fontSize: 16,
    fontWeight: '500',
  },
  errorText: {
    marginTop: 16,
    color: colors.red,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: colors.red,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    marginTop: 16,
    color: colors.muted,
    fontSize: 16,
    fontWeight: '500',
  },
  // Filter Buttons Styles
  filterButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
    justifyContent: 'space-between',
  },
  filterButtonItem: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow,
    alignItems: 'center',
    minWidth: 70,
  },
  filterButtonActive: {
    borderColor: 'transparent',
    backgroundColor: colors.red,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  topNav: {
    backgroundColor: colors.red,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadow,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topNavCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  topNavLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topNavTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: colors.line,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    marginLeft: 10,
  },
  statsSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 4,
  },
  statLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  content: {
    padding: 20,
    paddingTop: 8,
    backgroundColor: '#FFFFFF',
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderLeftWidth: 5,
    ...shadow,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  productName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
    flex: 1,
  },
  skuBadge: {
    backgroundColor: '#F5F5F5',
    color: colors.muted,
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  stockSection: {
    marginBottom: 10,
  },
  stockLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  stockValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  detailLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  detailValue: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  statusLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '900',
  },
});

export default InventoryPage;
