import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, shadow } from './theme';
import productService from './services/productService';

// Cart helpers (previously in CartScreen)
const CART_KEY = 'dealer_cart';
const loadCart = async () => {
  try {
    const raw = await AsyncStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};
const saveCart = async (cart) => {
  try {
    await AsyncStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch { /* ignore */ }
};

// Check if product can be added to cart
const isProductOrderable = (product) => {
  if (!product) return false;
  const price = typeof product.price === 'string'
    ? parseFloat(product.price.replace(/[^0-9.]/g, ''))
    : (product.price || 0);
  return price > 0 && (product.stock || 0) > 0;
};

function CategoryPage({ onBack, onCartPress }) {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // qty stepper state: { [productId]: qty }
  const [qtyMap, setQtyMap] = useState({});
  // cart item count badge
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    fetchData();
    refreshCartCount();
  }, []);

  const refreshCartCount = async () => {
    const cart = await loadCart();
    setCartCount(cart.length);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const catResponse = await productService.getCategories();
      if (catResponse && catResponse.success) {
        const normalizedCategories = (catResponse.data || []).map(cat => ({
          ...cat,
          id: cat._id || cat.id,
        }));
        setCategories(normalizedCategories);
        // Fetch all products after categories load
        await fetchAllProducts();
      }
    } catch (error) {
      console.error('Fetch categories error:', error);
      Alert.alert('Error', 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllProducts = async () => {
    try {
      setProductsLoading(true);
      const prodResponse = await productService.getProducts({ limit: 100 });
      if (prodResponse && prodResponse.success) {
        const normalizedProducts = (prodResponse.data || []).map(prod => ({
          ...prod,
          id: prod._id || prod.id,
        }));
        setProducts(normalizedProducts);
        // Init qty map: default to MOQ for each product
        const initQty = {};
        normalizedProducts.forEach(p => {
          initQty[p.id] = p.moq || 1;
        });
        setQtyMap(initQty);
      }
    } catch (error) {
      console.error('Fetch products error:', error);
    } finally {
      setProductsLoading(false);
    }
  };

  const fetchProductsByCategory = async (category) => {
    try {
      setProductsLoading(true);
      if (!category) {
        await fetchAllProducts();
        return;
      }
      const prodResponse = await productService.getProducts({
        category: category.name,
        limit: 100,
      });
      if (prodResponse && prodResponse.success) {
        const normalizedProducts = (prodResponse.data || []).map(prod => ({
          ...prod,
          id: prod._id || prod.id,
        }));
        setProducts(normalizedProducts);
        const initQty = {};
        normalizedProducts.forEach(p => {
          initQty[p.id] = p.moq || 1;
        });
        setQtyMap(prev => ({ ...prev, ...initQty }));
      }
    } catch (error) {
      console.error('Fetch products by category error:', error);
    } finally {
      setProductsLoading(false);
    }
  };

  const handleCategorySelect = (category) => {
    const normalizedCategory = category ? {
      ...category,
      id: category._id || category.id,
    } : null;
    setSelectedCategory(normalizedCategory);
    fetchProductsByCategory(normalizedCategory);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    await refreshCartCount();
    setRefreshing(false);
  };

  // Qty stepper handlers
  const increaseQty = (product) => {
    const moq = product.moq || 1;
    const maxStock = product.stock || 9999;
    setQtyMap(prev => ({
      ...prev,
      [product.id]: Math.min((prev[product.id] || moq) + moq, maxStock),
    }));
  };

  const decreaseQty = (product) => {
    const moq = product.moq || 1;
    setQtyMap(prev => ({
      ...prev,
      [product.id]: Math.max((prev[product.id] || moq) - moq, moq),
    }));
  };

  const handleAddToCart = async (product) => {
    if (!isProductOrderable(product)) return;
    try {
      const cart = await loadCart();
      const qty = qtyMap[product.id] || product.moq || 1;
      const price = typeof product.price === 'string'
        ? parseFloat(product.price.replace(/[^0-9.]/g, ''))
        : (product.price || 0);

      const existingIdx = cart.findIndex(i => i.id === product.id);
      if (existingIdx >= 0) {
        // Already in cart — increase qty (capped at stock)
        const newQty = Math.min(cart[existingIdx].quantity + qty, product.stock || 9999);
        cart[existingIdx] = { ...cart[existingIdx], quantity: newQty };
      } else {
        cart.push({
          id: product.id,
          name: product.name,
          sku: product.sku || '—',
          category: product.category || 'Uncategorized',
          price: price,
          gst: product.gst || 0,
          moq: product.moq || 1,
          stock: product.stock || 0,
          quantity: qty,
        });
      }
      await saveCart(cart);
      setCartCount(cart.length);
      Alert.alert('Added to Cart', `${product.name} (×${qty}) added to cart.`, [
        { text: 'Continue', style: 'cancel' },
        { text: 'View Cart', onPress: () => onCartPress && onCartPress() },
      ]);
    } catch (err) {
      console.error('Add to cart error:', err);
      Alert.alert('Error', 'Could not add to cart. Please try again.');
    }
  };

  const getIconForCategory = (name) => {
    if (!name) return 'tag';
    const lower = name.toLowerCase();
    if (lower.includes('coconut')) return 'water';
    if (lower.includes('oil')) return 'bottle-tonic';
    if (lower.includes('comforter') || lower.includes('bedding')) return 'bed';
    if (lower.includes('food')) return 'package-variant';
    if (lower.includes('oem') || lower.includes('brand')) return 'factory';
    if (lower.includes('sesame')) return 'seed';
    if (lower.includes('ground') || lower.includes('peanut')) return 'peanut';
    if (lower.includes('textile') || lower.includes('fabric')) return 'tshirt-crew';
    return 'tag';
  };

  const getStockColor = (stockStatus) => {
    switch (stockStatus) {
      case 'In Stock':   return '#1D9E75';
      case 'Low Stock':  return '#BA7517';
      case 'Out of Stock': return '#F44336';
      default:           return '#9E9E9E';
    }
  };

  const filteredProducts = searchQuery
    ? products.filter(p => {
        if (!p) return false;
        const name = (p.name || '').toLowerCase();
        const sku  = (p.sku  || '').toLowerCase();
        const q = searchQuery.toLowerCase();
        return name.includes(q) || sku.includes(q);
      })
    : products;

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.red} />
        <Text style={{ marginTop: 16, color: colors.muted }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Navigation Bar */}
      <View style={styles.topNav}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.topNavTitle}>Category</Text>
        <Pressable onPress={() => onCartPress && onCartPress()} style={styles.cartBtn}>
          <Icon name="cart-outline" size={24} color="#FFFFFF" />
          {cartCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Horizontal Category Chips */}
      <View style={styles.chipsSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContainer}
        >
          <Pressable
            style={[styles.chip, !selectedCategory && styles.chipActive]}
            onPress={() => handleCategorySelect(null)}
          >
            <Text style={[styles.chipText, !selectedCategory && styles.chipTextActive]}>
              All
            </Text>
          </Pressable>
          {categories.map((category) => {
            if (!category) return null;
            const isActive = selectedCategory?.id === category.id;
            return (
              <Pressable
                key={category.id || Math.random()}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => handleCategorySelect(category)}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {category.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBox}>
          <Icon name="magnify" size={20} color={colors.muted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search products by name or SKU..."
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.red]} />
        }
        style={styles.scrollView}
      >
        {/* Category Grid */}
        {!searchQuery && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <View style={styles.categoryGrid}>
              {categories.map((category) => {
                if (!category) return null;
                const isActive = selectedCategory?.id === category.id;
                return (
                  <Pressable
                    key={category.id || Math.random()}
                    style={[styles.categoryCard, isActive && styles.categoryCardActive]}
                    onPress={() => handleCategorySelect(category)}
                  >
                    <View style={[styles.categoryIconWrap, isActive && styles.categoryIconWrapActive]}>
                      <Icon
                        name={getIconForCategory(category.name)}
                        size={32}
                        color={isActive ? '#FFFFFF' : colors.red}
                      />
                    </View>
                    <Text style={[styles.categoryName, isActive && styles.categoryNameActive]}>
                      {category.name}
                    </Text>
                    {category.productCount > 0 && (
                      <Text style={styles.categoryCount}>{category.productCount} items</Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Products Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {selectedCategory ? `${selectedCategory.name} Products` : 'All Products'}{' '}
            <Text style={styles.sectionCount}>({filteredProducts.length})</Text>
          </Text>

          {productsLoading ? (
            <View style={{ padding: 30, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={colors.red} />
            </View>
          ) : filteredProducts.length === 0 ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Icon name="package-variant-closed" size={48} color={colors.muted} />
              <Text style={{ marginTop: 16, color: colors.muted, fontSize: 14 }}>No products found</Text>
            </View>
          ) : (
            filteredProducts.map((product) => {
              if (!product) return null;
              const orderable = isProductOrderable(product);
              const qty = qtyMap[product.id] || product.moq || 1;
              const moq = product.moq || 1;
              const maxStock = product.stock || 0;
              const price = typeof product.price === 'string'
                ? parseFloat(product.price.replace(/[^0-9.]/g, ''))
                : (product.price || 0);
              const hasPrice = price > 0;
              const hasStock = maxStock > 0;
              const catName = product.category || 'Uncategorized';

              return (
                <View key={product.id || Math.random()} style={styles.productCard}>
                  {/* Product icon + info */}
                  <View style={styles.productTop}>
                    <View style={styles.productIconWrap}>
                      <Icon name="package-variant" size={28} color={colors.red} />
                    </View>
                    <View style={styles.productInfo}>
                      <Text style={styles.productName} numberOfLines={2}>{product.name || 'Product'}</Text>
                      <Text style={styles.productSku}>SKU: {product.sku || '—'}</Text>
                      <View style={styles.categoryChip}>
                        <Icon name="tag-outline" size={10} color={colors.muted} />
                        <Text style={styles.categoryChipText}>{catName}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Price row */}
                  <View style={styles.priceRow}>
                    <View>
                      {hasPrice ? (
                        <Text style={styles.productPrice}>₹{price.toLocaleString('en-IN')}</Text>
                      ) : (
                        <Text style={styles.noPriceText}>Price not available</Text>
                      )}
                      <Text style={styles.productMoq}>MOQ: {moq} units</Text>
                    </View>
                    <Text style={[styles.productStock, { color: getStockColor(product.stockStatus) }]}>
                      {product.stockStatus || (hasStock ? 'In Stock' : 'Out of Stock')}: {maxStock}
                    </Text>
                  </View>

                  {/* Disabled reason chips */}
                  {!hasPrice && (
                    <View style={styles.warningChip}>
                      <Icon name="information-outline" size={12} color="#E65100" />
                      <Text style={styles.warningText}>Price update pending — cannot order</Text>
                    </View>
                  )}
                  {hasPrice && !hasStock && (
                    <View style={styles.warningChip}>
                      <Icon name="alert-outline" size={12} color="#B71C1C" />
                      <Text style={[styles.warningText, { color: '#B71C1C' }]}>Out of stock — cannot order</Text>
                    </View>
                  )}

                  {/* Qty stepper + Add to Cart */}
                  {orderable && (
                    <View style={styles.actionRow}>
                      <View style={styles.stepper}>
                        <Pressable
                          style={styles.stepBtn}
                          onPress={() => decreaseQty(product)}
                          disabled={qty <= moq}
                        >
                          <Icon name="minus" size={14} color={qty <= moq ? '#BDBDBD' : colors.red} />
                        </Pressable>
                        <Text style={styles.stepQty}>{qty}</Text>
                        <Pressable
                          style={styles.stepBtn}
                          onPress={() => increaseQty(product)}
                          disabled={qty >= maxStock}
                        >
                          <Icon name="plus" size={14} color={qty >= maxStock ? '#BDBDBD' : colors.red} />
                        </Pressable>
                      </View>
                      <Pressable style={styles.addBtn} onPress={() => handleAddToCart(product)}>
                        <Icon name="cart-plus" size={16} color="#FFF" />
                        <Text style={styles.addBtnText}>Add to Cart</Text>
                      </Pressable>
                    </View>
                  )}

                  {/* Disabled Add to Cart button for non-orderable */}
                  {!orderable && (
                    <View style={styles.actionRow}>
                      <View style={[styles.addBtn, styles.addBtnDisabled, { flex: 1 }]}>
                        <Icon name="cart-off" size={16} color="#9E9E9E" />
                        <Text style={[styles.addBtnText, { color: '#9E9E9E' }]}>
                          {!hasPrice ? 'No Price' : 'Out of Stock'}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
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
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  topNavTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  cartBtn: { position: 'relative', padding: 4 },
  cartBadge: {
    position: 'absolute', top: -2, right: -4,
    backgroundColor: '#FFC107', borderRadius: 9,
    minWidth: 18, height: 18,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  cartBadgeText: { color: '#000', fontSize: 10, fontWeight: '900' },
  chipsSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  chipsContainer: { paddingHorizontal: 20, gap: 10 },
  chip: {
    paddingHorizontal: 18, paddingVertical: 9,
    borderRadius: 20, backgroundColor: '#F5F5F5',
    borderWidth: 1, borderColor: '#E0E0E0',
  },
  chipActive: { backgroundColor: colors.red, borderColor: colors.red },
  chipText: { color: '#666', fontSize: 13, fontWeight: '700' },
  chipTextActive: { color: '#FFFFFF' },
  searchSection: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF' },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F5F5F5', borderRadius: 14,
    paddingHorizontal: 14, height: 46,
    borderWidth: 1, borderColor: '#E0E0E0',
  },
  searchInput: { flex: 1, color: '#212529', fontSize: 14, marginLeft: 10 },
  scrollView: { flex: 1 },
  section: { paddingHorizontal: 16, marginBottom: 20, marginTop: 16 },
  sectionTitle: { color: '#212529', fontSize: 17, fontWeight: '900', marginBottom: 12 },
  sectionCount: { color: colors.muted, fontWeight: '600', fontSize: 14 },

  // Category grid
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  categoryCard: {
    width: '47%', backgroundColor: '#FFF',
    borderRadius: 16, borderWidth: 1, borderColor: '#E8E8E8',
    padding: 14, alignItems: 'center', ...shadow,
  },
  categoryCardActive: { borderColor: colors.red, borderWidth: 2 },
  categoryIconWrap: {
    width: 60, height: 60, borderRadius: 14,
    backgroundColor: 'rgba(198,40,40,0.08)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  categoryIconWrapActive: { backgroundColor: colors.red },
  categoryName: { color: '#212529', fontSize: 14, fontWeight: '800', textAlign: 'center' },
  categoryNameActive: { color: colors.red },
  categoryCount: { color: colors.muted, fontSize: 10, marginTop: 3 },

  // Product card
  productCard: {
    backgroundColor: '#FFF', borderRadius: 16,
    borderWidth: 1, borderColor: '#E8E8E8',
    padding: 14, marginBottom: 12, ...shadow,
  },
  productTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  productIconWrap: {
    width: 52, height: 52, borderRadius: 12,
    backgroundColor: 'rgba(198,40,40,0.08)',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  productInfo: { flex: 1 },
  productName: { color: '#212529', fontSize: 14, fontWeight: '800', marginBottom: 4 },
  productSku: { color: '#868E96', fontSize: 11, marginBottom: 4 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  categoryChipText: { color: '#868E96', fontSize: 10 },
  priceRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-end', marginBottom: 6,
  },
  productPrice: { color: colors.red, fontSize: 18, fontWeight: '900' },
  noPriceText: { color: '#9E9E9E', fontSize: 13, fontStyle: 'italic' },
  productMoq: { color: '#868E96', fontSize: 11, marginTop: 2 },
  productStock: { fontSize: 12, fontWeight: '700' },
  warningChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#FFF3E0', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
    marginBottom: 8, alignSelf: 'flex-start',
  },
  warningText: { fontSize: 11, color: '#E65100', fontWeight: '600' },

  // Qty stepper + add button
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  stepper: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: colors.red, borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 6,
  },
  stepBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(198,40,40,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  stepQty: { color: '#212529', fontSize: 14, fontWeight: '900', minWidth: 28, textAlign: 'center' },
  addBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
    backgroundColor: colors.red, borderRadius: 10,
    paddingVertical: 10,
  },
  addBtnDisabled: { backgroundColor: '#F0F0F0' },
  addBtnText: { color: '#FFF', fontSize: 13, fontWeight: '800' },
});

export default CategoryPage;
