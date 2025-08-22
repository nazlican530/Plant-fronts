import React, { useEffect } from 'react';
import { View, ImageBackground, Text, StyleSheet } from 'react-native';

export default function SplashScreen({ navigation }) {
  useEffect(() => {
    setTimeout(() => {
      navigation.replace('WelcomeScreen');  //replace: Kullanıcı geri tuşuna basarsa SplashScreen’e dönmesin.
    }, 2500);     // 2.5 saniye sonra anasayfaya geç
  }, []);

  return (
    <ImageBackground
      source={require('../assets/girisfoto.jpg')}
      style={styles.container}
    >
      <View style={styles.textContainer}>
        <Text style={styles.logo}>🌱 Plantio</Text>
        <Text style={styles.subtitle}>Gardening App</Text>
      </View>
    </ImageBackground>
  );
}
const styles = StyleSheet.create({
    container:{
        flex: 1,
        resizeMode: 'cover',  // en-boy oranı korunur.
        justifyContent: 'center',
        alignItems:'center',
    },
    textContainer:{
        alignItems: 'center',
        alignItems: 'center',
    },
    logo:{
        fontSize: 48,
        color: '#fff',
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 24,
        color: '#fff',
        marginTop: 10,
    }
    
    });
