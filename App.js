import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppProvider } from './src/context/AppContext';
import { COLORS } from './src/utils/theme';

import DailyLogScreen from './src/screens/DailyLogScreen';
import MonthlyLogScreen from './src/screens/MonthlyLogScreen';
import FutureLogScreen from './src/screens/FutureLogScreen';
import CollectionsScreen from './src/screens/CollectionsScreen';
import HabitTrackerScreen from './src/screens/HabitTrackerScreen';
import ReflectionScreen from './src/screens/ReflectionScreen';
import IndexScreen from './src/screens/IndexScreen';
import MoreScreen from './src/screens/MoreScreen';
import HelpScreen from './src/screens/HelpScreen';

const Tab = createBottomTabNavigator();
const MoreStack = createStackNavigator();

function MoreStackScreen() {
  return (
    <MoreStack.Navigator screenOptions={{ headerShown: false }}>
      <MoreStack.Screen name="MoreHome" component={MoreScreen} />
      <MoreStack.Screen name="Help" component={HelpScreen} />
    </MoreStack.Navigator>
  );
}

const TAB_ICONS = {
  Daily: { focused: 'today', unfocused: 'today-outline' },
  Monthly: { focused: 'calendar', unfocused: 'calendar-outline' },
  Future: { focused: 'rocket', unfocused: 'rocket-outline' },
  Collections: { focused: 'folder', unfocused: 'folder-outline' },
  Habits: { focused: 'checkmark-circle', unfocused: 'checkmark-circle-outline' },
  Reflect: { focused: 'heart', unfocused: 'heart-outline' },
  Index: { focused: 'search', unfocused: 'search-outline' },
  More: { focused: 'sparkles', unfocused: 'sparkles-outline' },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <NavigationContainer>
          <StatusBar style="light" />
          <Tab.Navigator
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarStyle: {
                backgroundColor: COLORS.bgCard,
                borderTopColor: COLORS.border,
                borderTopWidth: 0.5,
                height: 85,
                paddingTop: 6,
              },
              tabBarActiveTintColor: COLORS.accent,
              tabBarInactiveTintColor: COLORS.textMuted,
              tabBarLabelStyle: {
                fontSize: 10,
                fontWeight: '600',
                letterSpacing: 0.3,
              },
              tabBarIcon: ({ focused, color, size }) => {
                const icons = TAB_ICONS[route.name];
                const iconName = focused ? icons.focused : icons.unfocused;
                return <Ionicons name={iconName} size={22} color={color} />;
              },
            })}
          >
            <Tab.Screen name="Daily" component={DailyLogScreen} />
            <Tab.Screen name="Monthly" component={MonthlyLogScreen} />
            <Tab.Screen name="Future" component={FutureLogScreen} />
            <Tab.Screen name="Collections" component={CollectionsScreen} />
            <Tab.Screen name="Habits" component={HabitTrackerScreen} />
            <Tab.Screen name="Reflect" component={ReflectionScreen} />
            <Tab.Screen name="Index" component={IndexScreen} />
            <Tab.Screen name="More" component={MoreStackScreen} />
          </Tab.Navigator>
        </NavigationContainer>
      </AppProvider>
    </SafeAreaProvider>
  );
}
