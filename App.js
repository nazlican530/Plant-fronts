import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';


// Ekran bileşenleri
import HomeScreen from "./component/HomeScreen";
import PeopleScreen from "./component/PeopleScreen";
import ProfileScreen from "./component/ProfileScreen";
import SplashScreen from "./component/SplashScreen";
import WelcomeScreen from "./component/WelcomeScreen";
import LoginScreen from './component/LoginScreen';
import RegisterScreen from './component/RegisterScreen'; 
import MyPlantsScreen from './component/MyPlantsScreen';  
import PlantDetailScreen from './component/PlantDetailScreen'; 
import MyGarden from './component/MyGarden'; 
import AddPlantScreen from './component/AddPlantScreen'; 
import FavoritePlantsScreen from './component/FavoritePlantsScreen'; 
import PlantInfoScreen from './component/PlantInfoScreen';  
import PlantCareScreen from './component/PlantCareScreen';  
import StoreScreen from './component/StoreScreen'; 
import PeopleDetailScreen from './component/PeopleDetailScreen';
import PriceScreen from './component/PriceScreen';
import CheckoutScreen from './component/CheckoutScreen'; 
import BuyNowScreen from './component/BuyNowScreen'; 
import CreatePlantScreen from './component/CreatePlantScreen';
import WeatherScreen from './component/WeatherScreen';

// Gerekli bileşenler
import WeatherCard from './components/WeatherCard'; 

const Stack = createNativeStackNavigator();

export default function App() {
  return (
      <NavigationContainer>
        <Stack.Navigator  
          initialRouteName="SplashScreen"
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="SplashScreen" component={SplashScreen} />
          <Stack.Screen name="HomeScreen" component={HomeScreen} />
          <Stack.Screen name="PeopleScreen" component={PeopleScreen} />
          <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
          <Stack.Screen name="WelcomeScreen" component={WelcomeScreen} />
          <Stack.Screen name="LoginScreen" component={LoginScreen} />
          <Stack.Screen name="RegisterScreen" component={RegisterScreen} />
          <Stack.Screen name="MyPlantsScreen" component={MyPlantsScreen} />
          <Stack.Screen name="PlantDetailScreen" component={PlantDetailScreen} /> 
          <Stack.Screen name="MyGarden" component={MyGarden} /> 
          <Stack.Screen name="AddPlantScreen" component={AddPlantScreen} /> 
          <Stack.Screen name="FavoritePlantsScreen" component={FavoritePlantsScreen} /> 
          <Stack.Screen name="PlantInfoScreen" component={PlantInfoScreen} />  
          <Stack.Screen name="PlantCareScreen" component={PlantCareScreen} /> 
          <Stack.Screen name="StoreScreen" component={StoreScreen} /> 
          <Stack.Screen name="PeopleDetail" component={PeopleDetailScreen} /> 
          <Stack.Screen name="PriceScreen" component={PriceScreen} /> 
          <Stack.Screen name="CheckoutScreen" component={CheckoutScreen} /> 
          <Stack.Screen name="BuyNowScreen" component={BuyNowScreen} /> 
          <Stack.Screen name="CreatePlantScreen" component={CreatePlantScreen} /> 
          <Stack.Screen name="WeatherScreen" component={WeatherScreen} options={{ animation: 'fade' }}/> 
        </Stack.Navigator>
      </NavigationContainer>


  );
}
