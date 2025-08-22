// screens/HomeScreen.js
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
  FlatList, SafeAreaView, Alert, ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";

const BASE_URL = "http://192.168.150.59:3000";
const API_USERS = `${BASE_URL}/api/users`;
const API_PLANTS = `${BASE_URL}/api/plants`;
const API_FAVORITES_BASE = `${BASE_URL}/api/favorites`;
const img = (f) => `${BASE_URL}/images/${encodeURIComponent(f)}`;

export default function HomeScreen() {
  const navigation = useNavigation();

  const [authUserId, setAuthUserId] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [plants, setPlants] = useState([]);
  const [favoritePlants, setFavoritePlants] = useState([]);
  const [loading, setLoading] = useState(true);

  // Üst kısayollar için seçili durum
  const [activeShort, setActiveShort] = useState("garden"); // "garden" | "plants"

  const computePhotoUrl = (u) =>
    u?.image
      ? `${BASE_URL}/images/${encodeURIComponent(u.image)}?t=${encodeURIComponent(
          u.updatedAt || Date.now()
        )}`
      : null;

  const initials = (u) =>
    `${u?.firstName?.[0] ?? ""}${u?.lastName?.[0] ?? ""}`.toUpperCase() || "?";

  // Auth yükle
  const loadAuthUser = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem("user");
      const stored = raw ? JSON.parse(raw) : null;

      if (stored?._id) {
        setAuthUserId(stored._id);
        setAuthUser(stored);
        return;
      }

      const onlyId = await AsyncStorage.getItem("userId");
      if (onlyId) {
        setAuthUserId(onlyId);
        try {
          const r = await fetch(`${API_USERS}/${onlyId}`);
          const j = await r.json();
          if (r.ok && j?.data) {
            setAuthUser(j.data);
            await AsyncStorage.setItem("user", JSON.stringify(j.data));
          } else {
            setAuthUser(null);
          }
        } catch {}
      } else {
        setAuthUserId(null);
        setAuthUser(null);
      }
    } catch {
      setAuthUserId(null);
      setAuthUser(null);
    }
  }, []);

  useEffect(() => {
    loadAuthUser();
    const unsub = navigation.addListener("focus", loadAuthUser);
    return unsub;
  }, [navigation, loadAuthUser]);

  // Bitkileri getir
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(API_PLANTS);
        const json = await res.json();
        if (Array.isArray(json?.data)) {
          const sorted = [...json.data].sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          );
          setPlants(sorted);
        } else {
          setPlants([]);
        }
      } catch {
        Alert.alert("Hata", "Bitkiler alınamadı.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const lastPlantId = useMemo(
    () => (plants.length > 0 ? plants[0]?._id : null),
    [plants]
  );

  // Favoriler
  const loadMyFavorites = useCallback(async () => {
    if (!authUserId) return;
    try {
      const res = await fetch(`${API_FAVORITES_BASE}/user/${authUserId}`);
      const json = await res.json();
      if (json?.success) setFavoritePlants(Array.isArray(json.data) ? json.data : []);
    } catch {}
  }, [authUserId]);

useFocusEffect(
  React.useCallback(() => {

    let isActive = true;

    const fetchFavorites = async () => {
      try {
        const favorites = await loadMyFavorites(); // loadMyFavorites async ise await kullan
        if (isActive) {
          // Eğer state güncellemesi yapıyorsan burada yapabilirsin
          // setFavorites(favorites);  // örnek
        }
      } catch (e) {
      }
    };

    fetchFavorites();

    return () => {
      isActive = false; // cleanup: ekran focus kaybettiğinde durdur
    };
  }, [loadMyFavorites])
);


  const toggleFavorite = async (plant) => {
   
    if (!authUserId) {
      Alert.alert("Giriş gerekli", "Favori eklemek için önce giriş yapmalısın.");
      return;
    }
    const isFavorited = isFav(plant._id);
    const method = isFav(plant._id) ? "DELETE" : "POST";
     console.log("isFavorited: ", isFavorited);
    try {
      const response = await fetch(API_FAVORITES_BASE, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: authUserId, plantId: plant._id }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (/E11000|duplicate/i.test(errorText)) {
          if (!isFavorited) setFavoritePlants((prev) => [...prev, plant]);
          return;
        }
        throw new Error(errorText || "Favori işlemi başarısız");
      }

      setFavoritePlants((prev) =>
        isFavorited ? prev.filter((p) => p?._id !== plant._id) : [...prev, plant]
      );
    } catch {
      Alert.alert("Hata", "Favori işlemi başarısız oldu.");
    }
  };

  if (loading) {
    return (
      <View style={[styles.safeArea, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#5B8E55" />
      </View>
    );
  }

  const photoUrl = computePhotoUrl(authUser);
  const isFav = (id) => favoritePlants.some((p) => p?._id === id);

 
  const GRADIENTS = {
    gardenActive: ["#2E7D32", "#66BB6A"],  
    gardenInactive: ["#FFFFFF", "#F3F3F3"],
    plantsActive: ["#fff", "#fff"],
    plantsInactive: ["#66BB6A", "#2E7D32"],
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 90 }}>
        {/* HEADER */}
        <View style={styles.topRow}>
          <Text style={styles.header}>
            New on <Text style={styles.highlight}>Plantio</Text>
          </Text>

          <TouchableOpacity onPress={() => navigation.navigate("ProfileScreen")} activeOpacity={0.8}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.profilePic} />
            ) : (
              <View style={[styles.profilePic, styles.profilePlaceholder]}>
                <Text style={styles.profileInitials}>{initials(authUser)}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* KISAYOLLAR — My Garden & My Plants (eşit boy, gradient, iki hâlli) */}
        <View style={styles.shortcutsRow}>
          {/* My Garden */}
          <TouchableOpacity
            onPress={() => {
              setActiveShort("garden");
              navigation.navigate("MyGarden");
            }}
            activeOpacity={0.9}
            style={styles.shortBtnWrap}
          >
            <LinearGradient
              colors={
                activeShort === "garden"
                  ? GRADIENTS.gardenActive
                  : GRADIENTS.gardenInactive
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.shortBtn,
                activeShort === "garden" && styles.shortBtnShadow,
              ]}
            >
              <Ionicons
                name="leaf"
                size={22}
                color={activeShort === "garden" ? "#fff" : "#fff"}
              />
              <Text
                style={[
                  styles.shortText,
                  activeShort === "garden" && styles.shortTextActive,
                ]}
              >
                My Garden
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* My Plants */}
          <TouchableOpacity
            onPress={() => {
              setActiveShort("plants");
              navigation.navigate("MyPlantsScreen");
            }}
            activeOpacity={0.9}
            style={styles.shortBtnWrap}
          >
            <LinearGradient
              colors={
                activeShort === "plants"
                  ? GRADIENTS.plantsActive
                  : GRADIENTS.plantsInactive
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.shortBtn,
                activeShort === "plants" && styles.shortBtnShadow,
              ]}
            >
              <Ionicons
                name="water"
                size={22}
                color={activeShort === "plants" ? "#fff" : "#fff"}
              />
              <Text
                style={[
                  styles.shortText,
                  activeShort === "plants" && styles.shortTextActive,
                ]}
              >
                My Plants
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* BANNER */}
        <TouchableOpacity
          style={styles.banner}
          activeOpacity={0.9}
          onPress={() => navigation.navigate("CreatePlantScreen")}
        >
          <Image source={require("../assets/create.jpg")} style={styles.bannerImage} />
          <View style={styles.bannerOverlay}>
            <Text style={styles.bannerSubtitle}>New in</Text>
            <Text style={styles.bannerTitle}>Create plans{"\n"}with Gardening App</Text>
          </View>
        </TouchableOpacity>

        {/* PLANTS GRID */}
        <FlatList
          data={plants}
          keyExtractor={(item) => item._id}
          numColumns={2}
          scrollEnabled={false}
          columnWrapperStyle={styles.cardRow}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.85}
              onPress={() =>
                navigation.navigate("PlantInfoScreen", {
                  plant: item,
                  imageUrl: img(item.image),
                })
              }
            >
              <Image source={{ uri: img(item.image) }} style={styles.cardImage} />

              <TouchableOpacity style={styles.favoriteIcon} onPress={() => toggleFavorite(item)}>
                <Ionicons
                  name={isFav(item._id) ? "heart" : "heart-outline"}
                  size={24}
                  color={isFav(item._id) ? "#e74c3c" : "#666"}
                />
              </TouchableOpacity>

              {item._id === lastPlantId && (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>New</Text>
                </View>
              )}

              <Text style={styles.cardTitle}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
      </ScrollView>

      {/* BOTTOM NAV */}
      <View style={styles.bottomNav}>
        <TouchableOpacity onPress={() => navigation.navigate("FavoritePlantsScreen")}>
          <View style={styles.navButton}>
            <Ionicons name="heart-outline" size={28} color="#5B8E55" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("WeatherScreen")}>
          <View style={styles.navButton}>
            <Ionicons name="partly-sunny-outline" size={28} color="#5B8E55" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("HomeScreen")}>
          <View style={styles.centerButton}>
            <Ionicons name="home" size={32} color="#fff" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("PeopleScreen")}>
          <View style={styles.navButton}>
            <Ionicons name="people-outline" size={28} color="#5B8E55" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("StoreScreen")}>
          <View style={styles.navButton}>
            <Ionicons name="storefront-outline" size={28} color="#5B8E55" />
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  container: { paddingHorizontal: 20, paddingTop: 20 },

  // header
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  header: { fontSize: 29, fontWeight: "bold", color: "#333" },
  highlight: { color: "#5B8E55" },
  profilePic: { width: 40, height: 40, borderRadius: 20 },
  profilePlaceholder: {
    backgroundColor: "#e6efe7",
    alignItems: "center",
    justifyContent: "center",
  },
  profileInitials: { color: "#5B8E55", fontWeight: "700" },

  // üst iki buton (eşit boy, gradient, iki hâlli)
  shortcutsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    gap: 12, // RN <0.71 ise shortBtnWrap'a marginHorizontal ver
  },
  shortBtnWrap: {
    borderRadius: 24,
    overflow: "hidden",
    marginHorizontal: 6,
  },
  shortBtn: {
    width: 140,
    height: 48,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    gap: 8,
  },
  shortBtnShadow: {
    // sadece aktifken hafif gölge
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  shortText: { fontSize: 15, color: "#fff", fontWeight: "600" },
  shortTextActive: { color: "#fff" },

  // banner
  banner: { position: "relative", marginBottom: 20, borderRadius: 15, overflow: "hidden" },
  bannerImage: { width: "100%", height: 200 },
  bannerOverlay: { position: "absolute", top: 20, left: 20 },
  bannerSubtitle: { fontSize: 14, color: "#fff", marginBottom: 80 },
  bannerTitle: { fontSize: 20, fontWeight: "bold", color: "#fff", maxWidth: "100%" },

  // grid
  cardRow: { justifyContent: "space-between", marginVertical: 10 },
  card: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    margin: 5,
    borderRadius: 10,
    overflow: "hidden",
    alignItems: "center",
    paddingBottom: 5,
    position: "relative",
  },
  cardImage: { width: "100%", height: 200 },
  cardTitle: { marginTop: 8, fontWeight: "bold", color: "#333" },
  newBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "#5B8E55",
    borderRadius: 5,
    paddingHorizontal: 3,
    paddingVertical: 3,
  },
  newBadgeText: { color: "#fff", fontSize: 10 },
  favoriteIcon: { position: "absolute", top: 10, right: 10, zIndex: 1 },

  // bottom nav
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
    width: 50, height: 50, borderRadius: 25,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "#fff",
  },
  centerButton: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: "#5B8E55",
    alignItems: "center", justifyContent: "center",
  },
});