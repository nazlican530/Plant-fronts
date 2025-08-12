import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const FavoriteContext = createContext();

export const FavoriteProvider = ({ children }) => {
  const [favoritePlants, setFavoritePlants] = useState([]);
  const [userId, setUserId] = useState(null);

  // Kullanıcı ID'sini AsyncStorage'dan al
  useEffect(() => {
    const loadUser = async () => {
      const id = await AsyncStorage.getItem('userId');
      setUserId(id);
      if (id) fetchFavorites(id);
    };
    loadUser();
  }, []);

  const fetchFavorites = async (uid) => {
    try {
      const res = await fetch(`http://192.168.150.59:3000/api/favorites/user/${uid}`);
      const json = await res.json();
      if (json.success) setFavoritePlants(json.data);
    } catch (err) {
      console.error('Favoriler alınamadı:', err);
    }
  };

  const addFavorite = async (plantId) => {
    if (!userId) return;
    try {
      await fetch('http://192.168.150.59:3000/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, plantId })
      });
      fetchFavorites(userId);
    } catch (err) {
      console.error(err);
    }
  };

  const removeFavorite = async (plantId) => {
    if (!userId) return;
    try {
      await fetch('http://192.168.150.59:3000/api/favorites', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, plantId })
      });
      fetchFavorites(userId);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <FavoriteContext.Provider value={{ favoritePlants, addFavorite, removeFavorite, fetchFavorites }}>
      {children}
    </FavoriteContext.Provider>
  );
};
