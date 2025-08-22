// screens/PeopleScreen.js
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const BASE_URL = 'http://192.168.150.59:3000';
const API_USERS = `${BASE_URL}/api/users`;
const { width } = Dimensions.get('window');
const CARD_GAP = 14;
const H_PADDING = 20;
// 2 sütun için kart genişliği
const CARD_W = (width - H_PADDING * 2 - CARD_GAP) / 2;

const toAvatar = (u) =>
  u?.image
    ? `${BASE_URL}/images/${encodeURIComponent(u.image)}?t=${encodeURIComponent(
        u.updatedAt || Date.now()
      )}`
    : 'https://ui-avatars.com/api/?background=E9F3EC&color=214E34&name=' +
      encodeURIComponent(`${u?.firstName || ''} ${u?.lastName || ''}`.trim() || 'User');

export default function PeopleScreen({ navigation }) {
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(API_USERS);
      const json = await res.json();
      setUsers(Array.isArray(json?.data) ? json.data : []);
    } catch (e) {
      console.log('Kullanıcılar alınamadı:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  }, [fetchUsers]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return users;
    return users.filter((u) => {
      const full = `${u?.firstName || ''} ${u?.lastName || ''}`.toLowerCase();
      return (
        full.includes(s) ||
        (u?.email || '').toLowerCase().includes(s) ||
        (u?.city || u?.location || '').toLowerCase().includes(s)
      );
    });
  }, [users, q]);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      style={styles.card}
      onPress={() => navigation.navigate('PeopleDetail', { userId: item._id })}
    >
      <Image source={{ uri: toAvatar(item) }} style={styles.cardImage} />
      <Text style={styles.name} numberOfLines={1}>
        {item?.firstName || ''} {item?.lastName || ''}
      </Text>
      <View style={styles.locRow}>
        <Ionicons name="location-outline" size={14} color="#6d6d6d" />
        <Text style={styles.locText} numberOfLines={1}>
          {item?.city || item?.location || '—'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backCircle} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color="#214E34" />
        </TouchableOpacity>
        <View style={{ flex: 1, paddingLeft: 10 }}>
          <Text style={styles.h1}>Explore</Text>
          <Text style={styles.h2}>Connection</Text>
        </View>
      </View>

      {/* SEARCH BAR (en üstte) */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#7aa086" />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search users, city, email…"
          placeholderTextColor="#8BA99A"
          style={styles.searchInput}
          returnKeyType="search"
        />
        {q.length > 0 && (
          <TouchableOpacity onPress={() => setQ('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close-circle" size={18} color="#8BA99A" />
          </TouchableOpacity>
        )}
      </View>

      {/* SECTION TITLE */}
      <Text style={styles.sectionTitle}>Nearby Connection</Text>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color="#5B8E55" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(it) => it?._id?.toString() ?? Math.random().toString(36)}
          numColumns={2}
          contentContainerStyle={{ paddingHorizontal: H_PADDING, paddingBottom: 24 }}
          columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: CARD_GAP }}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#5B8E55" />}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', color: '#7a7a7a', marginTop: 24 }}>
              Sonuç bulunamadı.
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: H_PADDING,
    paddingTop: 6,
    paddingBottom: 8,
  },
  backCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#E1EDE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EAF4EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  h1: { fontSize: 28, fontWeight: '700', color: '#111' },
  h2: { fontSize: 28, fontWeight: '800', color: '#111' },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: H_PADDING,
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EAF4EF',
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#214E34', paddingVertical: 0 },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3B3B3B',
    marginHorizontal: H_PADDING,
    marginBottom: 10,
    marginTop: 4,
  },

  card: {
    width: CARD_W,
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  cardImage: { width: '100%', height: CARD_W, resizeMode: 'cover' },
  name: { paddingTop: 8, paddingHorizontal: 10, fontWeight: '700', color: '#1a1a1a' },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingBottom: 10,
    paddingTop: 4,
    gap: 4,
  },
  locText: { color: '#6d6d6d', fontSize: 12, flexShrink: 1 },
});