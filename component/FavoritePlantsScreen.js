// screens/FavoritePlantsScreen.js
import React, { useEffect, useState } from "react";
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

  const groupedByPlant = Object.values(
    favorites.reduce((acc, fav) => {
      const plant = fav?.plantId;
      const user = fav?.userId;
      if (!plant?._id) return acc;
      if (!acc[plant._id]) acc[plant._id] = { plant, users: [] };
      if (user) acc[plant._id].users.push(user);
      return acc;
    }, {})
  );

  const renderItem = ({ item }) => {
    const plant = item.plant;
    const users = item.users || [];

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
          <Image source={{ uri: img(plant.image) }} style={styles.image} />
        )}
        <Text style={styles.title}>{plant?.name || "Unnamed Plant"}</Text>

        <View style={styles.favList}>
          <Text style={styles.favHeader}>Favorileyenler</Text>
          {users.length === 0 ? (
            <Text style={styles.favUser}>Henüz kimse favorilememiş.</Text>
          ) : (
            users.map((u) => (
              <Text key={u._id} style={styles.favUser}>
                • {u.firstName} {u.lastName}
                {authUserId && u._id === authUserId ? " (Sen)" : ""}
              </Text>
            ))
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Başlık */}
      <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
        <Text style={styles.headerTitle}>Favoriler</Text>
      </View>

      {/* İçerik */}
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
        <TouchableOpacity onPress={() => navigation.navigate("HomeScreen")}>
          {/* İçi beyaz, dışı yeşil çizgili HOME (favori ekranda isteğin gibi) */}
          <View style={styles.iconLayered}>
            <Ionicons name="home" size={33} color="#fff" style={styles.abs} />
            <Ionicons name="home-outline" size={31} color="#5B8E55" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("FavoritePlantsScreen")}>
          <Ionicons name="heart" size={34} color="#5B8E55" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("ScanScreen")}>
          <View style={styles.centerIcon}>
            <Ionicons name="scan-outline" size={40} color="#fff" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("PeopleScreen")}>
          <Ionicons name="people-outline" size={34} color="#5B8E55" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("StoreScreen")}>
          <Ionicons name="storefront-outline" size={34} color="#5B8E55" />
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
    marginBottom: 15,
  },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  card: {
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    alignItems: "center",
  },
  image: { width: "100%", height: 170, borderRadius: 10, marginBottom: 10 },
  title: { fontSize: 18, fontWeight: "bold", color: "#333", marginBottom: 10 },

  favList: { width: "100%", backgroundColor: "#fff", borderRadius: 8, padding: 10 },
  favHeader: { fontSize: 14, fontWeight: "700", color: "#2F5D3F", marginBottom: 6 },
  favUser: { fontSize: 14, color: "#444", marginBottom: 4 },

  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    backgroundColor: "#fff",
  },
  centerIcon: { backgroundColor: "#5B8E55", padding: 10, borderRadius: 40 },

  // katmanlı icon için
  iconLayered: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  abs: { position: "absolute" },
});