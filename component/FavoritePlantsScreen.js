import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

const BASE_URL = "http://192.168.150.59:3000";
const API_FAVORITES = `${BASE_URL}/api/favorites`;
const img = (filename) => `${BASE_URL}/images/${encodeURIComponent(filename || "")}`;

export default function FavoritePlantsScreen() {
  const navigation = useNavigation();
  const [favorites, setFavorites] = useState([]);
  const [authUserId, setAuthUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // girişli kullanıcıyı oku
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem("user");
        const user = raw ? JSON.parse(raw) : null;
        setAuthUserId(user?._id || null);
      } catch (e) {
        console.warn("user parse error", e);
      }
    })();
  }, []);

  // tüm favorileri getir
  useEffect(() => {
    const fetchFavorites = async () => {
      setLoadError(null);
      try {
        const res = await fetch(API_FAVORITES);
        const json = await res.json();
        if (res.ok && json.success && Array.isArray(json.data)) {
          setFavorites(json.data);
        } else {
          throw new Error(json.message || "Favoriler alınamadı");
        }
      } catch (err) {
        setLoadError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchFavorites();
  }, []);

  // Bitkiye göre grupla + sayıya göre AZALAN sırala (en çok favori en üstte)
  const groupedByPlant = useMemo(() => {
    const groupedMap = favorites.reduce((acc, fav) => {
      const plant = fav?.plantId;
      const user = fav?.userId;
      if (!plant?._id) return acc;

      if (!acc[plant._id]) acc[plant._id] = { plant, users: [] };

      // aynı kullanıcının aynı bitkiyi 2 kez favorilemesi durumunda tekilleştirmek istersen:
      // if (user && !acc[plant._id].users.some(u => u._id === user._id)) acc[plant._id].users.push(user);
      if (user) acc[plant._id].users.push(user);

      return acc;
    }, {});

    const grouped = Object.values(groupedMap);

    return grouped
      .filter((g) => g.users.length > 0)
      .sort((a, b) => b.users.length - a.users.length);
  }, [favorites]);

  const totalPlants = groupedByPlant.length;

  const renderItem = ({ item }) => {
    const plant = item.plant;
    const users = item.users || [];
    const count = users.length;

    // İlk 3 kullanıcıyı göster, fazlasını +N yap
    const topUsers = users.slice(0, 3);
    const extra = Math.max(count - topUsers.length, 0); // geriye kaç kişi kaldı?

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate("PlantInfoScreen", {
            plant,
            imageUrl: img(plant?.image),
          })
        }
      >
        {!!plant?.image && (
          <View style={styles.imageWrap}>
            <Image source={{ uri: img(plant.image) }} style={styles.image} />
            {/* Favori sayısı rozet */}
            <View style={styles.badge}>
              <Ionicons name="heart" size={14} color="#fff" />
              <Text style={styles.badgeText}>{count}</Text>
            </View>
          </View>
        )}

        <Text style={styles.title}>{plant?.name || "Unnamed Plant"}</Text>

        <View style={styles.favList}>
          <View style={styles.favHeaderRow}>
            <Text style={styles.favHeader}>Favorileyenler</Text>
            <View style={styles.countPill}>
              <Ionicons name="people" size={14} color="#2F5D3F" />
              <Text style={styles.countPillText}>{count}</Text>
            </View>
          </View>

          {topUsers.map((u) => (
            <Text key={u._id} style={styles.favUser}>
              • {u.firstName} {u.lastName}
              {authUserId && u._id === authUserId ? " (Sen)" : ""}
            </Text>
          ))}

          {/* 3'ten fazlası varsa +N satırı */}
          {extra > 0 && (
            <View style={styles.moreRow}>
              <View style={styles.plusPill}>
                <Text style={styles.plusText}>+{extra}</Text>
              </View>
              <Text style={styles.moreNote}>more</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };
// Favori bitki sayısı toplamı
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 6, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={styles.headerTitle}>Favoriler</Text>
        <Text style={styles.headerSubtitle}>
          {totalPlants > 0 ? `${totalPlants} bitki` : "—"}   
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#5B8E55" />
        </View>
      ) : loadError ? (
        <View style={styles.center}>
          <Text style={{ color: "#b00020", textAlign: "center" }}>
            Hata: {loadError}
          </Text>
        </View>
      ) : (
        <FlatList
          data={groupedByPlant}
          keyExtractor={(item) => item.plant?._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 15, paddingBottom: 90 }}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", color: "#666" }}>
              Henüz favori yok.
            </Text>
          }
        />
      )}

      {/* BOTTOM NAV */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate("FavoritePlantsScreen")}
        >
          <Ionicons name="heart-outline" size={28} color="#5B8E55" />
          <Ionicons name="heart" size={28} color="#5B8E55" style={{ position: "absolute", opacity: 0.9 }} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate("WeatherScreen")}
        >
          <Ionicons name="partly-sunny-outline" size={28} color="#5B8E55" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.centerButton}
          onPress={() => navigation.popToTop()}
        >
          <Ionicons name="home" size={32} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate("PeopleScreen")}
        >
          <Ionicons name="people-outline" size={28} color="#5B8E55" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate("StoreScreen")}
        >
          <Ionicons name="storefront-outline" size={28} color="#5B8E55" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },

  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2F5D3F",
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6a8c77",
  },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  card: {
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    alignItems: "center",
  },

  imageWrap: { width: "100%", borderRadius: 10, overflow: "hidden", marginBottom: 10 },
  image: { width: "100%", height: 170 },

  // Sağ üstte favori sayısı rozet
  badge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#2F5D3F",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 6,
  },
  badgeText: { color: "#fff", fontWeight: "800", fontSize: 12 },

  title: { fontSize: 18, fontWeight: "bold", color: "#333", marginBottom: 10 },

  favList: { width: "100%", backgroundColor: "#fff", borderRadius: 8, padding: 10 },

  favHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  favHeader: { fontSize: 14, fontWeight: "700", color: "#2F5D3F" },

  countPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#E9F3EC",
  },
  countPillText: { color: "#2F5D3F", fontWeight: "800", fontSize: 12 },

  favUser: { fontSize: 14, color: "#444", marginBottom: 4 },

  // "+N daha" satırı
  moreRow: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  plusPill: {
    backgroundColor: "#2F5D3F",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  plusText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  moreNote: { color: "#2F5D3F", fontWeight: "700", fontSize: 12 },

  /* ---- Bottom Nav ---- */
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    backgroundColor: "#fff",
  },
  navButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  centerButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#5B8E55",
    alignItems: "center",
    justifyContent: "center",
  },
});
