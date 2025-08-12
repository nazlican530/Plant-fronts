import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRoute, useNavigation } from "@react-navigation/native";

const BASE_URL = "http://192.168.150.59:3000";
const API_FAVORITES_BASE = `${BASE_URL}/api/favorites`;

export default function PlantInfoScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { plant, imageUrl } = route.params || {};
  const [categoryNames, setCategoryNames] = useState([]);
  const [busy, setBusy] = useState(false);

  // Kategori isimleri: populate geldiyse doğrudan, yoksa ids -> isim çek
  useEffect(() => {
    if (Array.isArray(plant?.categories) && plant.categories.length > 0) {
      setCategoryNames(plant.categories.map((c) => c?.name).filter(Boolean));
      return;
    }
    const fetchNames = async () => {
      if (!Array.isArray(plant?.categoriesIds) || plant.categoriesIds.length === 0) {
        setCategoryNames([]);
        return;
      }
      try {
        const resList = await Promise.all(
          plant.categoriesIds.map((id) =>
            fetch(`${BASE_URL}/api/category/${id}`).then((r) => r.json())
          )
        );
        setCategoryNames(resList.map((r) => r?.data?.name).filter(Boolean));
      } catch {
        setCategoryNames([]);
      }
    };
    fetchNames();
  }, [plant]);

  const goBackSafe = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate("HomeScreen");
  };

  const addToFavoritesAndGo = async () => {
    try {
      setBusy(true);
      const userId = "689463c783ec777b054c1aa7"; // TODO: auth'tan al
      const resp = await fetch(API_FAVORITES_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, plantId: plant._id }),
      });
      if (!resp.ok) {
        const t = await resp.text();
        throw new Error(t || "Favori ekleme başarısız");
      }
      // Favoriler ekranına git (o ekran backend'den çekiyorsa ekstra param gerekmez)
      navigation.navigate("FavoritePlantsScreen", { from: "detail", justAdded: plant });
    } catch (e) {
      Alert.alert("Hata", e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Geri Butonu (daha aşağı ve büyük tıklama alanı) */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={goBackSafe}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={26} color="#333" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        {/* Görsel */}
        <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="contain" />

        {/* Başlık */}
        <Text style={styles.title}>{plant?.name || "Unnamed Plant"}</Text>
        <Text style={styles.subtitle}>Your Plant Info</Text>

        {/* Açıklama */}
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.text}>{plant?.description || "No description provided."}</Text>

        {/* Kategori İsimleri */}
        {categoryNames.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Categories</Text>
            {categoryNames.map((name, i) => (
              <Text key={`${name}-${i}`} style={styles.text}>• {name}</Text>
            ))}
          </>
        )}

        {/* Favori + Favoriler ekranına git */}
        <TouchableOpacity
          style={[styles.favoriteButton, busy && { opacity: 0.6 }]}
          onPress={addToFavoritesAndGo}
          disabled={busy}
        >
          <Ionicons name="heart-outline" size={24} color="#fff" />
          <Text style={styles.favoriteButtonText}>
            {busy ? "Adding..." : "Add to Favorites & View"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: "#fff", flex: 1, paddingHorizontal: 16 },
  // daha aşağı: safe alanın altında ~16px, ayrıca boşluk
  backButton: {
    marginTop: 16,            // ⬅︎ daha aşağı
    marginBottom: 10,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
  },
  backText: { marginLeft: 6, fontSize: 16, color: "#333" },
  image: { width: "100%", height: 280, marginTop: 6 },
  title: { fontSize: 28, fontWeight: "700", color: "#2f6f3e", marginTop: 12 },
  subtitle: { color: "#888", marginBottom: 18 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginTop: 16, marginBottom: 8 },
  text: { fontSize: 15, color: "#333" },
  favoriteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#5B8E55",
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 22,
    marginBottom: 30,
  },
  favoriteButtonText: { color: "#fff", marginLeft: 8, fontWeight: "600" },
});
