
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Image,
  TouchableOpacity,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

export default function CheckoutScreen({ navigation }) {
  const [items, setItems] = useState([]);

  const load = useCallback(async () => {  // Sepet verisini yükle 
    const raw = await AsyncStorage.getItem("cart");
    setItems(raw ? JSON.parse(raw) : []);
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener("focus", load);
    return unsub;
  }, [navigation, load]);

  const total = items.reduce((sum, it) => sum + (it.price || 0) * (it.qty || 1), 0);

  const removeItem = async (id) => {
    const next = items.filter((it) => (it.id?.toString?.() ?? it.id) !== id?.toString?.());
    await AsyncStorage.setItem("cart", JSON.stringify(next));
    setItems(next); // Sepetten silinen öğeyi güncelle 
  };

  const confirmRemove = (item) => {  // Sepetten öğe silme onayı 
    Alert.alert(
      "Remove Item",
      `Remove "${item.name}" from your cart?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: () => removeItem(item.id) },
      ],
      { cancelable: true }
    );
  };

  // BUY NOW: BuyNowScreen'e yönlendir
  const goToBuyNow = () => {
    navigation.navigate("BuyNowScreen");
  };

  const renderItem = ({ item }) => ( // Sepet öğelerini listele
    <View style={styles.row}>
      <Image source={{ uri: item.image }} style={styles.thumb} />
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.meta}>
          ${Number(item.price).toFixed(2)}  ×  {item.qty}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => confirmRemove(item)}
        style={styles.deleteBtn}
        activeOpacity={0.7}
      >
        <Ionicons name="trash-outline" size={18} color="#d32f2f" /> 
      </TouchableOpacity> 
    </View>  // Sepetten silme ikonu çöp
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header (only back button + title) */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color="#214E34" />
        </TouchableOpacity>
        <Text style={styles.title}>My Cart</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(it, i) => it.id?.toString?.() || String(i)}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.empty}>Your cart is empty.</Text>}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
      />

      <View style={styles.bottom}>
        <View style={{ flex: 1 }}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
        </View>
        <TouchableOpacity style={styles.payBtn} onPress={goToBuyNow} activeOpacity={0.9}>
          <Text style={styles.payText}>Buy Now</Text>
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
    width: 50,
    height: 50,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E1EDE6",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { flex: 1, textAlign: "center", fontSize: 20, fontWeight: "700", color: "#1a1a1a" },

  row: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
    alignItems: "center",
  },
  thumb: { width: 100, height: 100, borderRadius: 10, backgroundColor: "#f2f2f2" },
  name: { fontWeight: "700", color: "#1a1a1a", fontSize: 19 },
  meta: { marginTop: 4, color: "#2e7d32", fontWeight: "700", fontSize: 18 },

  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#F0D6D6",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF5F5",
  },

  empty: { textAlign: "center", marginTop: 24, color: "#777" },

  bottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 10,
    marginBottom: 26,
  },
  totalLabel: { color: "#777", fontWeight: "600", marginBottom: 4 },
  totalValue: { fontSize: 18, fontWeight: "800", color: "#1a1a1a" },
  payBtn: {
    backgroundColor: "#5B8E55",
    paddingHorizontal: 18,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  payText: { color: "#fff", fontWeight: "800" },
});