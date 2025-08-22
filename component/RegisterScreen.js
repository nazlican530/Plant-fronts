import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RegisterScreen({ navigation }) {
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [phone,     setPhone]     = useState('');
  const [city,      setCity]      = useState('');   // 🌍 yeni: şehir (opsiyonel)
  const [password,  setPassword]  = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const API_BASE_URL = "http://192.168.150.59:3000/api/auth";

  const handleRegister = async () => {
    // Basit doğrulamalar
    if (!firstName || !lastName || !email || !phone || !password || !repeatPassword) {
      Alert.alert("Uyarı", "Lütfen tüm zorunlu alanları doldurun");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Uyarı", "Şifre en az 6 karakter olmalı");
      return;
    }
    if (password !== repeatPassword) {
      Alert.alert("Uyarı", "Şifreler eşleşmiyor");
      return;
    }

    try {
      setLoading(true);

      // city opsiyonel; boşsa hiç göndermeyelim
      const payload = { firstName, lastName, email, phone, password };
      const trimmedCity = city.trim();
      if (trimmedCity) payload.city = trimmedCity;

      const response = await fetch(`${API_BASE_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        const msg = data?.message || "Kayıt başarısız";
        Alert.alert("Hata", msg);
        return;
      }

      // Beklenen: { success: true, data: { _id, firstName, ... }, token? }
      const user = data?.data;
      if (!user?._id) {
        Alert.alert("Hata", "Kullanıcı bilgisi eksik geldi.");
        return;
      }

      // Otomatik login: userId, user ve token'ı sakla
      await AsyncStorage.multiSet([
        ['userId', String(user._id)],
        ['user', JSON.stringify(user)],
        ['token', data?.token ?? ''],
      ]);

      Alert.alert("Başarılı", "Kayıt tamamlandı! Giriş yapıldı.");

      // Geri ile kayıt ekranına dönmeyi engelle
      navigation.reset({ index: 0, routes: [{ name: 'LoginScreen' }] });

    } catch (error) {
      console.error(error);
      Alert.alert("Hata", "Sunucu hatası veya bağlantı sorunu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.logo}>🌱 Plantio</Text>

      <Text style={styles.title}>
        Register on <Text style={styles.green}>Plantio</Text>
      </Text>

      <Text style={styles.subtitle}>
        Create an account, we can't wait to have you.
      </Text>

      <View style={styles.inputWrapper}>
        <Text style={styles.icon}>👤</Text>
        <TextInput
          style={styles.inputNoBorder}
          placeholder="First Name"
          placeholderTextColor="#999"
          value={firstName}
          onChangeText={setFirstName}
        />
      </View>

      <View style={styles.inputWrapper}>
        <Text style={styles.icon}>👤</Text>
        <TextInput
          style={styles.inputNoBorder}
          placeholder="Last Name"
          placeholderTextColor="#999"
          value={lastName}
          onChangeText={setLastName}
        />
      </View>

      <View style={styles.inputWrapper}>
        <Text style={styles.icon}>📧</Text>
        <TextInput
          style={styles.inputNoBorder}
          placeholder="Email"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </View>

      <View style={styles.inputWrapper}>
        <Text style={styles.icon}>📞</Text>
        <TextInput
          style={styles.inputNoBorder}
          placeholder="Phone"
          placeholderTextColor="#999"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
      </View>

      {/* 🌍 City (opsiyonel) */}
      <View style={styles.inputWrapper}>
        <Text style={styles.icon}>🏙️</Text>
        <TextInput
          style={styles.inputNoBorder}
          placeholder="City (optional)"
          placeholderTextColor="#999"
          value={city}
          onChangeText={setCity}
        />
      </View>

      <View style={styles.inputWrapper}>
        <Text style={styles.icon}>🔑</Text>
        <TextInput
          style={styles.inputNoBorder}
          placeholder="Password"
          placeholderTextColor="#999"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
      </View>

      <View style={styles.inputWrapper}>
        <Text style={styles.icon}>🔒</Text>
        <TextInput
          style={styles.inputNoBorder}
          placeholder="Repeat Password"
          placeholderTextColor="#999"
          secureTextEntry
          value={repeatPassword}
          onChangeText={setRepeatPassword}
        />
      </View>

      <TouchableOpacity
        style={[styles.registerButton, loading && { opacity: 0.6 }]}
        onPress={handleRegister}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.registerText}>REGISTER</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.loginButton}
        onPress={() => navigation.navigate('LoginScreen')}
        disabled={loading}
      >
        <Text style={styles.loginText}>Already have an account? Login</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 20 },
  logo: {
    fontSize: 38, fontWeight: 'bold', color: '#5B8E55',
    textAlign: 'center', marginBottom: 20, marginTop: 40, marginRight: 12,
  },
  title: {
    fontSize: 24, color: '#5B8E55', fontWeight: 'bold',
    textAlign: 'center', marginBottom: 10,
  },
  green: { color: '#5B8E55' },
  subtitle: { fontSize: 16, color: '#707070', textAlign: 'center', marginBottom: 20 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 8, paddingHorizontal: 24, marginBottom: 20, marginHorizontal: 20,
  },
  icon: { fontSize: 20, color: '#5B8E55', marginRight: 8 },
  inputNoBorder: { flex: 1, height: 40, color: '#333' },
  registerButton: {
    backgroundColor: '#5B8E55', paddingVertical: 12, borderRadius: 8,
    alignItems: 'center', marginTop: 20, marginHorizontal: 30,
  },
  registerText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  loginButton: {
    backgroundColor: '#fff', paddingVertical: 12, borderRadius: 8,
    alignItems: 'center', marginTop: 12, marginHorizontal: 30,
    borderWidth: 1, borderColor: '#5B8E55',
  },
  loginText: { color: '#5B8E55', fontSize: 16, fontWeight: 'bold' },
});