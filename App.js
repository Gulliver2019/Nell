import React from 'react';
import { View, ActivityIndicator, StyleSheet, ScrollView, TouchableOpacity, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppProvider } from './src/context/AppContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

import DailyLogScreen from './src/screens/DailyLogScreen';
import MonthlyLogScreen from './src/screens/MonthlyLogScreen';
import FutureLogScreen from './src/screens/FutureLogScreen';
import CollectionsScreen from './src/screens/CollectionsScreen';
import HabitTrackerScreen from './src/screens/HabitTrackerScreen';
import ReflectionScreen from './src/screens/ReflectionScreen';
import IndexScreen from './src/screens/IndexScreen';
import MoreScreen from './src/screens/MoreScreen';
import HelpScreen from './src/screens/HelpScreen';
import ThemePickerScreen from './src/screens/ThemePickerScreen';
import ProjectsScreen from './src/screens/ProjectsScreen';

const Tab = createBottomTabNavigator();
const MoreStack = createStackNavigator();

function MoreStackScreen() {
  return (
    <MoreStack.Navigator screenOptions={{ headerShown: false }}>
      <MoreStack.Screen name="MoreHome" component={MoreScreen} />
      <MoreStack.Screen name="Help" component={HelpScreen} />
      <MoreStack.Screen name="ThemePicker" component={ThemePickerScreen} />
    </MoreStack.Navigator>
  );
}

const TAB_ICONS = {
  Daily: { focused: 'today', unfocused: 'today-outline' },
  Monthly: { focused: 'calendar', unfocused: 'calendar-outline' },
  Future: { focused: 'rocket', unfocused: 'rocket-outline' },
  Projects: { focused: 'briefcase', unfocused: 'briefcase-outline' },
  Collections: { focused: 'folder', unfocused: 'folder-outline' },
  Habits: { focused: 'checkmark-circle', unfocused: 'checkmark-circle-outline' },
  Reflect: { focused: 'heart', unfocused: 'heart-outline' },
  Index: { focused: 'search', unfocused: 'search-outline' },
  More: { focused: 'sparkles', unfocused: 'sparkles-outline' },
};

function ScrollableTabBar({ state, descriptors, navigation, colors }) {
  return (
    <View style={[styles.tabBarContainer, { backgroundColor: colors.bgCard, borderTopColor: colors.border }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabBarScroll}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = route.name;
          const isFocused = state.index === index;
          const icons = TAB_ICONS[route.name];
          const iconName = isFocused ? icons.focused : icons.unfocused;

          return (
            <TouchableOpacity
              key={route.key}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
              style={styles.tabItem}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
            >
              <Ionicons name={iconName} size={22} color={isFocused ? colors.accent : colors.textMuted} />
              <Text style={[styles.tabLabel, { color: isFocused ? colors.accent : colors.textMuted }]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

function AppContent() {
  const { colors, hasChosenTheme, loading } = useTheme();

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!hasChosenTheme) {
    return <ThemePickerScreen isFirstLaunch={true} />;
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Tab.Navigator
        tabBar={(props) => <ScrollableTabBar {...props} colors={colors} />}
        screenOptions={({ route }) => ({
          headerShown: false,
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
        <Tab.Screen name="Projects" component={ProjectsScreen} />
        <Tab.Screen name="Collections" component={CollectionsScreen} />
        <Tab.Screen name="Habits" component={HabitTrackerScreen} />
        <Tab.Screen name="Reflect" component={ReflectionScreen} />
        <Tab.Screen name="Index" component={IndexScreen} />
        <Tab.Screen name="More" component={MoreStackScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabBarContainer: {
    borderTopWidth: 0.5,
    paddingBottom: 20,
    paddingTop: 6,
  },
  tabBarScroll: {
    paddingHorizontal: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 56,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginTop: 2,
  },
});
