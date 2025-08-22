import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

const fallbackImg = "https://picsum.photos/900/900"; // foto yoksa kullanılacak varsayılan resim

export default function PriceScreen({ route, navigation }) {
  const { plant, imageUrl, price: priceFromRoute } = route?.params || {};
  const uri =
    imageUrl ||
    plant?.imageUrl ||
    (typeof plant?.image === "string" ? plant.image : null) ||
    fallbackImg;

  const price =
    typeof priceFromRoute === "number"
      ? priceFromRoute
      : typeof plant?.price === "number"
      ? plant.price
      : 65;

  const [qty, setQty] = useState(1); // varsayılan miktar 1 + - işaretleri

  const addToCart = async () => {
    try {
      const key = "cart";
      const raw = await AsyncStorage.getItem(key);
      const list = raw ? JSON.parse(raw) : []; // mevcut sepet verisini al veya boş liste oluştur

      const id = plant?._id || plant?.id || String(Date.now());
      const existing = list.findIndex((x) => x.id === id);  //Sepette var mı diye findIndex ile kontrol edilir.

      if (existing >= 0) list[existing].qty += qty;  // varsa miktarı artırılır yoksa yeni ürün eklenir sepet kısmında 
      else
        list.push({
          id,
          name: plant?.name || "Unnamed",
          description: plant?.description || "",
          price,
          image: uri,
          qty,
          addedAt: Date.now(),
        });

      await AsyncStorage.setItem(key, JSON.stringify(list));
      Alert.alert("Added to Cart", "The product was added to your cart.");
    } catch (e) {
      Alert.alert("Error", "Could not add the product to your cart.");
    }
  };

  const buyNow = async () => {  // önce sepete eklenir sonra ödeme sayfasına yönlendirilir. 
    await addToCart();
    navigation.navigate("BuyNowScreen",);
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.iconBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={22} color="#214E34" />
        </TouchableOpacity>

        <Text style={styles.title} numberOfLines={1}>
          {plant?.name || "Product Detail"}
        </Text>

        {/* Cart icon -> payment/cart page */}
        <TouchableOpacity
          onPress={() => navigation.navigate("CheckoutScreen")}
          style={styles.iconBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="cart" size={20} color="#214E34" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Image */}
        <Image source={{ uri }} style={styles.hero} />

        {/* Info */}
        <View style={styles.content}>
          <Text style={styles.name}>{plant?.name || "Unnamed"}</Text>
          <Text style={styles.price}>${Number(price).toFixed(2)}</Text>

          <Text style={styles.desc}>
            {plant?.description?.trim() || "No description provided for this plant."}
          </Text>

          {/* Quantity (optional but handy) */}
          <View style={styles.qtyRow}>
            <Text style={styles.qtyLabel}>Quantity</Text>
            <View style={styles.qtyCtrl}>
              <TouchableOpacity
                onPress={() => setQty((q) => Math.max(1, q - 1))}  // Miktar 1'den az olamaz
                style={styles.qtyBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="remove" size={18} color="#214E34" />
              </TouchableOpacity>
              <Text style={styles.qtyVal}>{qty}</Text>
              <TouchableOpacity
                onPress={() => setQty((q) => q + 1)}  // Miktar artırma
                style={styles.qtyBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={18} color="#214E34" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom action bar  */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.cartBtn} onPress={addToCart} activeOpacity={0.85}>
          <Ionicons name="cart-outline" size={18} color="#fff" />
          <Text style={styles.cartText}>Add to Cart</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.buyBtn} onPress={buyNow} activeOpacity={0.9}>
          <Text style={styles.buyText}>Buy Now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E1EDE6",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "700", color: "#1a1a1a" },

  hero: { width: "100%", height: 340, backgroundColor: "#f2f5f2" },

  content: { paddingHorizontal: 20, paddingTop: 14 },
  name: { fontSize: 20, fontWeight: "800", color: "#1c1c1c" },
  price: { marginTop: 6, fontSize: 20, fontWeight: "700", color: "#2e7d32" },
  desc: { marginTop: 10, lineHeight: 20, color: "#3c3c3c", fontSize: 16 },

  qtyRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  qtyLabel: { fontWeight: "700", color: "#1c1c1c" },
  qtyCtrl: { flexDirection: "row", alignItems: "center", gap: 10 },
  qtyBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E1EDE6",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyVal: { minWidth: 24, textAlign: "center", fontWeight: "700", color: "#1c1c1c" },

  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#EDEDED",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cartBtn: {
    flex: 1,
    backgroundColor: "#5B8E55",
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 28,
  },
  cartText: { color: "#fff", fontWeight: "700" },
  buyBtn: {
    width: 120,
    backgroundColor: "#2e7d32",
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  buyText: { color: "#fff", fontWeight: "800" },
});