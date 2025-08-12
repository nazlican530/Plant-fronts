// LoginScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Alert, ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const API_BASE_URL = "http://192.168.150.59:3000/api/auth";

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Uyarı", "Lütfen e-posta ve şifrenizi girin");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert("Hata", data?.message || "E-posta veya şifre hatalı");
        return;
      }

      const user = data?.data; // { _id, ... }
      if (!user?._id) {
        Alert.alert("Hata", "Kullanıcı bilgisi eksik geldi.");
        return;
      }

      // ✅ Token zorunlu
      const token = data?.token;
      if (!token || typeof token !== 'string' || token.length < 10) {
        Alert.alert("Hata", "Token alınamadı. Backend login cevabında 'token' döndüğünü doğrula.");
        return;
      }

      // Eski boş token kaydını temizle ve yeni token'ı yaz
      await AsyncStorage.removeItem('token');
      await AsyncStorage.multiSet([
        ['userId', String(user._id)],
        ['user', JSON.stringify(user)],
        ['token', token],
      ]);

      // Geriye dönmeyi engelle
      navigation.reset({ index: 0, routes: [{ name: 'HomeScreen' }] });

    } catch (error) {
      console.error(error);
      Alert.alert("Hata", "Sunucuya bağlanılamadı");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.logo}>🌱 Plantio</Text>

      <Text style={styles.title}>
        Login on <Text style={styles.green}>Plantio</Text>
      </Text>

      <Text style={styles.subtitle}>
        Create an account, we can't wait to have you.
      </Text>

      <View style={styles.inputWrapper}>
        <Text style={styles.icon}>📧</Text>
        <TextInput
          style={styles.inputNoBorder}
          placeholder="Email"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.inputWrapper}>
        <Text style={styles.icon}>🔑</Text>
        <TextInput
          style={styles.inputNoBorder}
          placeholder="Password"
          placeholderTextColor="#999"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          <Text style={styles.showText}>{showPassword ? 'Hide' : 'Show'}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.loginButton, loading && { opacity: 0.6 }]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginButtonText}>LOGIN</Text>}
      </TouchableOpacity>

      <Text style={styles.signup}>
        Don’t have an account?{' '}
        <Text style={styles.signupLink} onPress={() => navigation.navigate('RegisterScreen')}>
          Sign up
        </Text>
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 32, backgroundColor: '#fff' },
  logo: { fontSize: 28, fontWeight: 'bold', color: '#214E34', marginBottom: 12, marginTop: 50, marginLeft: 20 },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 4, marginTop: 10, marginLeft: 30 },
  green: { color: '#214E34', fontWeight: 'bold' },
  subtitle: { fontSize: 14, color: '#555', marginBottom: 24, marginTop: 10, marginLeft: 30 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9f9f9',
    borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginBottom: 16,
    paddingHorizontal: 16, marginHorizontal: 30, height: 50,
  },
  icon: { marginRight: 8, fontSize: 16, color: '#214E34' },
  inputNoBorder: { flex: 1, fontSize: 16, color: '#333' },
  showText: { color: '#214E34', fontWeight: '700', fontSize: 14, paddingLeft: 10 },
  loginButton: { backgroundColor: '#5B8E55', paddingVertical: 16, borderRadius: 8, alignItems: 'center', marginHorizontal: 30, marginBottom: 16 },
  loginButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  signup: { textAlign: 'center', fontSize: 14, color: '#333' },
  signupLink: { color: '#214E34', fontWeight: 'bold' },
});