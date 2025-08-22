// screens/PlantCareScreen.js
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View, Text, Image, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = "http://192.168.150.59:3000";
const API_CATEGORIES = `${BASE_URL}/api/categories`;

function toImageUrl(imgField) {
  if (!imgField) return null;
  if (typeof imgField === "string" && /^https?:\/\//.test(imgField)) return imgField;
  if (typeof imgField === "string") {
    if (imgField.startsWith("/")) return `${BASE_URL}${imgField}`;
    return `${BASE_URL}/images/${encodeURIComponent(imgField)}`;
  }
  if (imgField?.url)  return imgField.url.startsWith("http") ? imgField.url  : `${BASE_URL}${imgField.url.startsWith("/") ? "" : "/"}${imgField.url}`;
  if (imgField?.path) return imgField.path.startsWith("http") ? imgField.path : `${BASE_URL}${imgField.path.startsWith("/") ? "" : "/"}${imgField.path}`;
  if (imgField?.filename) return `${BASE_URL}/images/${encodeURIComponent(imgField.filename)}`;
  return null;
}
const asBool = (v) => v === true || v === "true" || v === 1 || v === "1";

// yardımcı: “50%%” olmasın
const cleanPercent = (val) => {
  if (val === null || val === undefined) return "";
  const s = String(val).replace(/\s+/g, "");
  const numeric = s.replace(/%/g, "");
  return numeric;
};

export default function PlantCareScreen() {
  const navigation = useNavigation();
  const { params } = useRoute();
  const plant = params?.plant || {};
  const imageUrl = params?.imageUrl;

  // route ile gelen flag'ler
  const pWatering  = params?.watering;
  const pSunlight  = params?.sunlight;
  const pNutrients = params?.nutrients;

  const [categoryNames, setCategoryNames] = useState([]);
  const [catLoading, setCatLoading] = useState(false);

  // Add sonrası saklanan flag’ler
  const [storedFlags, setStoredFlags] = useState({ watering: false, sunlight: false, nutrients: false });

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!plant?._id) return;
      const raw = await AsyncStorage.getItem(`flags:${plant._id}`);
      if (!mounted) return;
      if (raw) { try { setStoredFlags(JSON.parse(raw)); } catch {} }
    })();
    return () => { mounted = false; };
  }, [plant?._id]);

  const photo =
    imageUrl ||
    toImageUrl(plant?.image || plant?.imagePath || plant?.photo || plant?.file);

  // KATEGORİ İSİMLERİ
  const loadCategoryNames = useCallback(async () => {
    try {
      if (Array.isArray(plant?.categories) && plant.categories.some((c) => c?.name)) {
        setCategoryNames(plant.categories.map((c) => c?.name).filter(Boolean));
        return;
      }
      let ids = null;
      if (Array.isArray(plant?.categoriesIds)) ids = plant.categoriesIds;
      else if (Array.isArray(plant?.categoryIds)) ids = plant.categoryIds;
      else if (plant?.categoryId) ids = [plant.categoryId];
      else if (plant?.category) ids = [plant.category];

      if (!ids || !ids.length) { setCategoryNames([]); return; }

      setCatLoading(true);
      const res = await fetch(API_CATEGORIES);
      const json = await res.json();
      const list = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
      const map = {};
      list.forEach((c) => {
        const id = c?._id || c?.id;
        const name = c?.name || c?.title || id;
        if (id) map[id] = name;
      });

      const names = ids
        .map((x) => {
          if (!x) return null;
          if (typeof x === "string") return map[x] || x;
          const id = x?._id || x?.id;
          const name = x?.name || x?.title;
          return name || (id ? map[id] : null);
        })
        .filter(Boolean);

      setCategoryNames(names);
    } catch {
      setCategoryNames([]);
    } finally {
      setCatLoading(false);
    }
  }, [plant]);

  useEffect(() => { loadCategoryNames(); }, [loadCategoryNames]);

  // Öncelik: backend alanı -> route param -> storage
  const wateringOn  = asBool(plant?.watering  ?? pWatering  ?? storedFlags.watering);
  const sunlightOn  = asBool(plant?.sunlight  ?? pSunlight  ?? storedFlags.sunlight);
  const nutrientsOn = asBool(plant?.nutrients ?? pNutrients ?? storedFlags.nutrients);

  const actions = [
    wateringOn  ? { key: "watering",  icon: "water", label: "WATERING" }   : null,
    sunlightOn  ? { key: "sunlight",  icon: "sunny", label: "SUNLIGHT" }   : null,
    nutrientsOn ? { key: "nutrients", icon: "leaf",  label: "NUTRIENTS" }  : null,
  ].filter(Boolean);

  const onActionPress = (k) => {};

  //  Metrikler (Humidity/Height/Temperature)
  const humidityText = useMemo(() => {
    const base = cleanPercent(plant?.humidity);
    return base !== "" ? `${base}%` : "—";
  }, [plant?.humidity]);

  const heightText = useMemo(() => {
    // 7'3 veya 220 gibi — olduğunca dokunmuyoruz
    return plant?.height ? String(plant.height) : "—";
  }, [plant?.height]);

  const temperatureText = useMemo(() => {
    const t = plant?.temperature;
    if (t === null || t === undefined || t === "") return "—";
    const cleaned = String(t).replace(/[^\d.,-]/g, "");
    return `${cleaned}°C`;
  }, [plant?.temperature]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.headerRow}>
          <Text style={styles.headerText}>
            New on <Text style={styles.brand}>Plantio</Text>
          </Text>
        </View>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate("MyGarden")}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#2d2d2d" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>{plant?.name || "Unnamed Plant"}</Text>

        {photo ? (
          <Image source={{ uri: photo }} style={styles.image} resizeMode="contain" />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Ionicons name="leaf-outline" size={40} color="#888" />
          </View>
        )}

        {catLoading ? (
          <ActivityIndicator style={{ marginTop: 8 }} />
        ) : categoryNames.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Categories</Text>
            {categoryNames.map((name, i) => (
              <Text key={`${name}-${i}`} style={styles.text}>• {name}</Text>
            ))}
          </>
        ) : null}

        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.paragraph}>
          {plant?.description || "No description provided."}
        </Text>

        {/* SADECE AKTİF OLANLAR */}
        {actions.length > 0 && (
          <View style={styles.actionGrid}>
            {actions.map((a) => (
              <View key={a.key} style={styles.actionItem}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.actionCircle}
                  onPress={() => onActionPress(a.key)}
                >
                  <Ionicons name={a.icon} size={36} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.actionLabel}>{a.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/*  Mini Stats (Humidity / Height / Temperature) */}
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <View style={styles.metricIconWrap}>
              <Ionicons name="water" size={18} />
            </View>
            <Text style={styles.metricLabel}>Humidity</Text>
            <Text style={styles.metricValue}>{humidityText}</Text>
          </View>

          <View style={styles.metricItem}>
            <View style={styles.metricIconWrap}>
              <Ionicons name="trending-up" size={18} />
            </View>
            <Text style={styles.metricLabel}>Height</Text>
            <Text style={styles.metricValue}>{heightText}</Text>
          </View>

          <View style={styles.metricItem}>
            <View style={styles.metricIconWrap}>
              <Ionicons name="sunny" size={18} />
            </View>
            <Text style={styles.metricLabel}>Temperature</Text>
            <Text style={styles.metricValue}>{temperatureText}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingHorizontal: 18, paddingTop: 10 },

  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 16 },
  headerText: { fontSize: 26, fontWeight: "800", color: "#1f1f1f" },
  brand: { color: "#3f8a43" },

  backButton: { flexDirection: "row", alignItems: "center", marginBottom: 12, marginTop: 10 },
  backText: { marginLeft: 6, color: "#2d2d2d", fontSize: 16 },

  title: { fontSize: 28, fontWeight: "800", color: "#2f6f3e", marginTop: 9, marginBottom: 15, textAlign: "center" },

  image: { width: "100%", height: 260, marginVertical: 8, borderRadius: 12, overflow: "hidden" },
  imagePlaceholder: { backgroundColor: "#eee", alignItems: "center", justifyContent: "center" },

  sectionTitle: { fontSize: 18, fontWeight: "700", marginTop: 16, marginBottom: 8 },
  text: { fontSize: 15, color: "#333" },
  paragraph: { color: "#4e4e4e", lineHeight: 22, marginTop: 4 },

  actionGrid: { flexDirection: "row", justifyContent: "space-around", alignItems: "flex-start", marginTop: 18, marginBottom: 10 },
  actionItem: { alignItems: "center", width: 110 },
  actionCircle: {
    width: 72, height: 72, borderRadius: 999, backgroundColor: "#5B8E55",
    justifyContent: "center", alignItems: "center",
    elevation: 2, shadowColor: "#000", shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 8,
  },
  actionLabel: { marginTop: 8, color: "#3f8a43", fontWeight: "700", letterSpacing: 0.6 },

  // mini stats
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 6,
  },
  metricItem: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#e6efe7",
    alignItems: "flex-start",
  },
  metricIconWrap: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: "#e9f5f1",
    alignItems: "center", justifyContent: "center",
    marginBottom: 6,
  },
  metricLabel: { fontSize: 12, color: "#2c7a67", fontWeight: "700", marginBottom: 2 },
  metricValue: { fontSize: 18, color: "#1e1e1e", fontWeight: "700" },
});