import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';

export default function AdminLayout() {
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user?.role !== 'superuser') {
      router.replace('/(tabs)');
    }
  }, [user?.role, router]);

  if (user?.role !== 'superuser') {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="users" />
      <Stack.Screen name="user-detail" />
      <Stack.Screen name="create-user" />
      <Stack.Screen name="depots" />
      <Stack.Screen name="asset-admin" />
      <Stack.Screen name="create-asset" />
      <Stack.Screen name="asset-photos" />
      <Stack.Screen name="debug" />
    </Stack>
  );
}
