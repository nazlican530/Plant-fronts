import React from 'react';
import {
  View,
  ImageBackground,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function WelcomeScreen() {
  const navigation = useNavigation();

  return (
    <ImageBackground
      source={require('../assets/logReg.jpg')}
      style={styles.container}
      resizeMode="cover"
    >
      <View style={styles.overlay}>   
        <Text style={styles.logo}>Welcome{"\n"}To Plantio</Text>
        <Text style={styles.subtitle}>
          Feel fresh with a plant Worlds.{"\n"}It will enhance your living space!
        </Text>

        <TouchableOpacity
          style={styles.registerButton}
          onPress={() => navigation.navigate('RegisterScreen')} 
        >
          <Text style={styles.registerText}>REGISTER</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.navigate('LoginScreen')}
        >
          <Text style={styles.loginText}>LOGIN</Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: { 
    flex: 1,
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingHorizontal: 40,  
    backgroundColor: 'rgba(0,0,0,0.3)',  
  },
  logo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center', 
    marginBottom: 10, 
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 40,
  },
  registerButton: {
    width: 344,
    height: 55,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  registerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginButton: {
    width: 344,
    height: 55,
    backgroundColor: '#fff',
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    color: '#214E34',
    fontSize: 16,
    fontWeight: 'bold',
  },
});