import { Redirect } from 'expo-router';
import { useEffect } from 'react';

export default function AuthIndex() {
  useEffect(() => {
    console.log('🔐 Auth Index: Redirecting to login screen');
  }, []);

  return <Redirect href="/login" />;
} 