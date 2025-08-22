
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';
import { FontAwesome } from '@expo/vector-icons';

const BASE_URL = 'http://192.168.150.59:3000';
const API_URL = `${BASE_URL}/api/users`;

async function compressToLimit(uri, maxBytes = 4.5 * 1024 * 1024) {
  let out = uri, width = 1440, quality = 0.8;
  for (let i = 0; i < 3; i++) {
    const r = await ImageManipulator.manipulateAsync(
      out,
      [{ resize: { width } }],
      { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
    );
    out = r.uri;
    const info = await FileSystem.getInfoAsync(out);
    if (info.size <= maxBytes) break;
    width = Math.round(width * 0.8);
    quality = Math.max(0.55, quality - 0.1);
  }
  return out;
}

export default function ProfileScreen() {
  const navigation = useNavigation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { fetchUser(); }, []);

  const fetchUser = async () => {
    try {
      const rawUser = await AsyncStorage.getItem('user');
      const stored = rawUser ? JSON.parse(rawUser) : null;
      const id = stored?._id || (await AsyncStorage.getItem('userId'));
      if (!id) throw new Error('userId bulunamadı');

      const res = await fetch(`${API_URL}/${id}`);
      const json = await res.json();
      if (!res.ok || json?.success === false) throw new Error(json?.message || 'Kullanıcı alınamadı');
      setUser(json.data || null);
      await AsyncStorage.setItem('user', JSON.stringify(json.data || {}));
    } catch (e) {
      console.error('Kullanıcı verisi alınamadı', e);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin gerekli', 'Fotoğraf seçmek için izin vermeniz gerekiyor.');
      return;
    }

    const mediaTypes =
      ImagePicker?.MediaTypeOptions?.Images ??
      ImagePicker?.MediaType?.Image ??
      undefined;

    const result = await ImagePicker.launchImageLibraryAsync({
      ...(mediaTypes ? { mediaTypes } : {}),
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    const canceled = result?.canceled ?? result?.cancelled ?? false;
    const asset = result?.assets?.[0];
    if (!canceled && asset?.uri) uploadImage(asset.uri);
  };

  const uploadImage = async (uri) => {
    try {
      setUploading(true);

      const rawUser = await AsyncStorage.getItem('user');
      const stored = rawUser ? JSON.parse(rawUser) : null;
      const userId = stored?._id || (await AsyncStorage.getItem('userId'));
      if (!userId) throw new Error('Kullanıcı bulunamadı');

      const compressed = await compressToLimit(uri);
      const formData = new FormData();
      formData.append('image', {
        uri: compressed,
        name: `profile_${Date.now()}.jpg`,
        type: 'image/jpeg',
      });

      const headers = {};
      const token = await AsyncStorage.getItem('token');
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/${userId}/upload`, {
        method: 'PUT',
        headers,
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || `Yükleme başarısız (HTTP ${res.status})`);
      }

      setUser(data.data);
      await AsyncStorage.setItem('user', JSON.stringify(data.data));
    } catch (err) {
      console.error(err);
      Alert.alert('Hata', err.message || 'Yükleme başarısız oldu.');
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('userId');
    await AsyncStorage.removeItem('token');
    navigation.reset({ index: 0, routes: [{ name: 'WelcomeScreen' }] });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator size="large" color="#5B8E55" />
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.error}>Kullanıcı verisi bulunamadı</Text>
      </SafeAreaView>
    );
  }

  const photoUrl = user?.image
    ? `${BASE_URL}/images/${encodeURIComponent(user.image)}?t=${encodeURIComponent(
        user.updatedAt || Date.now()
      )}`
    : null; // Fotoğraf URL'si

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase(); // İlk harfler

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Üst yeşil kapak + buton */}
      <View style={styles.cover}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Ana Sayfa</Text>
        </TouchableOpacity>
      </View>

      {/* Avatar + beyaz halka + kamera rozeti */}
      <View style={styles.avatarWrap}>
        <TouchableOpacity onPress={pickImage} activeOpacity={0.9}>
          <View style={styles.whiteRing}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.placeholder]}>
                <Text style={styles.placeholderText}>{initials || ' '}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cameraBadge} onPress={pickImage} activeOpacity={0.8}>
          <FontAwesome name="camera" size={20} color="#4C7A45" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.centerBlock}>
          <Text style={styles.name}>{user.firstName} {user.lastName}</Text>
          <Text style={styles.email}>{user.email}</Text>
          {!!user.phone && <Text style={styles.phone}>{user.phone}</Text>}
          {uploading && <ActivityIndicator style={{ marginTop: 8 }} size="small" color="#5B8E55" />}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Log out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const AVATAR = 132;
const RING_PAD = 8;
const RING = AVATAR + RING_PAD * 2;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },

  // yeşil kapak (yükseklik sabit bırakıldı)
  cover: {
    height: 270,
    backgroundColor: '#5B8E55',
    justifyContent: 'flex-start',
    marginTop: -RING / 2 + RING_PAD, // senin verdiğin gibi
  },

  // avatarın etrafındaki beyaz halka 
  avatarWrap: {
    position: 'absolute',
    top: 170 - RING / 300 + 30, // (verdiğin değer)
    alignSelf: 'center',
  },

  whiteRing: {
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },

  avatar: { width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2 },

  // kamera rozeti — FontAwesome kullanıldı
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },

  // içerik, avatarın altından başlatılıyor
  container: { paddingHorizontal: 20, paddingTop: RING / 90 + 90 },

  centerBlock: { alignItems: 'center', marginTop: 8 },

  placeholder: { backgroundColor: '#e6efe7', alignItems: 'center', justifyContent: 'center' },
  placeholderText: { fontSize: 40, fontWeight: '700', color: '#5B8E55' },

  name: { fontSize: 28, fontWeight: '800', marginTop: 10, color: '#214E34' },
  email: { fontSize: 16, color: '#666', marginTop: 4 },
  phone: { fontSize: 16, color: '#666', marginTop: 2 },
  error: { marginTop: 30, textAlign: 'center', color: 'red', fontSize: 18 },


  backButton: {
    marginTop: 80,         
    marginLeft: 16,
    backgroundColor: '#eef3ed',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  backButtonText: { fontSize: 15, color: '#5B8E55', fontWeight: '600' },

  logoutButton: {
    marginTop: 36,
    backgroundColor: '#e74c3c',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    alignSelf: 'center',
    minWidth: 140,
  },
  logoutButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
