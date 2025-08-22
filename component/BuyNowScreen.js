import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CommonActions } from "@react-navigation/native"; //  stack reset için

const BASE_URL = "http://192.168.150.59:3000";
const API_PLANT_BUY = (id) => `${BASE_URL}/api/plants/${id}/buy`;

export default function BuyNowScreen({ navigation }) {
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [cardBrand, setCardBrand] = useState("visa"); 
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");

  const buyItems = async (items) => {
    const token = await AsyncStorage.getItem("token");
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const results = [];
    for (const it of items) {
      const id = it?.id ?? it?._id;
      if (!id) {
        results.push({ ok: false, id: null, message: "Geçersiz ürün" });
        continue;
      }
      const qty = Math.max(1, parseInt(it?.qty, 10) || 1);

      try {
        const r = await fetch(API_PLANT_BUY(id), {
          method: "POST",
          headers,
          body: JSON.stringify({ qty }),
        });
        const j = await r.json().catch(() => ({}));

        if (!r.ok || j?.success === false) {
          results.push({
            ok: false,
            id,
            message: j?.message || `Satın alma başarısız (HTTP ${r.status})`,
          });
        } else {
          results.push({ ok: true, id, left: j?.data?.stockCount ?? null });
        }
      } catch (e) {
        results.push({ ok: false, id, message: e?.message || "Ağ hatası" });
      }
    }
    return results;
  };

  const handleBuyNow = async () => {
    try {
      const raw = await AsyncStorage.getItem("cart"); 
      const items = raw ? JSON.parse(raw) : []; 

      if (!items.length) {
        Alert.alert("Sepet boş", "Önce sepete ürün ekleyin.");
        return;
      }

      const results = await buyItems(items);

      const failed = results.filter((r) => !r.ok); 
      const succeeded = results.filter((r) => r.ok); 

      if (failed.length && !succeeded.length) { 
        Alert.alert(
          "Hata",
          failed[0]?.message || "Satın alma gerçekleştirilemedi."
        );
        return;
      }

      //  Başarı varsa sepeti temizle
      await AsyncStorage.setItem("cart", JSON.stringify([]));

      if (failed.length) {
        Alert.alert(
          "Kısmen başarılı",
          `Bazı ürünler alınamadı: ${failed
            .map((f) => f.message || f.id)
            .slice(0, 3)
            .join(", ")}`,
          [
            {
              text: "OK",
              onPress: () =>
                navigation.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [{ name: "HomeScreen" }], //  her durumda HomeScreen’e dön
                  })
                ),
            },
          ]
        );
      } else {
        const leftInfo =
          succeeded.length === 1 && succeeded[0]?.left != null
            ? ` : ${succeeded[0].left}`
            : "";
        Alert.alert("Başarılı", "Siparişiniz alındı!" + leftInfo, [
          {
            text: "OK",
            onPress: () =>
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: "HomeScreen" }], //  tam başarıda da HomeScreen
                })
              ),
          },
        ]);
      }
    } catch (e) {
      console.log("BUY NOW ERROR:", e);
      Alert.alert("Error", "Something went wrong. Please try again.");
    }
  };

  const BrandOption = ({ brand }) => {
    const active = cardBrand === brand;
    return (
      <TouchableOpacity
        onPress={() => setCardBrand(brand)}
        activeOpacity={0.8}
        style={[styles.brandBtn, active && styles.brandBtnActive]}
      >
        {brand === "visa" ? (
          <View style={styles.visaBadge}>
            <Text style={styles.visaText}>VISA</Text>
          </View>
        ) : (
          <View style={styles.mcBadge}>
            <View style={styles.mcCircleLeft} />
            <View style={styles.mcCircleRight} />
          </View>
        )}
        <Text style={[styles.brandLabel, active && styles.brandLabelActive]}>
          {brand === "visa" ? "Visa" : "Mastercard"}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color="#214E34" />
        </TouchableOpacity>
        <Text style={styles.title}>Buy Now</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.sectionTitle}>Shipping Information</Text>
        <TextInput placeholder="Full Name" style={styles.input} value={fullName} onChangeText={setFullName} />
        <TextInput placeholder="Address" style={styles.input} value={address} onChangeText={setAddress} />
        <TextInput placeholder="City" style={styles.input} value={city} onChangeText={setCity} />
        <TextInput placeholder="Postal Code" style={styles.input} value={postalCode} onChangeText={setPostalCode} keyboardType="numeric" />

        <Text style={styles.sectionTitle}>Payment Information</Text>
        <View style={styles.brandRow}>
          <BrandOption brand="visa" />
          <BrandOption brand="mastercard" />
        </View>

        <TextInput placeholder={`Card Number (${cardBrand === "visa" ? "Visa" : "Mastercard"})`} style={styles.input} value={cardNumber} onChangeText={setCardNumber} keyboardType="numeric" />
        <TextInput placeholder="Expiry Date (MM/YY)" style={styles.input} value={expiryDate} onChangeText={setExpiryDate} />
        <TextInput placeholder="CVV" style={styles.input} value={cvv} onChangeText={setCvv} keyboardType="numeric" secureTextEntry />

        <TouchableOpacity style={styles.buyBtn} onPress={handleBuyNow} activeOpacity={0.9}>
          <Text style={styles.buyText}>Buy Now</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const BADGE_W = 36;
const BADGE_H = 22;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
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
  container: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#214E34", marginBottom: 8 },
  input: {
    borderWidth: 1, borderColor: "#ddd", borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 14, fontSize: 15, color: "#333",
  },
  brandRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  brandBtn: {
    flex: 1, borderWidth: 1, borderColor: "#E1EDE6",
    borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12,
    alignItems: "center", justifyContent: "center", backgroundColor: "#fff",
  },
  brandBtnActive: { borderColor: "#5B8E55", backgroundColor: "#EAF4EF" },
  brandLabel: { marginTop: 6, fontWeight: "700", color: "#333" },
  brandLabelActive: { color: "#2f6f3e" },
  visaBadge: {
    width: BADGE_W, height: BADGE_H, borderRadius: 4,
    borderWidth: 2, borderColor: "#1a237e",
    alignItems: "center", justifyContent: "center",
    backgroundColor: "#eef1ff",
  },
  visaText: { fontWeight: "900", color: "#1a237e", fontSize: 12 },
  mcBadge: { width: BADGE_W, height: BADGE_H, alignItems: "center", justifyContent: "center" },
  mcCircleLeft: {
    position: "absolute", width: BADGE_H, height: BADGE_H,
    borderRadius: BADGE_H / 2, backgroundColor: "#EB001B",
    left: BADGE_W / 2 - BADGE_H + 8,
  },
  mcCircleRight: {
    position: "absolute", width: BADGE_H, height: BADGE_H,
    borderRadius: BADGE_H / 2, backgroundColor: "#F79E1B",
    left: BADGE_W / 2 - 8,
  },
  buyBtn: { backgroundColor: "#5B8E55", paddingVertical: 14, borderRadius: 10, alignItems: "center", marginTop: 20 },
  buyText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
