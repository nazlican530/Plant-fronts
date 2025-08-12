// screens/ProfileScreen.js
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

const BASE_URL = 'http://192.168.150.59:3000';
const API_URL = `${BASE_URL}/api/users`;

/** Görseli JPEG'e çevirip ~4.5MB altına indirir */
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
    if (!canceled && asset?.uri) {
      uploadImage(asset.uri);
    }
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

  // 🔹 Log Out Fonksiyonu
  const handleLogout = async () => {
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('userId');
    await AsyncStorage.removeItem('token');
    navigation.reset({
      index: 0,
      routes: [{ name: 'WelcomeScreen' }],
    });
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
    : null;

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Ana Sayfa</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <TouchableOpacity onPress={pickImage} activeOpacity={0.85}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.profilePic} />
            ) : (
              <View style={[styles.profilePic, styles.placeholder]}>
                <Text style={styles.placeholderText}>{initials || ' '}</Text>
              </View>
            )}
            <Text style={styles.uploadText}>Fotoğrafı Değiştir</Text>
          </TouchableOpacity>

          <Text style={styles.name}>
            {user.firstName} {user.lastName}
          </Text>
          <Text style={styles.email}>{user.email}</Text>
          {!!user.phone && <Text style={styles.phone}>{user.phone}</Text>}
        </View>

        {uploading && <ActivityIndicator size="small" color="#5B8E55" />}

        {/* 🔹 Log Out Butonu */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Log out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { paddingHorizontal: 20 },
  header: { alignItems: 'center', marginTop: 20 },

  profilePic: { width: 120, height: 120, borderRadius: 60, marginBottom: 10 },
  placeholder: { backgroundColor: '#e6efe7', alignItems: 'center', justifyContent: 'center' },
  placeholderText: { fontSize: 40, fontWeight: '700', color: '#5B8E55' },

  name: { fontSize: 28, fontWeight: '800', marginBottom: 6, color: '#214E34' },
  email: { fontSize: 16, color: '#666', marginBottom: 4 },
  phone: { fontSize: 16, color: '#666' },
  error: { marginTop: 30, textAlign: 'center', color: 'red', fontSize: 18 },

  uploadText: { fontSize: 14, color: '#5B8E55', textAlign: 'center', marginBottom: 10, marginTop: 5 },

  backButton: {
    marginTop: 20,
    alignSelf: 'flex-start',
    backgroundColor: '#eef3ed',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  backButtonText: { fontSize: 15, color: '#5B8E55', fontWeight: '600' },

  logoutButton: {
    marginTop: 50,
    backgroundColor: '#e74c3c',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    alignSelf: 'center', 
  },
  logoutButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
