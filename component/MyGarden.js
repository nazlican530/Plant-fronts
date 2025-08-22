// screens/MyGarden.js
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, FlatList,
  SafeAreaView, ActivityIndicator, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'http://192.168.150.59:3000';

// Görsel yolunu normalize et
const toImageUrl = (imgField) => {
  if (!imgField) return null;
  if (typeof imgField === 'string' && /^https?:\/\//.test(imgField)) return imgField;
  if (typeof imgField === 'string') {
    if (imgField.startsWith('/')) return `${BASE_URL}${imgField}`;
    return `${BASE_URL}/images/${encodeURIComponent(imgField)}`;
  }
  if (imgField?.url) {
    return imgField.url.startsWith('http')
      ? imgField.url
      : `${BASE_URL}${imgField.url.startsWith('/') ? '' : '/'}${imgField.url}`;
  }
  if (imgField?.path) {
    return imgField.path.startsWith('http')
      ? imgField.path
      : `${BASE_URL}${imgField.path.startsWith('/') ? '' : '/'}${imgField.path}`;
  }
  if (imgField?.filename) {
    return `${BASE_URL}/images/${encodeURIComponent(imgField.filename)}`;
  }
  return null;
};

export default function MyGarden() {
  const navigation = useNavigation();
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(false);

  // kategoriler (etiket gösterimi için)
  const [catMap, setCatMap] = useState({});
  const [catLoading, setCatLoading] = useState(false);

  // silme işlemi için id
  const [deletingId, setDeletingId] = useState(null);

  const loadCategories = useCallback(async () => {
    try {
      setCatLoading(true);
      const res = await fetch(`${BASE_URL}/api/categories`);
      const json = await res.json();
      const list = json?.data || json || [];
      const map = {};
      (Array.isArray(list) ? list : []).forEach(c => {
        const id = c?._id || c?.id;
        const name = c?.name || c?.title || id;
        if (id) map[id] = name;
      });
      setCatMap(map);
    } catch (e) {
      console.log('Kategori fetch error:', e);
    } finally {
      setCatLoading(false);
    }
  }, []);

  const loadMyPlants = useCallback(async () => {
    try {
      setLoading(true);
      const raw = await AsyncStorage.getItem('user');
      const user = raw ? JSON.parse(raw) : null;
      const userId = user?._id;
      if (!userId) {
        setPlants([]);
        return;
      }
      const token = await AsyncStorage.getItem('token');

      const res = await fetch(`${BASE_URL}/api/plants/user/${userId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      const list = json?.data || [];
      setPlants(Array.isArray(list) ? list : []);
    } catch (e) {
      console.log('My plants fetch error:', e);
      setPlants([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCategories(); }, [loadCategories]);
  useFocusEffect(useCallback(() => { loadMyPlants(); }, [loadMyPlants]));

  const categoryLabel = (item) => {
    const idsMaybe =
      item?.categoriesIds ||
      item?.categoryIds ||
      item?.categories ||
      (item?.categoryId ? [item.categoryId] : null) ||
      (item?.category ? [item.category] : null);

    if (!idsMaybe) return null;
    const ids = Array.isArray(idsMaybe) ? idsMaybe : [idsMaybe];
    const names = ids
      .map(x => {
        if (!x) return null;
        if (typeof x === 'string') return catMap[x] || x;
        const id = x?._id || x?.id;
        const name = x?.name || x?.title;
        return name || (id ? (catMap[id] || id) : null);
      })
      .filter(Boolean);
    return names.length ? names.join(', ') : null;
  };

  const confirmDelete = (plantId, plantName) => {
    Alert.alert(
      'Silinsin mi?',
      `"${plantName || 'Bu bitki'}" silinecek. Emin misin?`,
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: () => handleDelete(plantId) },
      ]
    );
  };

  const handleDelete = async (plantId) => {
    try {
      setDeletingId(plantId);
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${BASE_URL}/api/plants/${plantId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || `Silme başarısız (HTTP ${res.status})`);
      }
      setPlants(prev => prev.filter(p => (p._id || p.id) !== plantId));
    } catch (e) {
      Alert.alert('Hata', e.message || 'Silme işlemi başarısız.');
    } finally {
      setDeletingId(null);
    }
  };

  const startEdit = async (plant, photo) => {
    try {
      const draft = {
        mode: 'edit',
        _id: plant?._id || plant?.id,
        name: plant?.name || '',
        description: plant?.description || '',
        imageUrl: photo || null,
        categoriesIds:
          plant?.categoriesIds ||
          plant?.categoryIds ||
          (plant?.categoryId ? [plant.categoryId] : []) ||
          (plant?.category ? [plant.category] : []),
        createdBy: plant?.createdBy || plant?.userId || null,
        watering:  plant?.watering ?? false,
        sunlight:  plant?.sunlight ?? false,
        nutrients: plant?.nutrients ?? false,
        humidity:     plant?.humidity ?? '',
        height:       plant?.height ?? '',
        temperature:  plant?.temperature ?? '',
        forSale: plant?.forSale ?? false,
        price:   plant?.price ?? '',
      };
      await AsyncStorage.setItem('editPlantDraft', JSON.stringify(draft));
      navigation.navigate('AddPlantScreen', { mode: 'edit', plant: draft, imageUrl: photo });
    } catch (e) {
      console.log('edit draft save error', e);
      navigation.navigate('AddPlantScreen', { mode: 'edit', plant, imageUrl: photo });
    }
  };

  const renderPlant = ({ item }) => {
    const id = item?._id || item?.id;
    const photo = toImageUrl(item?.image || item?.imagePath || item?.photo || item?.file);
    const catText = categoryLabel(item);
    const desc = item?.description || '';

    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
          activeOpacity={0.9}
          onPress={() =>
            navigation.navigate('PlantCareScreen', { plant: item, imageUrl: photo })
          }
        >
          {photo ? (
            <Image source={{ uri: photo }} style={styles.cardImage} />
          ) : (
            <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
              <Ionicons name="leaf-outline" size={28} color="#888" />
            </View>
          )}

          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item?.name || 'Unnamed plant'}
            </Text>
            {!!catText && (
              <Text style={styles.cardSubtitle} numberOfLines={1}>
                {catText}
              </Text>
            )}
            {!!desc && (
              <Text style={styles.cardDesc} numberOfLines={2}>
                {desc}
              </Text>
            )}
            <View style={styles.cardRow}>
              <Ionicons name="water-outline" size={16} color="#666" />
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.actionsCol}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => startEdit(item, photo)}
            activeOpacity={0.9}
          >
            <Ionicons name="create-outline" size={16} color="#fff" />
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteBtnNew}
            onPress={() => confirmDelete(id, item?.name)}
            disabled={deletingId === id}
            activeOpacity={0.9}
          >
            {deletingId === id ? (
              <ActivityIndicator size="small" color="#e74c3c" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={16} color="#e74c3c" />
                <Text style={styles.deleteText}>Delete</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerText}>
          <Text style={styles.bold}>Water </Text>
          <Text style={styles.green}>Plants</Text>
        </Text>
        <TouchableOpacity onPress={loadMyPlants} style={styles.refreshBtn}>
          {loading ? <ActivityIndicator /> : <Ionicons name="refresh" size={22} color="#5B8E55" />}
        </TouchableOpacity>
      </View>

      {loading && plants.length === 0 ? (
        <ActivityIndicator style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={plants}
          keyExtractor={(it) => it?._id || it?.id || String(it?.name + Math.random())}
          renderItem={renderPlant}
          contentContainerStyle={{ paddingBottom: 150 }}
          refreshing={loading}
          onRefresh={loadMyPlants}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', marginTop: 20, color: '#666' }}>
              Henüz bitki eklemediniz.
            </Text>
          }
        />
      )}

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('AddPlantScreen')}
      >
        <Ionicons name="add" size={32} color="white" />
      </TouchableOpacity>

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

        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('PeopleScreen')}
        >
          <Ionicons name="people-outline" size={28} color="#5B8E55" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('StoreScreen')}
        >
          <Ionicons name="storefront-outline" size={28} color="#5B8E55" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },

  header: {
    marginTop: 50, marginBottom: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20
  },
  headerText: { fontSize: 28, color: '#000' },
  bold: { fontWeight: 'bold' }, green: { color: '#4CAF50' },
  refreshBtn: { padding: 8 },

  card: {
    flexDirection: 'row',
    alignItems: 'stretch',
    padding: 15, marginHorizontal: 20, marginVertical: 8,
    borderRadius: 15, backgroundColor: '#f5f5f5',
  },

  cardImage: { width: 60, height: 60, borderRadius: 10, marginRight: 15 },
  cardImagePlaceholder: { backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1, justifyContent: 'center' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  cardSubtitle: { fontSize: 13, color: '#4CAF50', marginTop: 2 },
  cardDesc: { fontSize: 12, color: '#666', marginTop: 2 },

  actionsCol: {
    width: 92,
    marginLeft: 10,
    justifyContent: 'space-between',
  },
  editBtn: {
    backgroundColor: '#5B8E55',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  editText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  deleteBtnNew: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#f0d5d5',
  },
  deleteText: { color: '#e74c3c', fontWeight: '700', fontSize: 12 },

  addButton: {
    position: 'absolute', bottom: 100, right: 30, marginBottom: 40, 
    width: 78, height: 78, backgroundColor: '#4CAF50',
    borderRadius: 37, alignItems: 'center', justifyContent: 'center',
    elevation: 4, zIndex: 10
  },

 
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    backgroundColor: "#fff"
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