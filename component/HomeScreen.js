// screens/HomeScreen.js
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
  FlatList, SafeAreaView, Alert, ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import WeatherCard from "../components/WeatherCard";

const BASE_URL = "http://192.168.150.59:3000";
const API_USERS = `${BASE_URL}/api/users`;
const API_PLANTS = `${BASE_URL}/api/plants`;
const API_FAVORITES_BASE = `${BASE_URL}/api/favorites`;
const API_KEY = "51c87e0d3db899e5333e26019b7a6882";
const img = (f) => `${BASE_URL}/images/${encodeURIComponent(f)}`;

export default function HomeScreen() {
  const navigation = useNavigation();

  const [authUserId, setAuthUserId] = useState(null);
  const [authUser, setAuthUser] = useState(null);

  const [plants, setPlants] = useState([]);
  const [favoritePlants, setFavoritePlants] = useState([]);

  // ŞEHİR ve HAVA DURUMU STATE
  const [city, setCity] = useState("Istanbul");
  const [weather, setWeather] = useState(null);

  const [loading, setLoading] = useState(true);

  // ---- Helpers
  const computePhotoUrl = (u) =>
    u?.image
      ? `${BASE_URL}/images/${encodeURIComponent(u.image)}?t=${encodeURIComponent(
          u.updatedAt || Date.now()
        )}`
      : null;

  const initials = (u) =>
    `${u?.firstName?.[0] ?? ""}${u?.lastName?.[0] ?? ""}`.toUpperCase() || "?";

  // ---- Auth yükle + user detayını getir (veya storage'tan al)
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

  // ---- Bitkiler (en yeni en başta)
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

  // ---- En son eklenen bitki ID'si
  const lastPlantId = useMemo(
    () => (plants.length > 0 ? plants[0]?._id : null),
    [plants]
  );

  // Hava verisini çeken fonksiyon
  const fetchWeather = useCallback(async (c) => {
    try {
      const r = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(c)}&appid=${API_KEY}&units=metric`
      );
      const d = await r.json();
      if (!d?.main) return;
      const dayName = new Date().toLocaleDateString("en-US", { weekday: "short" });
      setWeather({
        day: dayName,
        temp: Math.round(d.main.temp),
        range: `${Math.round(d.main.temp_min)}° / ${Math.round(d.main.temp_max)}°`,
        location: d.name,
        icon: d.weather?.[0]?.icon,
      });
    } catch {}
  }, []);

  // city değişince hava verisini çek
  useEffect(() => {
    fetchWeather(city);
  }, [city, fetchWeather]);

  // Ekran fokus olduğunda AsyncStorage'tan "weatherCity" oku
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const saved = await AsyncStorage.getItem("weatherCity");
        if (saved && saved !== city) setCity(saved);
      })();
    }, [city])
  );

  // ---- Favoriler
  const loadMyFavorites = useCallback(async () => {
    if (!authUserId) return;
    try {
      const res = await fetch(`${API_FAVORITES_BASE}/user/${authUserId}`);
      const json = await res.json();
      if (json?.success) setFavoritePlants(Array.isArray(json.data) ? json.data : []);
    } catch {}
  }, [authUserId]);

  useEffect(() => {
    loadMyFavorites();
  }, [loadMyFavorites]);

  // ---- Favori toggle
  const toggleFavorite = async (plant) => {
    if (!authUserId) {
      Alert.alert("Giriş gerekli", "Favori eklemek için önce giriş yapmalısın.");
      return;
    }
    const isFavorited = favoritePlants.some((p) => p._id === plant._id);
    const method = isFavorited ? "DELETE" : "POST";

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
        isFavorited ? prev.filter((p) => p._id !== plant._id) : [...prev, plant]
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
  const isFav = (id) => favoritePlants.some((p) => p._id === id);

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

        {/* HAVA + KISAYOLLAR */}
        <View style={styles.row}>
          <View style={styles.circleWrapper}>
            <TouchableOpacity style={styles.circle} onPress={() => navigation.navigate("MyGarden")}>
              <Ionicons name="leaf" size={30} color="white" />
            </TouchableOpacity>
            <Text style={styles.iconText}>My Garden</Text>
          </View>

          <View style={styles.circleWrapper}>
            <TouchableOpacity
              style={styles.circle}
              onPress={() => navigation.navigate("MyPlantsScreen")}
            >
              <Ionicons name="water" size={30} color="white" />
            </TouchableOpacity>
            <Text style={styles.iconText}>My Plants</Text>
          </View>

          {/* WeatherCard tıklanabilir + key ile remount */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() =>
              navigation.navigate("WeatherScreen", {
                initialCity: city,
              })
            }
          >
            <WeatherCard key={`${city}-${weather?.temp ?? ""}`} weather={weather} />
          </TouchableOpacity>
        </View>

        {/* BANNER — tıklanınca CreatePlantScreen'e gider */}
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

              {/* Sadece en son eklenen bitkiye "New" etiketi */}
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
        <TouchableOpacity onPress={() => navigation.navigate("HomeScreen")}>
          <Ionicons name="home" size={34} color="#5B8E55" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("FavoritePlantsScreen")}>
          {/* İçi beyaz, dışı yeşil kalp */}
          <View style={styles.iconLayered}>
            <Ionicons name="heart" size={33} color="#fff" style={styles.abs} />
            <Ionicons name="heart-outline" size={31} color="#5B8E55" />
          </View>
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
  container: { paddingHorizontal: 20, paddingTop: 20 },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
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

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  circleWrapper: { alignItems: "center" },
  circle: {
    backgroundColor: "#5B8E55",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 5,
  },
  iconText: { fontSize: 20, color: "#333" },

  banner: { position: "relative", marginBottom: 20, borderRadius: 15, overflow: "hidden" },
  bannerImage: { width: "100%", height: 200 },
  bannerOverlay: { position: "absolute", top: 20, left: 20 },
  bannerSubtitle: { fontSize: 14, color: "#fff", marginBottom: 80 },
  bannerTitle: { fontSize: 20, fontWeight: "bold", color: "#fff", maxWidth: "100%" },

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

  // Katmanlı ikon stilleri
  iconLayered: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  abs: { position: "absolute" },
});
