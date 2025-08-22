// screens/MyPlantsScreen.js
import React, { useEffect, useMemo, useState, useCallback } from 'react';
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

const { width } = Dimensions.get('window');
const GUTTER = 20;
const CARD_GAP = 10;
const COLS = 2;
const CARD_W = (width - GUTTER * 2 - CARD_GAP) / COLS;

const BASE_URL = 'http://192.168.150.59:3000';

// Görsel URL'sini farklı backend alan adlarından güvenli kur
const img = (f) => `${BASE_URL}/images/${encodeURIComponent(f || '')}`;
const getImageUrl = (item) => {
  const any = item?.imageUrl || item?.image || item?.imagePath || item?.photo || item?.file;
  if (!any) return null;
  if (typeof any === 'string' && /^https?:\/\//.test(any)) return any;
  if (typeof any === 'string') {
    if (any.startsWith('/')) return `${BASE_URL}${any}`;
    return img(any);
  }
  if (any?.url) return any.url.startsWith('http') ? any.url : `${BASE_URL}${any.url}`;
  if (any?.path) return any.path.startsWith('http') ? any.path : `${BASE_URL}${any.path}`;
  if (any?.filename) return img(any.filename);
  return null;
};

export default function MyPlantsScreen() {
  const navigation = useNavigation();

  const [myPlants, setMyPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saleFilter, setSaleFilter] = useState('all'); // 'all' | 'on' | 'off'

  // Profil
  const [authUser, setAuthUser] = useState(null);

  const computePhotoUrl = (u) =>
    u?.image
      ? `${BASE_URL}/images/${encodeURIComponent(u.image)}?t=${encodeURIComponent(
          u?.updatedAt || Date.now()
        )}`
      : null;

  const initials = (u) =>
    `${u?.firstName?.[0] ?? ''}${u?.lastName?.[0] ?? ''}`.toUpperCase() || '?';

  const loadAuthUser = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('user');
      const stored = raw ? JSON.parse(raw) : null;

      if (stored?._id) {
        setAuthUser(stored);
        return;
      }

      const onlyId = await AsyncStorage.getItem('userId');
      if (onlyId) {
        try {
          const r = await fetch(`${BASE_URL}/api/users/${onlyId}`);
          const j = await r.json();
          if (r.ok && j?.data) {
            setAuthUser(j.data);
            await AsyncStorage.setItem('user', JSON.stringify(j.data));
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
  }, []);

  const fetchMyPlants = useCallback(async () => {
    try {
      setLoading(true);
      const userId =
        (await AsyncStorage.getItem('userId')) ||
        JSON.parse((await AsyncStorage.getItem('user')) || '{}')._id;

      const response = await fetch(`${BASE_URL}/api/plants/user/${userId}`);
      const json = await response.json();
      setMyPlants(Array.isArray(json?.data) ? json.data : []);
    } catch (error) {
      console.error('Could not load plants:', error);
      setMyPlants([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAuthUser();
    fetchMyPlants();
  }, [loadAuthUser, fetchMyPlants]);

  const photoUrl = computePhotoUrl(authUser);

  // Filtre uygula
  const filteredPlants = useMemo(() => {
    if (saleFilter === 'on') return myPlants.filter((p) => !!p?.forSale);
    if (saleFilter === 'off') return myPlants.filter((p) => !p?.forSale);
    return myPlants;
  }, [myPlants, saleFilter]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 90 }}>
        {/* HEADER */}
        <View style={styles.topRow}>
          <Text style={styles.header}>
            My <Text style={styles.highlight}>Plants</Text>
          </Text>

          <TouchableOpacity onPress={() => navigation.navigate('ProfileScreen')} activeOpacity={0.8}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.profilePic} />
            ) : (
              <View style={[styles.profilePic, styles.profilePlaceholder]}>
                <Text style={styles.profileInitials}>{initials(authUser)}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* FİLTRELER */}
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
            <Text
              style={[styles.filterChipText, saleFilter === 'off' && styles.filterChipTextActive]}
            >
              Not on Sale
            </Text>
          </TouchableOpacity>
        </View>

        {/* GRID */}
        {loading ? (
          <ActivityIndicator size="large" color="#5B8E55" style={{ marginTop: 100 }} />
        ) : filteredPlants.length === 0 ? (
          <View style={{ marginTop: 50, alignItems: 'center' }}>
            <Text style={{ fontSize: 16, color: '#999' }}>No plants found.</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {filteredPlants.map((item) => {
              const uri = getImageUrl(item);
              return (
                <View key={item._id || item.id} style={styles.cardContainer}>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('PlantDetailScreen', { plant: item })}
                    style={styles.card}
                    activeOpacity={0.9}
                  >
                    <View style={styles.imageWrap}>
                      {uri ? (
                        <Image source={{ uri }} style={styles.cardImage} />
                      ) : (
                        <View style={styles.imagePlaceholder}>
                          <Ionicons name="leaf-outline" size={28} color="#8BAA8F" />
                        </View>
                      )}
                    </View>

                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {item?.name || 'Unnamed'}
                    </Text>

                    {/* status pill */}
                    <View style={[styles.salePill, item?.forSale ? styles.pillOn : styles.pillOff]}>
                      <Text style={styles.pillText}>
                        {item?.forSale ? 'On Sale' : 'Not on Sale'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* BOTTOM NAV — tam hizalı */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('FavoritePlantsScreen')}
        >
          <Ionicons name="heart-outline" size={28} color="#5B8E55" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('WeatherScreen')}
        >
          <Ionicons name="partly-sunny-outline" size={28} color="#5B8E55" />
        </TouchableOpacity>

        <TouchableOpacity
                 style={styles.centerButton}
                 onPress={() => navigation.popToTop()}
               >
                 <Ionicons name="home" size={32} color="#fff" />
               </TouchableOpacity>
       
        <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('PeopleScreen')}>
          <Ionicons name="people-outline" size={28} color="#5B8E55" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('StoreScreen')}>
          <Ionicons name="storefront-outline" size={28} color="#5B8E55" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const CHIP_W = (width - GUTTER * 2 - CARD_GAP) / 3;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { paddingHorizontal: GUTTER, paddingTop: 20 },

  // Header
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  header: { fontSize: 29, fontWeight: 'bold', color: '#333' },
  highlight: { color: '#5B8E55' },

  profilePic: { width: 40, height: 40, borderRadius: 20 },
  profilePlaceholder: {
    backgroundColor: '#e6efe7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitials: { color: '#5B8E55', fontWeight: '700' },

  // Filters
  filtersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    marginTop: 10,
  },
  filterChip: {
    width: CHIP_W,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EDF5ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: '#5B8E55',
  },
  filterChipText: { color: '#5B8E55', fontWeight: '700' },
  filterChipTextActive: { color: '#fff' },

  // Grid / Cards
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cardContainer: {
    width: CARD_W,
    marginBottom: 14,
  },
  card: {
    backgroundColor: '#EBECD2',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    paddingBottom: 10,
  },
  imageWrap: {
    width: '100%',
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F6EF',
  },
  cardImage: {
    width: '92%',
    height: '92%',
    resizeMode: 'contain',
  },
  imagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F1EA',
  },
  cardTitle: {
    fontWeight: '700',
    fontSize: 16,
    color: '#333',
    paddingHorizontal: 10,
    paddingTop: 8,
  },

  // status pill
  salePill: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  pillOn: { backgroundColor: '#EAF4EF' },
  pillOff: { backgroundColor: '#ECEFF1' },
  pillText: { fontSize: 11, fontWeight: '700', color: '#3b3b3b' },

  // Bottom Nav — tam hizalı
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    backgroundColor: '#fff',
  },
  navButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#5B8E55',
    alignItems: 'center',
    justifyContent: 'center',
  },
});