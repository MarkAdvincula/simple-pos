import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import MenuScreen from './screens/MenuScreen';
import PaymentScreen from './screens/PaymentScreen';
import QRScreen from './screens/QRScreen';
import CameraScreen from './screens/CameraScreen';
import QRConfiguration from './screens/QRConfiguration';
import RecordsScreen from './screens/RecordsScreen';
import MaintenanceScreen from './screens/MaintenanceScreen';
import PrintersScreen from './screens/PrintersScreen';
import EditTransactionScreen from './screens/EditTransactionScreen';
import LoginScreen from './screens/LoginScreen';
import AdminDashboard from './screens/AdminDashboard';
import CashierDashboard from './screens/CashierDashboard';
import { Dimensions } from 'react-native';
import { ScreenProvider, useScreen } from './src/contexts/ScreenContext';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import ProtectedRoute from './src/components/ProtectedRoute';


const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const { isAuthenticated, isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={isAdmin() ? "AdminDashboard" : "CashierDashboard"}
      screenOptions={{
        headerShown: false,
        animation: 'none',
      }}
    >
      <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
      <Stack.Screen name="CashierDashboard" component={CashierDashboard} />
      <Stack.Screen name="Menu" component={MenuScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen name="QR" component={QRScreen} />
      <Stack.Screen name="Camera" component={CameraScreen} />

      {/* Admin-only screens */}
      <Stack.Screen name="Printers">
        {(props) => (
          <ProtectedRoute requiredRole="admin">
            <PrintersScreen {...props} />
          </ProtectedRoute>
        )}
      </Stack.Screen>
      <Stack.Screen name="Maintenance">
        {(props) => (
          <ProtectedRoute requiredRole="admin">
            <MaintenanceScreen {...props} />
          </ProtectedRoute>
        )}
      </Stack.Screen>
      <Stack.Screen name="Records">
        {(props) => (
          <ProtectedRoute requiredRole="admin">
            <RecordsScreen {...props} />
          </ProtectedRoute>
        )}
      </Stack.Screen>
      <Stack.Screen name="EditTransaction">
        {(props) => (
          <ProtectedRoute requiredRole="admin">
            <EditTransactionScreen {...props} />
          </ProtectedRoute>
        )}
      </Stack.Screen>
      <Stack.Screen name="ConfigQR">
        {(props) => (
          <ProtectedRoute requiredRole="admin">
            <QRConfiguration {...props} />
          </ProtectedRoute>
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ScreenProvider>
        <NavigationContainer>
          <StatusBar style="dark" />
          <AppNavigator />
        </NavigationContainer>
      </ScreenProvider>
    </AuthProvider>
  );
}