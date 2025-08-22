// screens/CreatePlantScreen.js
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

const BASE_URL = "http://192.168.150.59:3000";
const API_PLANTS_BY_USER = (id, extra = "") => `${BASE_URL}/api/plants/user/${id}${extra}`;
const API_PLANT = (id) => `${BASE_URL}/api/plants/${id}`;
const API_PLANT_SALE = (id) => `${BASE_URL}/api/plants/${id}/sale`;
const API_PLANT_STOCK = (id) => `${BASE_URL}/api/plants/${id}/stock`;

const toImg = (p) =>
  p?.image ? `${BASE_URL}/images/${encodeURIComponent(p.image)}` : "https://picsum.photos/seed/plantio/300";

export default function CreatePlantScreen({ navigation }) {
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [plants, setPlants] = useState([]);

  const [prices, setPrices] = useState({});      // { [plantId]: "99" }
  const [stocks, setStocks] = useState({});      // { [plantId]: "10" }

  const [savingId, setSavingId] = useState(null);
  const [savingStockId, setSavingStockId] = useState(null);

  // (opsiyonel) auth token
  const [token, setToken] = useState(null);

  const loadUser = useCallback(async () => {
    try {
      const rawUser = await AsyncStorage.getItem("user");
      const u = rawUser ? JSON.parse(rawUser) : null;
      if (u?._id) setUserId(u._id);
      const idOnly = await AsyncStorage.getItem("userId");
      if (!u?._id && idOnly) setUserId(idOnly);

      const t = await AsyncStorage.getItem("token");
      if (t) setToken(t);
    } catch {}
  }, []);

  const loadPlants = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const r = await fetch(API_PLANTS_BY_USER(userId, "?per_page=100"));
      const j = await r.json();
      const list = Array.isArray(j?.data) ? j.data : [];
      setPlants(list);

      // fiyat & stok inputlarını doldur
      const pInit = {};
      const sInit = {};
      list.forEach((p) => {
        if (typeof p?.price === "number") pInit[p._id] = String(p.price);
        if (typeof p?.stockCount === "number") sInit[p._id] = String(p.stockCount);
      });
      setPrices(pInit);
      setStocks(sInit);
    } catch (e) {
      Alert.alert("Error", "Could not load your plants.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    loadPlants();
  }, [loadPlants]);

  const onChangePrice = (id, val) => {
    const cleaned = val.replace(/[^0-9.]/g, "");
    setPrices((prev) => ({ ...prev, [id]: cleaned }));
  };

  const onChangeStock = (id, val) => {
    // sadece 0-9
    const cleaned = val.replace(/[^0-9]/g, "");
    setStocks((prev) => ({ ...prev, [id]: cleaned }));
  };

  const bumpStock = (id, delta) => {
    setStocks((prev) => {
      const cur = Number(prev[id] ?? 0);
      let next = cur + delta;
      if (next < 0) next = 0;
      return { ...prev, [id]: String(next) };
    });
  };

  const headers = () => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  const putOnSale = async (plant) => {
    const raw = prices[plant._id];
    const body = { forSale: true };

    // price opsiyonel
    if (raw !== undefined && raw !== "") {
      const num = Number(raw);
      if (Number.isNaN(num) || num < 0) {
        Alert.alert("Invalid price", "Please enter a non-negative price or leave it blank.");
        return;
      }
      body.price = num;
    }

    try {
      setSavingId(plant._id);

      // Önce yeni endpoint
      let r = await fetch(API_PLANT_SALE(plant._id), {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify(body),
      });

      // 404 ise fallback
      if (r.status === 404) {
        r = await fetch(API_PLANT(plant._id), {
          method: "PATCH",
          headers: headers(),
          body: JSON.stringify(body),
        });
      }

      if (!r.ok) {
        const t = await r.text();
        console.log("PUT ON SALE ERROR:", r.status, t);
        Alert.alert("Error", t || `Request failed (HTTP ${r.status})`);
        return;
      }

      const updated = await r.json();

      // local state güncelle
      setPlants((prev) =>
        prev.map((p) =>
          p._id === plant._id ? { ...p, forSale: true, price: body.price ?? p.price } : p
        )
      );

      // input’u da stabilize et
      if (typeof body.price === "number") {
        setPrices((prev) => ({ ...prev, [plant._id]: String(body.price) }));
      }

      Alert.alert("Success", "Your plant is now on sale!", [
        { text: "OK", onPress: () => navigation.navigate("StoreScreen") },
      ]);
    } catch (e) {
      console.log("PUT ON SALE CATCH:", e);
      Alert.alert("Error", e?.message || "Could not put the plant on sale.");
    } finally {
      setSavingId(null);
    }
  };

  const removeFromSale = async (plant) => {
    try {
      setSavingId(plant._id);

      const body = { forSale: false }; // fiyatı değiştirmiyoruz, yalnızca satıştan kaldır

      // Önce yeni endpoint
      let r = await fetch(API_PLANT_SALE(plant._id), {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify(body),
      });

      // 404 ise fallback
      if (r.status === 404) {
        r = await fetch(API_PLANT(plant._id), {
          method: "PATCH",
          headers: headers(),
          body: JSON.stringify(body),
        });
      }

      if (!r.ok) {
        const t = await r.text();
        console.log("REMOVE FROM SALE ERROR:", r.status, t);
        Alert.alert("Error", t || `Request failed (HTTP ${r.status})`);
        return;
      }

      await r.json();

      setPlants((prev) =>
        prev.map((p) => (p._id === plant._id ? { ...p, forSale: false } : p))
      );

      Alert.alert("Removed", "Your plant has been removed from sale.");
    } catch (e) {
      console.log("REMOVE FROM SALE CATCH:", e);
      Alert.alert("Error", e?.message || "Could not remove the plant from sale.");
    } finally {
      setSavingId(null);
    }
  };

  const saveStock = async (plant) => {
    const raw = stocks[plant._id];
    const n = Number(raw);
    if (Number.isNaN(n) || n < 0) {
      Alert.alert("Invalid stock", "Stock must be a non-negative integer.");
      return;
    }

    try {
      setSavingStockId(plant._id);

      const r = await fetch(API_PLANT_STOCK(plant._id), {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify({ stockCount: n }),
      });

      if (!r.ok) {
        const t = await r.text();
        console.log("SAVE STOCK ERROR:", r.status, t);
        Alert.alert("Error", t || `Request failed (HTTP ${r.status})`);
        return;
      }

      const updated = await r.json();

      // local state’te güncelle
      setPlants((prev) =>
        prev.map((p) => (p._id === plant._id ? { ...p, stockCount: n } : p))
      );

      Alert.alert("Saved", "Stock updated.");
    } catch (e) {
      console.log("SAVE STOCK CATCH:", e);
      Alert.alert("Error", e?.message || "Could not update stock.");
    } finally {
      setSavingStockId(null);
    }
  };

  const renderItem = ({ item }) => {
    const onSale = !!item?.forSale;
    const priceVal = prices[item._id] ?? "";
    const stockVal = stocks[item._id] ?? (typeof item?.stockCount === "number" ? String(item.stockCount) : "");

    const outOfStock = Number(stockVal || item?.stockCount || 0) <= 0;

    return (
      <View style={styles.card}>
        <Image source={{ uri: toImg(item) }} style={styles.photo} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>
            {item?.name || "Unnamed"}
          </Text>
          {!!item?.description && (
            <Text style={styles.desc} numberOfLines={2}>
              {item.description}
            </Text>
          )}

          {/* PRICE */}
          <View style={styles.priceRow}>
            <TextInput
              value={priceVal}
              onChangeText={(v) => onChangePrice(item._id, v)}
              placeholder="Price (optional)"
              keyboardType="decimal-pad"
              style={styles.priceInput}
            />
            <Text style={styles.currency}>$</Text>
          </View>

          {/* STOCK */}
          <View style={styles.stockRow}>
            <Text style={styles.stockLabel}>Stock</Text>

            <View style={styles.stockCtrls}>
              <TouchableOpacity
                style={styles.bumpBtn}
                onPress={() => bumpStock(item._id, -1)}
                activeOpacity={0.8}
              >
                <Ionicons name="remove" size={18} color="#214E34" />
              </TouchableOpacity>

              <TextInput
                value={String(stockVal)}
                onChangeText={(v) => onChangeStock(item._id, v)}
                placeholder="0"
                keyboardType="number-pad"
                style={styles.stockInput}
                maxLength={5}
              />

              <TouchableOpacity
                style={styles.bumpBtn}
                onPress={() => bumpStock(item._id, +1)}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={18} color="#214E34" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveStockBtn, savingStockId === item._id && { opacity: 0.7 }]}
                onPress={() => saveStock(item)}
                disabled={savingStockId === item._id}
                activeOpacity={0.9}
              >
                {savingStockId === item._id ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveStockText}>Save Stock</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Satışa koy / Güncelle */}
          <TouchableOpacity
            onPress={() => putOnSale(item)}
            style={[styles.saleBtn, onSale && styles.saleBtnAlt]}
            activeOpacity={0.9}
            disabled={savingId === item._id}
          >
            {savingId === item._id ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saleText}>{onSale ? "Update Sale" : "Put on Sale"}</Text>
            )}
          </TouchableOpacity>

          {/* Satıştan kaldır */}
          {onSale && (
            <TouchableOpacity
              onPress={() => removeFromSale(item)}
              style={[styles.removeBtn, savingId === item._id && { opacity: 0.7 }]}
              activeOpacity={0.9}
              disabled={savingId === item._id}
            >
              {savingId === item._id ? (
                <ActivityIndicator color="#d32f2f" />
              ) : (
                <Text style={styles.removeText}>Remove from Sale</Text>
              )}
            </TouchableOpacity>
          )}

          {/* Rozet */}
          <View style={[
            styles.badge,
            onSale ? styles.badgeOn : styles.badgeOff,
            outOfStock && styles.badgeWarn
          ]}>
            <Ionicons
              name={
                outOfStock
                  ? "alert-circle"
                  : onSale
                  ? "pricetag"
                  : "close-circle"
              }
              size={14}
              color={outOfStock ? "#b45309" : onSale ? "#2e7d32" : "#9e9e9e"}
            />
            <Text style={[
              styles.badgeText,
              outOfStock ? styles.badgeTextWarn : onSale ? styles.badgeTextOn : styles.badgeTextOff
            ]}>
              {outOfStock ? "Out of Stock" : onSale ? "Currently on Store" : "Not on Store"}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color="#214E34" />
        </TouchableOpacity>
        <Text style={styles.title}>Sell Your Plant</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#5B8E55" />
        </View>
      ) : (
        <FlatList
          data={plants}
          keyExtractor={(it) => it?._id?.toString?.() || Math.random().toString(36)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", color: "#777", marginTop: 20 }}>
              You don’t have any plants yet.
            </Text>
          }
        />
      )}
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
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E1EDE6",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "800", color: "#1a1a1a" },

  card: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#F6FAF6",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
  },
  photo: { width: 90, height: 95, borderRadius: 10, backgroundColor: "#eee" },
  name: { fontWeight: "800", color: "#1a1a1a" },
  desc: { color: "#666", marginTop: 4 },

  priceRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  priceInput: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E1EDE6",
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    color: "#1c1c1c",
  },
  currency: { fontWeight: "800", color: "#1a1a1a" },

  // STOCK
  stockRow: {
    marginTop: 10,
  },
  stockLabel: { fontWeight: "700", color: "#1a1a1a", marginBottom: 6 },
  stockCtrls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bumpBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E1EDE6",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  stockInput: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E1EDE6",
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    color: "#1c1c1c",
    textAlign: "center",
  },
  saveStockBtn: {
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#214E34",
    alignItems: "center",
    justifyContent: "center",
  },
  saveStockText: { color: "#fff", fontWeight: "800" },

  // SALE BUTTONS
  saleBtn: {
    marginTop: 10,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#5B8E55",
    alignItems: "center",
    justifyContent: "center",
  },
  saleBtnAlt: { backgroundColor: "#2e7d32" },
  saleText: { color: "#fff", fontWeight: "800" },

  removeBtn: {
    marginTop: 8,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#F5C2C7",
    backgroundColor: "#FFF5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  removeText: { color: "#d32f2f", fontWeight: "800" },

  // Badges
  badge: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  badgeOn: { backgroundColor: "#EAF4EF" },
  badgeOff: { backgroundColor: "#ECEFF1" },
  badgeWarn: { backgroundColor: "#FFF7ED" },
  badgeText: { fontWeight: "700", fontSize: 12 },
  badgeTextOn: { color: "#2e7d32" },
  badgeTextOff: { color: "#607D8B" },
  badgeTextWarn: { color: "#b45309" },
});