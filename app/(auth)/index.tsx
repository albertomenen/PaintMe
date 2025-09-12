import { Redirect } from 'expo-router';
import { useEffect } from 'react';

export default function AuthIndex() {
  useEffect(() => {
    console.log('🎨 Auth Index: Redirecting to welcome screen');
  }, []);

  return <Redirect href="/welcome" />;
} 