// screens/StoreScreen.js
import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";

const BASE_URL = "http://192.168.150.59:3000";
const API_PLANTS = `${BASE_URL}/api/plants`;
const API_CATEGORIES = `${BASE_URL}/api/categories`;
const img = (f) => `${BASE_URL}/images/${encodeURIComponent(f)}`;

// Backend farklılıklarını tolere eden yardımcı
const getImageUrl = (item) => {
  const any = item?.image || item?.imagePath || item?.photo || item?.file; //Bitki nesnesinde farklı isimlerde gelebilecek
  if (!any) return null;
  if (typeof any === "string" && /^https?:\/\//.test(any)) return any;
  if (typeof any === "string") {
    if (any.startsWith("/")) return `${BASE_URL}${any}`;
    return img(any);
  }
  //URL doğru formatta değilse (http ile başlamıyorsa) otomatik olarak BASE_URL ekler.
  if (any?.url) return any.url.startsWith("http") ? any.url : `${BASE_URL}${any.url}`;
  if (any?.path) return any.path.startsWith("http") ? any.path : `${BASE_URL}${any.path}`;
  if (any?.filename) return img(any.filename);
  return null;
};

const CHIP_WIDTH = 84;

export default function StoreScreen() {
  const navigation = useNavigation();

  const [plants, setPlants] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCat, setSelectedCat] = useState(null); // null = All
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const loadCategories = useCallback(async () => {
    try {
      const r = await fetch(API_CATEGORIES);
      const j = await r.json();
      const list = j?.data || (Array.isArray(j) ? j : []); //Hata olursa boş liste döner.
      setCategories(list);
    } catch (e) {
      console.log("Categories fetch error:", e);
      setCategories([]);
    }
  }, []);

  const loadPlants = useCallback(async () => {
    try {
      setLoading(true);
      // sadece satışta olanlar
      const r = await fetch(`${API_PLANTS}?forSale=true`);
      const j = await r.json();
      setPlants(j?.data || []);
    } catch (e) {
      console.log("Plants fetch error:", e);
      setPlants([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {  // Ekran ilk yüklendiğinde kategorileri ve bitkileri yükle
    loadCategories();
    loadPlants();
  }, [loadCategories, loadPlants]);

  useFocusEffect(  // Ekran her odaklandığında bitkileri yeniden yükle
    useCallback(() => {
      loadPlants();
    }, [loadPlants])
  );

  const matchesCategory = (plant) => { // Bitki kategorisi seçili mi? filtreleme fonksiyonu 
    if (!selectedCat) return true;
    const idsMaybe =
      plant?.categoriesIds ||
      plant?.categoryIds ||
      (plant?.categoryId ? [plant.categoryId] : null) ||
      (plant?.category ? [plant.category] : null) ||
      plant?.categories;

    if (!idsMaybe) return false;

    const ids = Array.isArray(idsMaybe) ? idsMaybe : [idsMaybe];
    return ids.some((x) => {
      if (!x) return false;
      if (typeof x === "string") return x === selectedCat;
      const id = x?._id || x?.id;
      return id === selectedCat;
    });
  };

  const filteredPlants = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (plants || [])
      .filter((p) => p?.forSale === true) // güvenlik ağı sadece satışta olan bitkileri al
      .filter((p) => {
        const passCat = matchesCategory(p); // Kategoriye göre filtrele 
        const passText = !q || (p?.name || "").toLowerCase().includes(q);
        return passCat && passText;
      });
  }, [plants, search, selectedCat]);

  const renderCard = ({ item }) => { // Bitki kartı render fonksiyonu 
    const uri = getImageUrl(item) || img(item?.image || "");
    const price = item?.price ?? 65;

    return (
      <TouchableOpacity    //Kart tıklandığında PriceScreen sayfasına bitki bilgileri ile gidilir.
        style={styles.card}
        activeOpacity={0.9}
        onPress={() =>
          navigation.navigate("PriceScreen", {
            plant: item,
            imageUrl: uri,
            price,
          })
        }
      >
        <Image source={{ uri }} style={styles.cardImage} />
        <Text style={styles.cardTitle} numberOfLines={1}> 
          {item?.name || "Unnamed"}    
        </Text>
        <View style={styles.pricePill}>
          <Text style={styles.priceText}>${Number(price).toFixed(2)}</Text>  
        </View>
      </TouchableOpacity> // fiyatı 2 ondalık basamak ile yaz
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#5B8E55" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 90 }}>
        {/* HEADER */}
        <View style={styles.topRow}>
          <Text style={styles.header}>
            Shop <Text style={styles.highlight}>Plants</Text>
          </Text>

          {/* Arama + Sepet */}
          <View style={styles.rightControls}>
            <View style={styles.searchWrap}>
              <Ionicons name="search" size={18} color="#7a7a7a" style={{ marginLeft: 10 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search"
                placeholderTextColor="#9aa19a"
                value={search}
                onChangeText={setSearch}
                returnKeyType="search"
              />
            </View>

            <TouchableOpacity
              style={styles.cartIconBtn}
              onPress={() => navigation.navigate("CheckoutScreen")}
              activeOpacity={0.7}
            >
              <Ionicons name="cart" size={20} color="#214E34" />
            </TouchableOpacity>
          </View>
        </View>

        {/* KATEGORİ CHIPS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          <TouchableOpacity
            style={[styles.chip, selectedCat === null && styles.chipActive]}
            onPress={() => setSelectedCat(null)}
            activeOpacity={0.8}
          >
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[styles.chipText, selectedCat === null && styles.chipTextActive]}
            >
              All
            </Text>
          </TouchableOpacity>

          {categories.map((c) => ( // Kategorilerden gelen her bir öğe için chip oluştur
            <TouchableOpacity
              key={c._id || c.id}
              style={[styles.chip, selectedCat === (c._id || c.id) && styles.chipActive]}
              onPress={() => setSelectedCat(c._id || c.id)}
              activeOpacity={0.8}
            >
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[
                  styles.chipText,
                  selectedCat === (c._id || c.id) && styles.chipTextActive,
                ]}
              >
                {c.name || c.title || "Category"}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ÜRÜN GRID */}
        <FlatList // Bitki kartlarını listele 
          data={filteredPlants}
          keyExtractor={(item, idx) => item?._id || item?.id || `plant-${idx}`}
          numColumns={2} // İki sütunlu grid 
          scrollEnabled={false}
          columnWrapperStyle={styles.cardRow}
          renderItem={renderCard}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", marginTop: 24, color: "#777" }}>
              Sonuç bulunamadı.
            </Text>
          }
        />
      </ScrollView>

      {/* BOTTOM NAV — tam hizalı */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate("FavoritePlantsScreen")}
        >
          <Ionicons name="heart-outline" size={28} color="#5B8E55" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate("WeatherScreen")}
        >
          <Ionicons name="partly-sunny-outline" size={28} color="#5B8E55" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.centerButton}
          onPress={() => navigation.popToTop()} // Ekran yığınında en üstteki ekrana dön
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
          <Ionicons name="storefront" size={28} color="#5B8E55" style={{ position: "absolute", opacity: 0.9 }} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Genel
  safeArea: { flex: 1, backgroundColor: "#fff" },
  container: { paddingHorizontal: 20, paddingTop: 20 },

  // Header + Arama
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  header: { fontSize: 29, fontWeight: "bold", color: "#333" },
  highlight: { color: "#5B8E55" },

  rightControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EDF5ED",
    borderRadius: 20,
    height: 36,
    width: 160,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 10,
    fontSize: 14,
    color: "#304a34",
  },

  cartIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E1EDE6",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },

  // Chips
  chipsRow: {
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 10,
  },
  chip: {
    width: CHIP_WIDTH,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EDF5ED",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  chipActive: { backgroundColor: "#5B8E55" },
  chipText: { color: "#5B8E55", fontWeight: "700" },
  chipTextActive: { color: "#fff" },

  // Grid
  cardRow: { justifyContent: "space-between", marginVertical: 10 },
  card: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    margin: 5,
    borderRadius: 12,
    overflow: "hidden",
    paddingBottom: 12,
    position: "relative",
  },
  cardImage: { width: "100%", height: 180 },
  cardTitle: {
    marginTop: 8,
    marginHorizontal: 10,
    fontWeight: "700",
    color: "#333",
  },
  pricePill: {
    position: "absolute",
    right: 8,
    top: 8,
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  priceText: { color: "#3f8a43", fontWeight: "700", fontSize: 12 },

  // Bottom Nav — tam hizalı
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