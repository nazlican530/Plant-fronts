// AddPlantScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, Image,
  Switch, SafeAreaView, Alert, ActivityIndicator, ScrollView,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { Picker } from '@react-native-picker/picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'http://192.168.150.59:3000';
const API_PLANTS = `${BASE_URL}/api/plants`;
const API_CATEGORIES = `${BASE_URL}/api/categories`;

// Backend alan adları
const CATEGORY_FIELD = 'categoriesIds';
const CREATED_BY_FIELD = 'createdBy';

/** 4.5MB altı JPEG sıkıştırma */
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

export default function AddPlantScreen() {
  const navigation = useNavigation();
  const route = useRoute();

  // form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState(null);        // yeni seçilen görsel
  const [existingImageUrl, setExistingImageUrl] = useState(null); // var olan görsel (edit)
  const [watering, setWatering] = useState(true);
  const [sunlight, setSunlight] = useState(true);
  const [nutrients, setNutrients] = useState(true);

  // mini istatistikler
  const [humidity, setHumidity] = useState('');
  const [height, setHeight] = useState('');
  const [temperature, setTemperature] = useState('');

  // kategori
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [catLoading, setCatLoading] = useState(false);

  // mod ve id
  const [mode, setMode] = useState('create'); // 'create' | 'edit'
  const [editingId, setEditingId] = useState(null);

  const [loading, setLoading] = useState(false);

  // ---- helpers ----
  const resetForm = useCallback((opts = {}) => {
    const { keepCategory = false } = opts;
    setEditingId(null);
    setMode('create');

    setName('');
    setDescription('');
    setImageUri(null);
    setExistingImageUrl(null);

    setWatering(true);
    setSunlight(true);
    setNutrients(true);

    setHumidity('');
    setHeight('');
    setTemperature('');

    if (!keepCategory) {
      const first = categories?.[0];
      setSelectedCategory(first ? (first._id || first.id || '') : '');
    }
  }, [categories]);

  // medya izni
  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin gerekli', 'Fotoğraflara erişim izni vermelisin.');
      }
    })();
  }, []);

  // kategorileri çek
  useEffect(() => {
    (async () => {
      try {
        setCatLoading(true);
        const res = await fetch(API_CATEGORIES);
        const json = await res.json();
        const list = json?.data || (Array.isArray(json) ? json : []);
        setCategories(list);

        // kategori daha seçilmemişse ilkini ata
        if (list.length && !selectedCategory) {
          setSelectedCategory(list[0]._id || list[0].id || '');
        }
      } catch (e) {
        console.log('Kategori yükleme hatası:', e);
        Alert.alert('Uyarı', 'Kategoriler yüklenemedi. Geçici olarak sabit bir kategori ID’si kullanabilirsiniz.');
      } finally {
        setCatLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // EDIT PREFILL: SADECE edit modunda doldur; create'te her zaman temizle
  useEffect(() => {
    const rp = route?.params || {};
    const isEdit = rp?.mode === 'edit';

    if (!isEdit) {
      // create: formu tertemiz yap, kategoriyi koru (kullanıcı az önce seçmiş olabilir)
      resetForm({ keepCategory: true });
      return;
    }

    // edit: eski verileri doldur
    const src = rp?.plant || {};
    setMode('edit');
    setEditingId(src?._id || src?.id || null);

    setName(src?.name || '');
    setDescription(src?.description || '');
    setWatering(!!src?.watering);
    setSunlight(!!src?.sunlight);
    setNutrients(!!src?.nutrients);

    setHumidity(src?.humidity?.toString?.() ?? '');
    setHeight(src?.height?.toString?.() ?? '');
    setTemperature(src?.temperature?.toString?.() ?? '');

    const cid =
      src?.categoriesIds?.[0] ||
      src?.categoryIds?.[0] ||
      src?.categoryId ||
      src?.category ||
      '';
    if (cid) setSelectedCategory(String(cid));

    // görsel: yeni seçilene kadar mevcut resmi göster
    const imgUrl = rp?.imageUrl || src?.imageUrl || src?.image || null;
    if (imgUrl) setExistingImageUrl(imgUrl);
    setImageUri(null);
  }, [route?.params, resetForm]);

  const pickImage = async () => {
    try {
      let mediaTypes;
      if (ImagePicker?.MediaType?.Image) mediaTypes = ImagePicker.MediaType.Image;
      else if (ImagePicker?.MediaType?.Images) mediaTypes = ImagePicker.MediaType.Images;
      else if (ImagePicker?.MediaTypeOptions?.Images) mediaTypes = ImagePicker.MediaTypeOptions.Images;

      const result = await ImagePicker.launchImageLibraryAsync({
        ...(mediaTypes ? { mediaTypes } : {}),
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      const canceled = result?.canceled ?? result?.cancelled ?? false;
      const assets = result?.assets ?? (result?.uri ? [{ uri: result.uri }] : []);
      if (canceled || !assets.length) return;

      const originalUri = assets[0].uri;
      const compressedUri = await compressToLimit(originalUri, 4.5 * 1024 * 1024);
      setImageUri(compressedUri);       // yeni foto
      setExistingImageUrl(null);        // eskisini gizle

      const info = await FileSystem.getInfoAsync(compressedUri);
      console.log('📦 Compressed size (bytes):', info.size);
    } catch (error) {
      console.log('ImagePicker error:', error);
      Alert.alert('Hata', error?.message || 'Fotoğraf seçme başarısız.');
    }
  };

  // POST/PUT ortak kaydet
  const handleSave = async () => {
    const isEdit = mode === 'edit' && editingId;

    if (!name.trim()) return Alert.alert('Uyarı', 'Lütfen bitki adı gir.');
    if (!isEdit && !imageUri && !existingImageUrl)
      return Alert.alert('Uyarı', 'Lütfen bir fotoğraf seç.');
    if (!selectedCategory) return Alert.alert('Uyarı', 'Lütfen kategori seç.');

    if (humidity !== '') {
      const hNum = Number(String(humidity).replace(',', '.'));
      if (Number.isNaN(hNum) || hNum < 0 || hNum > 100) {
        return Alert.alert('Uyarı', 'Nem değeri 0 ile 100 arasında olmalı.');
      }
    }

    try {
      setLoading(true);

      let token = null;
      try { token = await AsyncStorage.getItem('token'); } catch {}

      // createdBy (create’te zorunlu)
      const rawUser = await AsyncStorage.getItem('user');
      const user = rawUser ? JSON.parse(rawUser) : null;
      const userId = user?._id || user?.id;
      if (!userId) {
        setLoading(false);
        return Alert.alert('Oturum', 'Kullanıcı bulunamadı. Lütfen tekrar giriş yapın.');
      }

      const formData = new FormData();
      formData.append('name', name.trim());
      if (description?.trim()) formData.append('description', description.trim());
      formData.append(CATEGORY_FIELD, String(selectedCategory));
      if (!isEdit) formData.append(CREATED_BY_FIELD, String(userId)); // create’te gerekli

      // Toggle alanlar
      formData.append('watering',  watering ? '1' : '0');
      formData.append('sunlight',  sunlight ? '1' : '0');
      formData.append('nutrients', nutrients ? '1' : '0');

      // mini istatistikler (opsiyonel)
      if (humidity !== '')    formData.append('humidity', String(humidity));
      if (height?.trim())     formData.append('height', height.trim());
      if (temperature !== '') formData.append('temperature', String(temperature));

      // Görsel:
      // - Edit’te: kullanıcı yeni foto seçerse YOLLA; aksi halde hiçbir şey gönderme → backend eskiyi korur.
      // - Create’te: foto zorunlu
      if (imageUri) {
        const filename = imageUri.split('/').pop() || `photo_${Date.now()}.jpg`;
        formData.append('image', { uri: imageUri, name: filename, type: 'image/jpeg' });
      }

      const headers = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      const url = isEdit ? `${API_PLANTS}/${editingId}` : API_PLANTS;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, { method, headers, body: formData });
      const data = await res.json();
      if (!res.ok || data?.success === false) {
        console.log('Save error:', data);
        throw new Error(data?.message || `İşlem başarısız (HTTP ${res.status})`);
      }

      Alert.alert('Başarılı', isEdit ? 'Bitki güncellendi!' : 'Bitki eklendi!');
      navigation.navigate('MyGarden');
    } catch (err) {
      console.log('Save error:', err);
      Alert.alert('Hata', err.message || 'Bir şeyler yanlış gitti.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* BACK */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={28} color="#5B8E55" />
      </TouchableOpacity>

      <View style={styles.topRow}>
        <Text style={styles.header}>
          <Text style={styles.bold}>{mode === 'edit' ? 'Edit ' : 'Water '}</Text>
          <Text style={styles.green}>Plants</Text>
        </Text>
      </View>

      {/* --- SCROLLABLE FORM --- */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {/* Image Picker */}
          <TouchableOpacity style={styles.imageBox} onPress={pickImage}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.plantImage} />
            ) : existingImageUrl ? (
              <Image source={{ uri: existingImageUrl }} style={styles.plantImage} />
            ) : (
              <Ionicons name="add" size={32} color="#5B8E55" />
            )}
          </TouchableOpacity>

          {/* Form */}
          <TextInput
            style={styles.input}
            placeholder="Name Of The Plant"
            value={name}
            onChangeText={setName}
            returnKeyType="next"
          />

          <TextInput
            style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
            placeholder="Description"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />

          {/* Category Picker */}
          {catLoading ? (
            <ActivityIndicator style={{ marginVertical: 8 }} />
          ) : (
            <View style={styles.pickerBox}>
              <Text style={styles.pickerLabel}>Category</Text>
              <Picker
                selectedValue={selectedCategory}
                onValueChange={(val) => setSelectedCategory(String(val))}
                style={styles.picker}
              >
                {categories.map((c) => (
                  <Picker.Item
                    key={c._id || c.id}
                    label={c.name || c.title || String(c._id || c.id)}
                    value={c._id || c.id}
                  />
                ))}
              </Picker>
            </View>
          )}

          {/* Toggles */}
          <View style={styles.toggleCard}>
            <Ionicons name="water-outline" size={24} color="#fff" style={styles.iconSquare} />
            <View style={styles.toggleTextWrapper}>
              <Text style={styles.toggleTitle}>Watering</Text>
              <Text style={styles.toggleSubtitle}>Thrice In A Week</Text>
            </View>
            <Switch value={watering} onValueChange={setWatering} trackColor={{ true: '#5B8E55' }} />
          </View>

          <View style={styles.toggleCard}>
            <Ionicons name="sunny-outline" size={24} color="#fff" style={styles.iconSquare} />
            <View style={styles.toggleTextWrapper}>
              <Text style={styles.toggleTitle}>Sunlight</Text>
              <Text style={styles.toggleSubtitle}>Daily</Text>
            </View>
            <Switch value={sunlight} onValueChange={setSunlight} trackColor={{ true: '#5B8E55' }} />
          </View>

          <View style={styles.toggleCard}>
            <Ionicons name="leaf-outline" size={24} color="#fff" style={styles.iconSquare} />
            <View style={styles.toggleTextWrapper}>
              <Text style={styles.toggleTitle}>Nutrients</Text>
              <Text style={styles.toggleSubtitle}>Thrice In A Week</Text>
            </View>
            <Switch value={nutrients} onValueChange={setNutrients} trackColor={{ true: '#5B8E55' }} />
          </View>

          {/* Mini İstatistik Inputları */}
          <View style={styles.metricsRow}>
            {/* Humidity */}
            <View style={styles.metricItem}>
              <View style={styles.metricIconWrap}>
                <Ionicons name="water" size={18} color="#2c7a67" />
              </View>
              <Text style={styles.metricLabel}>Humidity</Text>
              <View style={styles.metricInputRow}>
                <TextInput
                  style={styles.metricInput}
                  placeholder="50"
                  value={humidity}
                  onChangeText={(t) => setHumidity(t.replace(/[^\d.,]/g, ''))}
                  keyboardType="numeric"
                  maxLength={5}
                />
                <Text style={styles.metricSuffix}>%</Text>
              </View>
            </View>

            {/* Height */}
            <View style={styles.metricItem}>
              <View style={styles.metricIconWrap}>
                <Ionicons name="trending-up" size={18} color="#2c7a67" />
              </View>
              <Text style={styles.metricLabel}>Height</Text>
              <TextInput
                style={styles.metricInputFull}
                placeholder={"7'3  |  220"}
                value={height}
                onChangeText={setHeight}
              />
            </View>

            {/* Temperature */}
            <View style={styles.metricItem}>
              <View style={styles.metricIconWrap}>
                <Ionicons name="sunny" size={18} color="#2c7a67" />
              </View>
              <Text style={styles.metricLabel}>Temperature</Text>
              <View style={styles.metricInputRow}>
                <TextInput
                  style={styles.metricInput}
                  placeholder="23"
                  value={temperature}
                  onChangeText={(t) => setTemperature(t.replace(/[^\d.,-]/g, ''))}
                  keyboardType="numeric"
                  maxLength={5}
                />
                <Text style={styles.metricSuffix}>°C</Text>
              </View>
            </View>
          </View>

          {/* Save Button (Create/Edit) */}
          <TouchableOpacity style={styles.addButton} onPress={handleSave} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.addButtonText}>{mode === 'edit' ? 'SAVE' : 'ADD'}</Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },

  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 55 },
  header: { fontSize: 28, color: '#000', marginBottom: 8 },
  bold: { fontWeight: 'bold' },
  green: { color: '#5B8E55' },

  backButton: { position: 'absolute', top: 80, left: 20, zIndex: 10 },

  imageBox: {
    width: 120, height: 120, borderWidth: 1, borderColor: '#5B8E55', borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginVertical: 24,
  },
  plantImage: { width: '100%', height: '100%', borderRadius: 12 },

  input: { width: '100%', borderWidth: 1, borderColor: '#5B8E55', borderRadius: 10, padding: 12, marginBottom: 14 },

  pickerBox: { width: '100%', borderWidth: 1, borderColor: '#5B8E55', borderRadius: 10, marginBottom: 14, overflow: 'hidden' },
  pickerLabel: { paddingHorizontal: 12, paddingTop: 8, color: '#333', fontWeight: '600' },
  picker: { width: '100%' },

  toggleCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9f9f9', borderRadius: 15, padding: 15, marginBottom: 10 },
  iconSquare: { backgroundColor: '#5B8E55', padding: 10, borderRadius: 10, marginRight: 10 },
  toggleTextWrapper: { flex: 1 },
  toggleTitle: { fontWeight: 'bold', fontSize: 16, color: '#333' },
  toggleSubtitle: { color: '#888' },

  // mini istatistik stilleri
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 6,
  },
  metricItem: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e6efe7',
  },
  metricIconWrap: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#e9f5f1',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
  },
  metricLabel: { fontSize: 12, color: '#2c7a67', fontWeight: '600', marginBottom: 2 },
  metricInputRow: { flexDirection: 'row', alignItems: 'center' },
  metricInput: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#d6e6e0',
    paddingVertical: 4,
    paddingRight: 6,
    fontSize: 16,
    color: '#111',
  },
  metricSuffix: { marginLeft: 4, fontSize: 14, color: '#2c7a67', fontWeight: '600' },
  metricInputFull: {
    borderBottomWidth: 1,
    borderBottomColor: '#d6e6e0',
    paddingVertical: 4,
    fontSize: 16,
    color: '#111',
  },

  addButton: { backgroundColor: '#5B8E55', paddingVertical: 12, paddingHorizontal: 35, borderRadius: 25, alignItems: 'center', alignSelf: 'center', marginTop: 16 },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});