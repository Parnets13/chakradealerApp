import React, {useState, useEffect} from 'react';
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
import {colors, shadow} from './theme';
import productService from './services/productService';
import orderService from './services/orderService';

function PlaceOrderPage({onBack}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await productService.getProducts({ 
        inStock: 'true',
        limit: 100 
      });
      if (response.success) {
        setProducts(response.data || []);
      } else {
        Alert.alert('Error', response.message);
      }
    } catch (error) {
      console.error('Fetch products error:', error);
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProducts();
    setRefreshing(false);
  };

  const addToCart = (product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      setCart(cart.map(item =>
        item.id === product.id
          ? {...item, quantity: item.quantity + product.moq}
          : item
      ));
    } else {
      setCart([...cart, {...product, quantity: product.moq}]);
    }
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      setCart(cart.filter(item => item.id !== productId));
    } else {
      setCart(cart.map(item =>
        item.id === productId ? {...item, quantity: newQuantity} : item
      ));
    }
  };

  const getTotalAmount = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const getTotalItems = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to cart first');
      return;
    }

    try {
      setPlacing(true);
      const orderItems = cart.map(item => ({
        productId: item.id,
        quantity: item.quantity
      }));

      const response = await orderService.createOrder({
        items: orderItems,
        deliveryAddress: 'Default Address',
        notes: 'Order from dealer app'
      });

      if (response.success) {
        Alert.alert(
          '✅ Order Placed!',
          `Order ${response.data.orderId || response.data.orderNumber} has been placed successfully.`,
          [
            {
              text: 'OK',
              onPress: () => {
                setCart([]);
                onBack();
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', response.message);
      }
    } catch (error) {
      console.error('Place order error:', error);
      Alert.alert('Error', error.message || 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  };

  const filteredProducts = searchQuery
    ? products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : products;

  if (loading) {
    return (
      <View style={[styles.container, {justifyContent: 'center', alignItems: 'center'}]}>
        <ActivityIndicator size="large" color={colors.red} />
        <Text style={{marginTop: 16, color: colors.muted}}>Loading products...</Text>
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
        <View style={styles.topNavCenter}>
          <Icon name="cart-plus" size={24} color="#FFFFFF" />
          <Text style={styles.topNavTitle}>Place Order</Text>
        </View>
        <View style={styles.cartBadgeWrap}>
          <Icon name="cart" size={24} color="#FFFFFF" />
          {cart.length > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cart.length}</Text>
            </View>
          )}
        </View>
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.red]} />
        }
        contentContainerStyle={styles.content}>
        {/* Products List */}
        <Text style={styles.sectionTitle}>Available Products ({products.length})</Text>
        {filteredProducts.length === 0 ? (
          <View style={{padding: 40, alignItems: 'center'}}>
            <Icon name="package-variant-closed" size={48} color={colors.muted} />
            <Text style={{marginTop: 16, color: colors.muted}}>No products found</Text>
          </View>
        ) : (
          filteredProducts.map(product => (
            <View key={product.id} style={styles.productCard}>
              <View style={styles.productIconWrap}>
                <Icon name="package-variant" size={32} color={colors.red} />
              </View>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productSku}>SKU: {product.sku}</Text>
                <View style={styles.productMeta}>
                  <Text style={styles.productPrice}>₹{product.price}</Text>
                  <Text style={styles.productMoq}>MOQ: {product.moq}</Text>
                </View>
                <Text style={styles.productStock}>In Stock: {product.stock}</Text>
              </View>
              <Pressable 
                style={styles.addBtn}
                onPress={() => addToCart(product)}>
                <Icon name="plus" size={20} color="#FFFFFF" />
              </Pressable>
            </View>
          ))
        )}

        {/* Cart Section */}
        {cart.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Your Cart ({cart.length} items)</Text>
            {cart.map(item => (
              <View key={item.id} style={styles.cartCard}>
                <View style={styles.cartInfo}>
                  <Text style={styles.cartName}>{item.name}</Text>
                  <Text style={styles.cartSku}>SKU: {item.sku}</Text>
                  <Text style={styles.cartPrice}>
                    ₹{item.price} × {item.quantity} = ₹{item.price * item.quantity}
                  </Text>
                </View>
                <View style={styles.quantityControl}>
                  <Pressable
                    style={styles.qtyBtn}
                    onPress={() => updateQuantity(item.id, item.quantity - item.moq)}>
                    <Icon name="minus" size={16} color={colors.red} />
                  </Pressable>
                  <Text style={styles.qtyText}>{item.quantity}</Text>
                  <Pressable
                    style={styles.qtyBtn}
                    onPress={() => updateQuantity(item.id, item.quantity + item.moq)}>
                    <Icon name="plus" size={16} color={colors.red} />
                  </Pressable>
                </View>
              </View>
            ))}

            {/* Order Summary */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Order Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Items:</Text>
                <Text style={styles.summaryValue}>{getTotalItems()} units</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Amount:</Text>
                <Text style={styles.summaryAmount}>₹{getTotalAmount().toLocaleString()}</Text>
              </View>
              <Pressable 
                style={styles.placeOrderBtn}
                onPress={handlePlaceOrder}
                disabled={placing}>
                {placing ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Icon name="check-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.placeOrderText}>Place Order</Text>
                  </>
                )}
              </Pressable>
            </View>
          </>
        )}
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
  topNavCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  topNavTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  cartBadgeWrap: {
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FFD700',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: colors.red,
    fontSize: 11,
    fontWeight: '900',
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
  content: {
    padding: 20,
    paddingTop: 8,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 12,
    marginTop: 8,
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
    color: '#1D9E75',
    fontSize: 11,
    fontWeight: '600',
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(198, 40, 40, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(198, 40, 40, 0.2)',
    padding: 12,
    marginBottom: 10,
  },
  cartInfo: {
    flex: 1,
  },
  cartName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  cartSku: {
    color: colors.muted,
    fontSize: 11,
    marginBottom: 4,
  },
  cartPrice: {
    color: colors.red,
    fontSize: 13,
    fontWeight: '700',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
    minWidth: 40,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.red,
    padding: 16,
    marginTop: 8,
  },
  summaryTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
  },
  summaryValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  summaryAmount: {
    color: colors.red,
    fontSize: 18,
    fontWeight: '900',
  },
  placeOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.red,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 12,
  },
  placeOrderText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
});

export default PlaceOrderPage;
