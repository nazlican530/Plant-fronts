import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  TextInput, ScrollView, ActivityIndicator, Dimensions, Image,
  Alert, ImageBackground
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const OPEN_WEATHER_API_KEY = '51c87e0d3db899e5333e26019b7a6882';
const owIcon = (code) => `https://openweathermap.org/img/wn/${code}@2x.png`;

const pad2 = (n) => String(n).padStart(2, '0');
const makeTZHelpers = (timezoneSec) => {
  const toCityDate = (unix) => new Date((unix + timezoneSec) * 1000);
  const ymdFromUnix = (unix) => {
    const d = toCityDate(unix);
    return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
  };
  const dayLabelFromUnix = (unix) =>
    new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' })
      .format(toCityDate(unix))
      .toUpperCase();
  const hourFromUnix = (unix) => toCityDate(unix).getUTCHours();
  return { ymdFromUnix, dayLabelFromUnix, hourFromUnix };
};

async function fetchWeather(city) {
  const curRes = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${OPEN_WEATHER_API_KEY}`
  );
  if (!curRes.ok) throw new Error('City not found');
  const cur = await curRes.json();

  const fcRes = await fetch(
    `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(cur.name)}&units=metric&appid=${OPEN_WEATHER_API_KEY}`
  );
  if (!fcRes.ok) throw new Error('Forecast fetch failed');
  const fc = await fcRes.json();

  const tz = (fc?.city?.timezone ?? cur.timezone) || 0;
  const { ymdFromUnix, dayLabelFromUnix, hourFromUnix } = makeTZHelpers(tz);

  const nowTemp = Math.round(cur.main?.temp ?? 0);
  const nowMain = cur.weather?.[0]?.main ?? 'Clear';
  const nowDesc = cur.weather?.[0]?.description ?? '';
  const nowIcon = cur.weather?.[0]?.icon ?? '01d';

  // forecast -> günlere grupla
  const byDay = {};
  (fc.list || []).forEach((it) => {
    const key = ymdFromUnix(it.dt);
    (byDay[key] ||= []).push(it);
  });

  const keys = Object.keys(byDay).sort().slice(0, 5);

  const pickIcon = (list) => {
    let best = list[0], bestDiff = 999;
    for (const it of list) {
      const diff = Math.abs(12 - hourFromUnix(it.dt));
      if (diff < bestDiff) { bestDiff = diff; best = it; }
    }
    return best?.weather?.[0]?.icon ?? '01d';
  };

  const daily = keys.map((k, idx) => {
    const list = byDay[k];
    const temps = list.map((i) => i.main?.temp).filter((n) => typeof n === 'number');
    const pops  = list.map((i) => i.pop || 0);
    const midUnix = list[Math.floor(list.length / 2)].dt;
    return {
      key: k,
      day: dayLabelFromUnix(midUnix),
      temp: temps.length ? Math.round(temps.reduce((a, b) => a + b, 0) / temps.length) : 0,
      hi:   temps.length ? Math.round(Math.max(...temps)) : 0,
      lo:   temps.length ? Math.round(Math.min(...temps)) : 0,
      pop:  pops.length ? Math.max(...pops) : 0,
      icon: pickIcon(list),
      active: idx === 0,
    };
  });

  const today = daily[0] || { hi: nowTemp, lo: nowTemp };

  return {
    city: cur.name,
    now: { main: nowMain, temp: nowTemp, hi: today.hi, lo: today.lo, desc: nowDesc, icon: nowIcon },
    daily,
  };
}

export default function WeatherScreen({ route, navigation }) {
  const initialCity = route?.params?.initialCity || 'Istanbul';
  const [search, setSearch] = useState(initialCity);
  const [city, setCity] = useState(initialCity);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async (c) => {
    try {
      setLoading(true);
      const w = await fetchWeather(c);
      setData(w);
      setCity(w.city);
      await AsyncStorage.setItem('weatherCity', w.city);
    } catch (e) {
      setData(null);
      Alert.alert('Weather', e?.message || 'Could not load weather.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(initialCity); }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#cde8dc' }}>
      {/* Arka plan */}
      <ImageBackground
        source={{ uri: 'https://canakkaleolay.com/public/photos/news/2024/202401/haber-58065/76686805_58065_gokyuzu-neden-mavidir-bil.jpg' }}
        resizeMode="cover"
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.18)', 'rgba(0,0,0,0.06)', 'rgba(0,0,0,0.02)']}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color="#214E34" />
        </TouchableOpacity>
        <Text style={styles.title}>Weather</Text>
        <View style={styles.spacer} />
      </View>

      {/* Şehir arama */}
      <View style={styles.searchRow}>
        <Ionicons name="location-outline" size={18} color="#2f6f3e" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search city..."
          placeholderTextColor="#6c9a7d"
          style={styles.searchInput}
          returnKeyType="search"
          onSubmitEditing={() => load(search)}
        />
        <TouchableOpacity style={styles.searchBtn} onPress={() => load(search)} activeOpacity={0.9}>
          <Ionicons name="search" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color="#2f6f3e" />
        ) : !data ? (
          <Text style={{ textAlign: 'center', marginTop: 30, color: '#fff' }}>
            Couldn’t load weather. Try another city.
          </Text>
        ) : (
          <View style={styles.bigCard}>
            <View style={styles.rowTop}>
              <Text style={styles.cityText}>
                <Ionicons name="location-sharp" size={14} color="#2f6f3e" /> {city}
              </Text>
              <Text style={styles.timeText}>
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>

            <View style={{ alignItems: 'center', marginTop: 8 }}>
              <Image source={{ uri: owIcon(data.now.icon) }} style={{ width: 120, height: 120 }} />
              <Text style={styles.mainText}>{data.now.main}</Text>
              <Text style={styles.tempBig}>{data.now.temp}°</Text>
              <Text style={styles.descText}>{data.now.desc || 'Mostly Clear'}</Text>
              <Text style={styles.hilo}>H:{data.now.hi}°   L:{data.now.lo}°</Text>
            </View>

            {/* Günler */}
            <View style={styles.daysRow}>
              {data.daily.map((d) => (
                <View key={d.key} style={[styles.dayChip, d.active && styles.dayChipActive]}>
                  <Image source={{ uri: owIcon(d.icon) }} style={{ width: 28, height: 28 }} />
                  <Text style={[styles.dayText, d.active && styles.dayTextActive]}>{d.day}</Text>
                  <Text style={[styles.dayTemp, d.active && styles.dayTextActive]}>{d.temp}°</Text>
                  <Text style={[styles.pop, d.active && styles.dayTextActive]}>{Math.round(d.pop * 100)}%</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingTop: 6, paddingBottom: 8,
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 14, borderWidth: 1,
    borderColor: '#E1EDE6', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff'
  },
  spacer: { width: 40, height: 40 },
  title: { flex: 1, textAlign: 'center', fontSize: 25, fontWeight: '900', color: 'black' },

  searchRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffffde',
    marginHorizontal: 14, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 8, gap: 8,
    borderWidth: 1, borderColor: '#E1EDE6'
  },
  searchInput: { flex: 1, color: '#1a1a1a', paddingVertical: 4 },
  searchBtn: { backgroundColor: '#5E8BB8', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },

  bigCard: {
    marginTop: 16,
    marginHorizontal: 14,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.3)', 
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },

  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cityText: { color: '#17233B', fontWeight: '700' },
  timeText: { color: '#445', opacity: 0.9, fontSize: 15 },

  mainText: { marginTop: 6, fontSize: 18, color: '#274B91', fontWeight: '700' },
  tempBig: { fontSize: 52, fontWeight: '900', color: '#1a1a1a', marginTop: 2 },
  descText: { color: '#274B91', marginTop: 4, fontWeight: '600' },
  hilo: { color: '#1a1a1a', marginTop: 6, fontWeight: '600' },

  daysRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  dayChip: {
    width: (width - 14 * 2 - 16 * 2) / 5 - 6,
    alignItems: 'center', paddingVertical: 10, borderRadius: 18,
    backgroundColor: '#F8FAFD',
  },
  dayChipActive: { backgroundColor: '#274B91' },
  dayText: { marginTop: 4, color: '#274B91', fontWeight: '700', fontSize: 12 },
  dayTextActive: { color: '#fff' },
  dayTemp: { color: '#111', fontWeight: '800', marginTop: 2 },
  pop: { color: '#274B91', marginTop: 2, fontWeight: '700', fontSize: 12 },
});
