// screens/PeopleDetailScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  FlatList,
  Dimensions,
  RefreshControl,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur'; // Expo Blur arkası için bulanık 

const BASE_URL = 'http://192.168.150.59:3000';
const API_USER = (id) => `${BASE_URL}/api/users/${id}`;
const API_PLANTS_BY_USER = (id, extra = '') => `${BASE_URL}/api/plants/user/${id}${extra}`;
const { width } = Dimensions.get('window'); // Ekran genişliği
const H_PADDING = 20; // Yatay padding 
const MINI = 68;
const GAP = 10;

const toAvatar = (u) =>
  u?.image
    ? `${BASE_URL}/images/${encodeURIComponent(u.image)}?t=${encodeURIComponent(
        u.updatedAt || Date.now()
      )}`
    : 'https://ui-avatars.com/api/?background=E9F3EC&color=214E34&name=' +
      encodeURIComponent(`${u?.firstName || ''} ${u?.lastName || ''}`.trim() || 'User');

const toPlantImg = (p) =>
  p?.image ? `${BASE_URL}/images/${encodeURIComponent(p.image)}` : 'https://picsum.photos/seed/plantio/200';

export default function PeopleDetailScreen({ route, navigation }) {
  const userId = route?.params?.userId;
  const [user, setUser] = useState(null);
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // modal görünürlüğü
  const [avatarVisible, setAvatarVisible] = useState(false);

  const loadAll = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const [uRes, pRes] = await Promise.all([
        fetch(API_USER(userId)),
        fetch(API_PLANTS_BY_USER(userId, '?per_page=50')),
      ]);
      const uJson = await uRes.json();
      const pJson = await pRes.json();
      setUser(uJson?.data || null);
      setPlants(Array.isArray(pJson?.data) ? pJson.data : []);
    } catch (e) {
      console.log('PeopleDetail load error:', e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }, [loadAll]);

  const header = (
    <View style={styles.headerCard}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backCircle} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color="#214E34" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Profile
        </Text>
        <View style={{ width: 34 }} />
      </View>

      <View style={styles.profileRow}>
        {/* Avatar: modal aç */}
        <TouchableOpacity onPress={() => setAvatarVisible(true)} activeOpacity={0.8}>
          <Image source={{ uri: toAvatar(user) }} style={styles.avatar} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.name}>
            {(user?.firstName || '') + ' ' + (user?.lastName || '')}
          </Text>
          {!!user?.email && <Text style={styles.email}>{user.email}</Text>}
        </View>
      </View>

      <Text style={styles.sectionTitle}>Plants</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator style={{ marginTop: 32 }} color="#5B8E55" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* === Modal: Blur + hafif siyah arka plan === */}
      <Modal
        visible={avatarVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAvatarVisible(false)}
      >
        {/* Dış alana basınca kapansın */}
        <TouchableWithoutFeedback onPress={() => setAvatarVisible(false)}>
          <View style={styles.overlayRoot}>
            {/* Blur layer (tam ekran) */}
            <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
            {/* Hafif siyah ton (blur üstüne) */}
            <View style={styles.dimLayer} />

            {/* Merkezde yuvarlak fotoğraf */}
            <View style={styles.centeredView}>
              <TouchableOpacity activeOpacity={0.9} onPress={() => setAvatarVisible(false)}>
                <Image source={{ uri: toAvatar(user) }} style={styles.modalAvatar} />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <FlatList
        data={plants}
        keyExtractor={(it) => it?._id?.toString() ?? Math.random().toString(36)}
        numColumns={Math.floor((width - H_PADDING * 2 + GAP) / (MINI + GAP)) || 4}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingHorizontal: H_PADDING, paddingBottom: 24 }}
        columnWrapperStyle={{ gap: GAP }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.miniItem}
            activeOpacity={0.85}
            onPress={() =>
              navigation.navigate('PriceScreen', {
                plant: item,
                imageUrl: toPlantImg(item),
                price: typeof item?.price === 'number' ? item.price : 65,
                from: 'PeopleDetail',
              })
            }
          >
            <Image source={{ uri: toPlantImg(item) }} style={styles.miniImg} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', color: '#7a7a7a', marginTop: 12 }}>
            No plants found.
          </Text>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#5B8E55" />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },

  // header
  headerCard: { paddingHorizontal: H_PADDING, paddingTop: 6, paddingBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  backCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#E1EDE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: '#1a1a1a' },

  profileRow: { flexDirection: 'row', gap: 12, alignItems: 'center', marginTop: 6 },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#EAF4EF' },
  name: { fontSize: 23, fontWeight: '1000', color: '#111' },
  email: { color: '#214E34', marginTop: 4, fontSize: 20, fontWeight: '500' },

  sectionTitle: { fontSize: 30, fontWeight: '700', color: '#3B3B3B', marginTop: 30, marginBottom: 12 },

  // grid
  miniItem: {
    width: 130,
    height: 130,
    borderRadius: 40,
    overflow: 'hidden',
    backgroundColor: '#F0F6F2',
    marginBottom: GAP,
  },
  miniImg: { width: '100%', height: '100%' },

  // modal/blur
  overlayRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dimLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.50)', // hafif siyah ton
  },
  centeredView: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalAvatar: {
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: width * 0.35,
    borderWidth: 3,
    borderColor: '#fff',
  },
});
