import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthLayout() {
  const { session, loading } = useAuth();

  if (loading) {
    return <></>; // Or a loading spinner
  }

  if (session) {
    return <Redirect href="/" />;
  }

  return <Stack />;
}
