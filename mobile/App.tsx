import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { supabase } from './src/lib/supabase';
import { MaterialIcons } from '@expo/vector-icons';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import AttendanceScreen from './src/screens/AttendanceScreen';
import ClockScreen from './src/screens/ClockScreen';
import RequestsScreen from './src/screens/RequestsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ReportsScreen from './src/screens/ReportsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Theme colors
const COLORS = {
  primary: '#f9f506',
  textDark: '#181811',
  tabActive: '#181811',
  tabInactive: '#a3a3a3',
  background: '#ffffff',
  border: '#e5e5e5',
};

// Main Tab Navigator
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: COLORS.background,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          height: 70,
          paddingBottom: 12,
          paddingTop: 8,
        },
        tabBarActiveTintColor: COLORS.tabActive,
        tabBarInactiveTintColor: COLORS.tabInactive,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: COLORS.background,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.border,
        },
        headerTitleStyle: {
          color: COLORS.textDark,
          fontWeight: '600',
          fontSize: 18,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Beranda',
          headerShown: false,
          tabBarIcon: ({ focused, color }) => (
            <MaterialIcons
              name={focused ? "home" : "home"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Attendance"
        component={AttendanceScreen}
        options={{
          title: 'Absensi',
          tabBarIcon: ({ focused, color }) => (
            <MaterialIcons
              name="insert-chart-outlined"
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Clock"
        component={ClockScreen}
        options={{
          title: '',
          tabBarIcon: ({ focused }) => (
            <View style={styles.fabContainer}>
              <MaterialIcons name="fingerprint" size={28} color="#fff" />
            </View>
          ),
          tabBarLabel: () => null,
          headerShown: true,
          headerTitle: 'Presensi',
        }}
      />
      <Tab.Screen
        name="Requests"
        component={RequestsScreen}
        options={{
          title: 'Pengajuan',
          tabBarIcon: ({ focused, color }) => (
            <MaterialIcons
              name="description"
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profil',
          tabBarIcon: ({ focused, color }) => (
            <MaterialIcons
              name={focused ? "person" : "person-outline"}
              size={24}
              color={color}
            />
          ),
          headerShown: false,
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session - works offline thanks to SecureStore persistence
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setLoading(false);
      })
      .catch((error) => {
        // Offline or network error - session may still be restored from SecureStore
        console.log('[App] Session fetch error (may be offline):', error.message);
        // Check if session was restored from local storage
        supabase.auth.getSession().then(({ data: { session } }) => {
          setSession(session);
        }).catch(() => {
          // Truly no session available
          setSession(null);
        }).finally(() => {
          setLoading(false);
        });
      });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0f172a" />
        <Text style={styles.loadingText}>Memuat...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {session ? (
            <>
              <Stack.Screen name="MainTabs" component={MainTabs} />
              <Stack.Screen
                name="Reports"
                component={ReportsScreen}
                options={{
                  headerShown: true,
                  headerTitle: 'Laporan Saya',
                  headerStyle: { backgroundColor: '#ffffff' },
                  headerTitleStyle: { color: '#0f172a', fontWeight: '600', fontSize: 18 },
                }}
              />
            </>
          ) : (
            <Stack.Screen name="Login" component={LoginScreen} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  fabContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.textDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
});
