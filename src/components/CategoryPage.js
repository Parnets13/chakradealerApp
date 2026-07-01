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
import { colors, shadow } from './theme';
import productService from './services/productService';

function CategoryPage({ onBack }) {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (categories.length > 0 && products.length === 0) {
      fetchAllProducts();
    }
  }, [categories]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const catResponse = await productService.getCategories();
      if (catResponse && catResponse.success) {
        const normalizedCategories = (catResponse.data || []).map(cat => ({
          ...cat,
          id: cat._id || cat.id
        }));
        setCategories(normalizedCategories);
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
      const prodResponse = await productService.getProducts({ limit: 100 });
      if (prodResponse && prodResponse.success) {
        const normalizedProducts = (prodResponse.data || []).map(prod => ({
          ...prod,
          id: prod._id || prod.id
        }));
        setProducts(normalizedProducts);
      }
    } catch (error) {
      console.error('Fetch products error:', error);
    }
  };

  const fetchProductsByCategory = async (category) => {
    try {
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
          id: prod._id || prod.id
        }));
        setProducts(normalizedProducts);
      }
    } catch (error) {
      console.error('Fetch products by category error:', error);
    }
  };

  const handleCategorySelect = (category) => {
    // Make sure category uses _id as id
    const normalizedCategory = category ? {
      ...category,
      id: category._id || category.id
    } : null;
    setSelectedCategory(normalizedCategory);
    fetchProductsByCategory(normalizedCategory);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const getIconForCategory = (name) => {
    if (!name) return 'tag';
    const lower = name.toLowerCase();
    if (lower.includes('coconut')) return 'water';
    if (lower.includes('oil')) return 'bottle-tonic';
    if (lower.includes('food')) return 'package-variant';
    if (lower.includes('oem') || lower.includes('brand')) return 'factory';
    if (lower.includes('sesame')) return 'seed';
    if (lower.includes('ground') || lower.includes('peanut')) return 'peanut';
    return 'tag';
  };

  const getStockColor = (stockStatus) => {
    if (!stockStatus) return '#1D9E75';
    switch (stockStatus) {
      case 'In Stock':
        return '#1D9E75';
      case 'Low Stock':
        return '#BA7517';
      case 'Out of Stock':
        return '#F44336';
      default:
        return '#1D9E75';
    }
  };

  const filteredProducts = searchQuery
    ? products.filter((p) => {
        if (!p) return false;
        const name = p.name || '';
        const sku = p.sku || '';
        return (
          name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          sku.toLowerCase().includes(searchQuery.toLowerCase())
        );
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
        <Pressable>
          <Icon name="cart-outline" size={24} color="#FFFFFF" />
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
            <Text
              style={[
                styles.chipText,
                !selectedCategory && styles.chipTextActive,
              ]}
            >
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
                <Text
                  style={[
                    styles.chipText,
                    isActive && styles.chipTextActive,
                  ]}
                >
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
            placeholder="Search products..."
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
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.red]}
          />
        }
        style={styles.scrollView}
      >
        {/* Category Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <View style={styles.categoryGrid}>
            {categories.map((category) => {
              if (!category) return null;
              const isActive = selectedCategory?.id === category.id;
              return (
                <Pressable
                  key={category.id || Math.random()}
                  style={[
                    styles.categoryCard,
                    isActive && styles.categoryCardActive,
                  ]}
                  onPress={() => handleCategorySelect(category)}
                >
                  <View
                    style={[
                      styles.categoryIconWrap,
                      isActive && styles.categoryIconWrapActive,
                    ]}
                  >
                    <Icon
                      name={getIconForCategory(category.name)}
                      size={32}
                      color={isActive ? '#FFFFFF' : colors.red}
                    />
                  </View>
                  <Text
                    style={[
                      styles.categoryName,
                      isActive && styles.categoryNameActive,
                    ]}
                  >
                    {category.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Products Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {selectedCategory ? `${selectedCategory.name} Products` : 'All Products'}
            ({filteredProducts.length})
          </Text>
          {filteredProducts.length === 0 ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Icon name="package-variant-closed" size={48} color={colors.muted} />
              <Text style={{ marginTop: 16, color: colors.muted }}>No products found</Text>
            </View>
          ) : (
            filteredProducts.map((product) => {
              if (!product) return null;
              return (
                <View
                  key={product.id || Math.random()}
                  style={styles.productCard}
                >
                  <View style={styles.productIconWrap}>
                    <Icon name="package-variant" size={32} color={colors.red} />
                  </View>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>{product.name || 'Product'}</Text>
                    <Text style={styles.productSku}>SKU: {product.sku || 'N/A'}</Text>
                    <View style={styles.productMeta}>
                      <Text style={styles.productPrice}>₹{product.price || 0}</Text>
                      <Text style={styles.productMoq}>MOQ: {product.moq || 1}</Text>
                    </View>
                    <Text
                      style={[
                        styles.productStock,
                        { color: getStockColor(product.stockStatus) },
                      ]}
                    >
                      {product.stockStatus || 'In Stock'}: {product.stock || 0}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  topNavTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  chipsSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  chipsContainer: {
    paddingHorizontal: 20,
    gap: 10,
  },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipActive: {
    backgroundColor: colors.red,
    borderColor: colors.red,
  },
  chipText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
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
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
    marginTop: 16,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    alignItems: 'center',
    ...shadow,
  },
  categoryCardActive: {
    borderColor: colors.red,
    borderWidth: 2,
  },
  categoryIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: 'rgba(198, 40, 40, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  categoryIconWrapActive: {
    backgroundColor: colors.red,
  },
  categoryName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  categoryNameActive: {
    color: colors.red,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
    marginBottom: 10,
    ...shadow,
  },
  productIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: 'rgba(198, 40, 40, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  productSku: {
    color: colors.muted,
    fontSize: 11,
    marginBottom: 4,
  },
  productMeta: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  productPrice: {
    color: colors.red,
    fontSize: 15,
    fontWeight: '900',
  },
  productMoq: {
    color: colors.muted,
    fontSize: 11,
  },
  productStock: {
    fontSize: 11,
    fontWeight: '600',
  },
});

export default CategoryPage;
