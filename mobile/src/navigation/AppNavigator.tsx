import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import ClockScreen from '../screens/ClockScreen';
import RequestsScreen from '../screens/RequestsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import LoginScreen from '../screens/LoginScreen';

// Import icons (using text for now, replace with expo-vector-icons later)
const TabIcon = ({ name, focused }: { name: string; focused: boolean }) => (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{name}</Text>
);

export type RootStackParamList = {
    Login: undefined;
    MainTabs: undefined;
    ClockIn: undefined;
    ClockOut: undefined;
    RequestDetail: { id: string };
};

export type MainTabParamList = {
    Home: undefined;
    Attendance: undefined;
    Clock: undefined;
    Requests: undefined;
    Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Bottom Tab Navigator
function MainTabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={{
                tabBarStyle: styles.tabBar,
                tabBarActiveTintColor: '#0f172a',
                tabBarInactiveTintColor: '#94a3b8',
                headerStyle: styles.header,
                headerTitleStyle: styles.headerTitle,
            }}
        >
            <Tab.Screen
                name="Home"
                component={HomeScreen}
                options={{
                    title: 'Beranda',
                    tabBarIcon: ({ focused }) => <TabIcon name="🏠" focused={focused} />,
                }}
            />
            <Tab.Screen
                name="Attendance"
                component={AttendanceScreen}
                options={{
                    title: 'Absensi',
                    tabBarIcon: ({ focused }) => <TabIcon name="📊" focused={focused} />,
                }}
            />
            <Tab.Screen
                name="Clock"
                component={ClockScreen}
                options={{
                    title: 'Clock',
                    tabBarIcon: ({ focused }) => (
                        <View style={styles.clockButton}>
                            <Text style={styles.clockButtonText}>⏰</Text>
                        </View>
                    ),
                    tabBarLabel: () => null,
                }}
            />
            <Tab.Screen
                name="Requests"
                component={RequestsScreen}
                options={{
                    title: 'Pengajuan',
                    tabBarIcon: ({ focused }) => <TabIcon name="📋" focused={focused} />,
                }}
            />
            <Tab.Screen
                name="Profile"
                component={ProfileScreen}
                options={{
                    title: 'Profil',
                    tabBarIcon: ({ focused }) => <TabIcon name="👤" focused={focused} />,
                }}
            />
        </Tab.Navigator>
    );
}

// Main App Navigator
export default function AppNavigator() {
    // TODO: Add auth state check
    const isLoggedIn = false;

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {!isLoggedIn ? (
                    <Stack.Screen name="Login" component={LoginScreen} />
                ) : (
                    <Stack.Screen name="MainTabs" component={MainTabNavigator} />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        height: 60,
        paddingBottom: 8,
        paddingTop: 8,
    },
    header: {
        backgroundColor: '#ffffff',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    headerTitle: {
        color: '#0f172a',
        fontWeight: '600',
        fontSize: 18,
    },
    clockButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#0f172a',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    },
    clockButtonText: {
        fontSize: 24,
    },
});
