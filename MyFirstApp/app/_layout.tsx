import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { ProjectsProvider } from '@/contexts/ProjectsContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

export const unstable_settings = {
  // This is handled by the Redirect component based on session
  // initialRouteGroup: 'auth',
};

function RootLayoutContent() {
  const colorScheme = useColorScheme();
  const { session, loading } = useAuth();

  if (loading) {
    return null; // Or a loading indicator
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        {session ? (
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        ) : (
          <Stack.Screen name="auth" options={{ headerShown: false }} />
        )}
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="add-project" options={{ presentation: 'modal', title: 'New Project' }} />
        <Stack.Screen name="project-dashboard" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ProjectsProvider>
        <RootLayoutContent />
      </ProjectsProvider>
    </AuthProvider>
  );
}