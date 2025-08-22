import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export default function WeatherCard({ weather }) {
  if (!weather) return null;

  return (
    <LinearGradient
      colors={["#5B8E55", "#3BB2D0"]} // yeşilden maviye geçiş
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.row}>
        <Image
          source={{
            uri: `https://openweathermap.org/img/wn/${weather.icon}@2x.png`,
          }}
          style={styles.icon}
        />
        <View>
          <Text style={styles.temp}>{weather.temp}°</Text>
          <Text style={styles.range}>{weather.range}</Text>
        </View>
      </View>
      <Text style={styles.location}>{weather.location}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 150,
    height: 120,
    borderRadius: 15,
    padding: 12,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    width: 50,
    height: 50,
    marginRight: 10,
  },
  temp: {
    fontSize: 22,
    color: "#fff",
    fontWeight: "bold",
  },
  range: {
    fontSize: 14,
    color: "#fff",
  },
  location: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
