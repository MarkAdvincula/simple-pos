import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import MenuScreen from './screens/MenuScreen';
import PaymentScreen from './screens/PaymentScreen';
import QRScreen from './screens/QRScreen';
import CameraScreen from './screens/CameraScreen';
import QRConfiguration from './screens/QRConfiguration';
import RecordsScreen from './screens/RecordsScreen';
import MaintenanceScreen from './screens/MaintenanceScreen';
import PrintersScreen from './screens/PrintersScreen';


const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator 
        initialRouteName="Menu"
        screenOptions={{
          headerShown: false,
          animation: 'none',
        }}
      >
        <Stack.Screen name="Menu" component={MenuScreen} />
        <Stack.Screen name="Printers" component={PrintersScreen} />
        <Stack.Screen name="Maintenance" component={MaintenanceScreen} />
        <Stack.Screen name="Records" component={RecordsScreen} />
        <Stack.Screen name="Payment" component={PaymentScreen} />
        <Stack.Screen name="QR" component={QRScreen} />
        <Stack.Screen name="ConfigQR" component={QRConfiguration} />
        <Stack.Screen name="Camera" component={CameraScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
