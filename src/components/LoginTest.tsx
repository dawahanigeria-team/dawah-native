/**
 * Login Test Component
 * Demonstrates how to use the authentication system with your specific credentials
 */

import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { useAuthStore } from '../stores';
import { designTokens } from '../theme/designTokens';
import tw from '../theme/twrnc';
import { loginWithRequest, type LoginRequest } from '../utils/authHelper';
import { Button, Text } from './atoms';

export const LoginTest: React.FC = () => {
  const { login, isLoading, error } = useAuthStore();
  const [testResult, setTestResult] = useState<string>('');

  // Your specific login request format
  const loginRequest: LoginRequest = {
    action: 'login_user',
    email_or_username: '{{loginIdentifier}}', // Replace with actual email/username
    password: 'Islam123.'
  };

  const handleTestLogin = async () => {
    try {
      setTestResult('Testing login...');
      
      // Method 1: Using the auth helper
      const result = await loginWithRequest(loginRequest);
      
      if (result.success) {
        setTestResult('Login successful!');
        Alert.alert('Success', 'Login completed successfully');
      } else {
        setTestResult(`Login failed: ${result.message}`);
        Alert.alert('Error', result.message);
      }
    } catch (error: any) {
      setTestResult(`Error: ${error.message}`);
      Alert.alert('Error', error.message);
    }
  };

  const handleDirectLogin = async () => {
    try {
      setTestResult('Testing direct login...');
      
      // Method 2: Using the auth store directly
      await login({
        email: loginRequest.email_or_username,
        password: loginRequest.password
      });
      
      setTestResult('Direct login successful!');
      Alert.alert('Success', 'Direct login completed successfully');
    } catch (error: any) {
      setTestResult(`Direct login failed: ${error.message}`);
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={tw`p-4`}>
      <Text variant="headline" weight="bold" style={tw`mb-4`}>
        Login Test Component
      </Text>
      
      <Text variant="body" style={tw`mb-4`}>
        This component demonstrates how to use your authentication system with the provided credentials.
      </Text>

      <View style={tw`mb-4`}>
        <Text variant="subheadline" weight="semibold" style={tw`mb-2`}>
          Login Request Format:
        </Text>
        <Text variant="caption1" style={tw`font-mono`}>
          {JSON.stringify(loginRequest, null, 2)}
        </Text>
      </View>

      <View style={tw`gap-3`}>
        <Button
          title="Test Login (Helper)"
          onPress={handleTestLogin}
          disabled={isLoading}
          style={[
            tw`py-3 px-4 rounded-lg`,
            { backgroundColor: designTokens.colors.brand.primary }
          ]}
        />
        
        <Button
          title="Test Direct Login"
          onPress={handleDirectLogin}
          disabled={isLoading}
          style={[
            tw`py-3 px-4 rounded-lg`,
            { backgroundColor: designTokens.colors.system.fill.secondary }
          ]}
        />
      </View>

      {testResult && (
        <View style={tw`mt-4 p-3 rounded-lg bg-gray-100`}>
          <Text variant="caption1" style={tw`font-mono`}>
            {testResult}
          </Text>
        </View>
      )}

      {error && (
        <View style={tw`mt-4 p-3 rounded-lg bg-red-100`}>
          <Text variant="caption1" style={{ color: designTokens.colors.semantic.red }}>
            Error: {error}
          </Text>
        </View>
      )}
    </View>
  );
};
