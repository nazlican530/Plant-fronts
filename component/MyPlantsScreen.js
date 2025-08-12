// screens/MyPlantsScreen.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get("window");
const cardWidth = (width - 60) / 2;
const BASE_URL = "http://192.168.150.59:3000";

export default function MyPlantsScreen() {
  const navigation = useNavigation();
  const [myPlants, setMyPlants] = useState([]);
  const [loading, setLoading] = useState(true);

  // Sale filter: 'all' | 'on' | 'off'
  const [saleFilter, setSaleFilter] = useState('all');

  // Profile bits (same logic as before)
  const [authUser, setAuthUser] = useState(null);

  const computePhotoUrl = (u) =>
    u?.image
      ? `${BASE_URL}/images/${encodeURIComponent(u.image)}?t=${encodeURIComponent(
          u?.updatedAt || Date.now()
        )}`
      : null;

  const initials = (u) =>
    `${u?.firstName?.[0] ?? ""}${u?.lastName?.[0] ?? ""}`.toUpperCase() || "?";

  const loadAuthUser = async () => {
    try {
      const raw = await AsyncStorage.getItem("user");
      const stored = raw ? JSON.parse(raw) : null;

      if (stored?._id) {
        setAuthUser(stored);
        return;
      }

      const onlyId = await AsyncStorage.getItem("userId");
      if (onlyId) {
        try {
          const r = await fetch(`${BASE_URL}/api/users/${onlyId}`);
          const j = await r.json();
          if (r.ok && j?.data) {
            setAuthUser(j.data);
            await AsyncStorage.setItem("user", JSON.stringify(j.data));
          } else {
            setAuthUser(null);
          }
        } catch {
          setAuthUser(null);
        }
      } else {
        setAuthUser(null);
      }
    } catch {
      setAuthUser(null);
    }
  };

  const fetchMyPlants = async () => {
    try {
      setLoading(true);
      const userId =
        (await AsyncStorage.getItem('userId')) ||
        JSON.parse((await AsyncStorage.getItem('user')) || '{}')._id;

      const response = await fetch(`${BASE_URL}/api/plants/user/${userId}`);
      const json = await response.json();
      setMyPlants(json.data || []);
    } catch (error) {
      console.error('Could not load plants:', error);
      setMyPlants([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuthUser();
    fetchMyPlants();
  }, []);

  const photoUrl = computePhotoUrl(authUser);

  // Apply sale filter
  const filteredPlants = useMemo(() => {
    if (saleFilter === 'on') return myPlants.filter(p => !!p?.forSale);
    if (saleFilter === 'off') return myPlants.filter(p => !p?.forSale);
    return myPlants;
  }, [myPlants, saleFilter]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 90 }}>
        {/* HEADER (title + profile) */}
        <View style={styles.topRow}>
          <Text style={styles.header}>
            My <Text style={styles.highlight}>Plants</Text>
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

        {/* SALE FILTERS — directly under header */}
        <View style={styles.filtersRow}>
          <TouchableOpacity
            style={[styles.filterChip, saleFilter === 'all' && styles.filterChipActive]}
            onPress={() => setSaleFilter('all')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, saleFilter === 'all' && styles.filterChipTextActive]}>
              All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, saleFilter === 'on' && styles.filterChipActive]}
            onPress={() => setSaleFilter('on')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, saleFilter === 'on' && styles.filterChipTextActive]}>
              On Sale
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, saleFilter === 'off' && styles.filterChipActive]}
            onPress={() => setSaleFilter('off')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, saleFilter === 'off' && styles.filterChipTextActive]}>
              Not on Sale
            </Text>
          </TouchableOpacity>
        </View>

        {/* PLANT GRID */}
        <View style={styles.grid}>
          {loading ? (
            <ActivityIndicator size="large" color="green" style={{ marginTop: 100 }} />
          ) : filteredPlants.length === 0 ? (
            <View style={{ marginTop: 50, alignItems: 'center' }}>
              <Text style={{ fontSize: 16, color: '#999' }}>No plants found.</Text>
            </View>
          ) : (
            filteredPlants.map((item) => (
              <View key={item._id} style={styles.cardContainer}>
                <TouchableOpacity
                  onPress={() => navigation.navigate("PlantDetailScreen", { plant: item })}
                  style={styles.card}
                >
                  <Image source={{ uri: item.imageUrl }} style={styles.cardImage} />
                  <Text style={styles.cardTitle}>{item.name}</Text>

                  {/* tiny status pill */}
                  <View style={[styles.salePill, item?.forSale ? styles.pillOn : styles.pillOff]}>
                    <Text style={styles.pillText}>{item?.forSale ? "On Sale" : "Not on Sale"}</Text>
                  </View>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* BOTTOM NAV */}
      <View style={styles.bottomNav}>
        <TouchableOpacity onPress={() => navigation.navigate("HomeScreen")}>
          <Ionicons name="home" size={34} color="#5B8E55" />
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

const CHIP_W = (width - 60) / 3;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  container: { paddingHorizontal: 20, paddingTop: 20 },

  // Header
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
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

  // Filters (right under header)
  filtersRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    marginTop: 10,
  },
  filterChip: {
    width: CHIP_W,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EDF5ED",
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipActive: {
    backgroundColor: "#5B8E55",
  },
  filterChipText: { color: "#5B8E55", fontWeight: "700" },
  filterChipTextActive: { color: "#fff" },

  // Cards
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  cardContainer: {
    width: cardWidth,
    alignItems: "center",
  },
  card: {
    backgroundColor: "#EBECD2",
    borderRadius: 11,
    width: "100%",
    height: 160,
    alignItems: "center",
    paddingTop: -205,
    position: "relative",
    marginTop: 110, 
  },
  cardImage: {
    position: "center", // kept as-is
    top: -90,
    width: 150,
    height: 226,
    resizeMode: "contain",
  },
  cardTitle: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#333",
    marginTop: -90,
  },

  // small status pill
  salePill: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  pillOn: { backgroundColor: "#EAF4EF" },
  pillOff: { backgroundColor: "#ECEFF1" },
  pillText: { fontSize: 11, fontWeight: "700", color: "#3b3b3b" },

  // Bottom nav
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    backgroundColor: "#fff",
  },
  centerIcon: {
    backgroundColor: "#5B8E55",
    padding: 10,
    borderRadius: 40,
    marginTop: -20,
  },
});
