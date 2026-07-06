import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as SecureStore from 'expo-secure-store';
import { Camera, Map, Users, Clock } from 'lucide-react-native';

import { useStore } from './src/store';
import api from './src/services/api';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import CameraScreen from './src/screens/CameraScreen';
import ResultScreen from './src/screens/ResultScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import CommunityScreen from './src/screens/CommunityScreen';
import PlotsScreen from './src/screens/PlotsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#111827' },
        headerTintColor: '#10b981',
        tabBarStyle: { backgroundColor: '#111827', borderTopColor: '#374151' },
        tabBarActiveTintColor: '#10b981',
        tabBarInactiveTintColor: '#9ca3af',
      }}
    >
      <Tab.Screen 
        name="Scan" 
        component={CameraScreen} 
        options={{
          tabBarIcon: ({ color }) => <Camera color={color} size={24} />
        }}
      />
      <Tab.Screen 
        name="Plots" 
        component={PlotsScreen} 
        options={{
          tabBarIcon: ({ color }) => <Map color={color} size={24} />
        }}
      />
      <Tab.Screen 
        name="Community" 
        component={CommunityScreen} 
        options={{
          tabBarIcon: ({ color }) => <Users color={color} size={24} />
        }}
      />
      <Tab.Screen 
        name="History" 
        component={HistoryScreen} 
        options={{
          tabBarIcon: ({ color }) => <Clock color={color} size={24} />
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const token = useStore((state) => state.token);
  const setToken = useStore((state) => state.setToken);
  const setUser = useStore((state) => state.setUser);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function initAuth() {
      try {
        const storedToken = await SecureStore.getItemAsync('access_token');
        if (storedToken) {
          await setToken(storedToken);
          // Fetch user profile
          const userRes = await api.get('/auth/me', {
            headers: { Authorization: `Bearer ${storedToken}` }
          });
          setUser(userRes.data);
        }
      } catch (e) {
        console.error('Auth init error', e);
        await setToken(null);
      } finally {
        setIsReady(true);
      }
    }
    initAuth();
  }, []);

  if (!isReady) {
    return null; // Or a splash screen
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!token ? (
          // Auth Stack
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          // Main App
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen 
              name="Result" 
              component={ResultScreen}
              options={{ 
                headerShown: true,
                headerStyle: { backgroundColor: '#111827' },
                headerTintColor: '#10b981'
              }} 
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
