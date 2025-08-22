
import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";

const { width } = Dimensions.get("window");

export default function PlantDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { plant } = route.params || {};

  const isOnSale = !!plant?.forSale;

  return (
    <View style={styles.container}>
      {/* Scrollable Content */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="black" />
        </TouchableOpacity>

        {/* Image */}
        <Image
          source={{ uri: plant?.imageUrl }}
          style={styles.image}
          resizeMode="cover"
        />

        {/* Main Content */}
        <View style={styles.content}>
          <Text style={styles.title}>{plant?.name}</Text>


          {/* Sale Status */}
          <View style={styles.saleStatusContainer}>
            {/* On Sale */}
            <View
              style={[
                styles.statusPill,
                isOnSale ? styles.activeGreen : styles.inactiveGray,
              ]}
            >
              <Ionicons name="pricetag" size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.statusText}>On Sale</Text>
            </View>

            {/* Not on Sale */}
            <View
              style={[
                styles.statusPill,
                !isOnSale ? styles.activeRed : styles.inactiveGray,
              ]}
            >
              <Ionicons name="close-circle" size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.statusText}>Not on Sale</Text>
            </View>
          </View>

          {/* Price (if any) */}
          {typeof plant?.price !== "undefined" && plant?.price !== null && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Price</Text>
              <Text style={styles.priceValue}>${Number(plant.price).toFixed(2)}</Text>
            </View>
          )}

          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>
            {plant?.description || "No description available."}
          </Text>

          {/* Spacer */}
          <View style={{ height: 60 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const PILL_RADIUS = 18;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scrollContent: {
    paddingBottom: 40,
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 10,
    backgroundColor: "#ffffffaa",
    padding: 10,
    borderRadius: 30,
  },
  image: {
    width: width,
    height: 400,
    marginBottom: 20,
    alignSelf: "center",
    backgroundColor: "#f2f2f2",
  },
  content: {
    padding: 20,
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -30,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#3e784b",
  },
  subtitle: {
    fontSize: 14,
    color: "#888",
    marginBottom: 12,
  },
  saleStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: PILL_RADIUS,
  },
  activeGreen: {
    backgroundColor: "#2e7d32",
  },
  activeRed: {
    backgroundColor: "#d32f2f",
  },
  inactiveGray: {
    backgroundColor: "#cfd8dc",
  },
  statusText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F0F6F2",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  priceLabel: { color: "#40664b", fontWeight: "700" },
  priceValue: { color: "#1b1b1b", fontWeight: "800" },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 5,
  },
  description: {
    fontSize: 15,
    color: "#444",
    lineHeight: 22,
  },
});