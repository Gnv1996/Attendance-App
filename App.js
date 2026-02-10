import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar, Platform } from 'react-native';

import SplashScreen from './Screen/SplashScreen';
import LoginScreen from './Screen/LoginScreen';
// import BottomTabNavigator from './Screen/BottomTab';
import MainDrawer from './Screen/BottomTab';
import  {EmployeeProvider}  from './Screen/Context/EmployeeContext';


const Stack = createStackNavigator();

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState('Splash');

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const userToken = await AsyncStorage.getItem('userToken');
        setInitialRoute(userToken ? 'Main' : 'Login');
      } catch (error) {
        console.log('Login check error:', error);
        setInitialRoute('Login');
      } finally {
        setIsLoading(false);
      }
    };

    setTimeout(checkLoginStatus, 2000);
  }, []);

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <>
      <StatusBar
        backgroundColor="#CE5926"
        barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'}
      />
       <EmployeeProvider>
       <NavigationContainer>
        <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
   
          <Stack.Screen name="Main" component={MainDrawer}  options={{ headerShown: false }}/>
        </Stack.Navigator>
      </NavigationContainer>


       </EmployeeProvider>
   
    </>
  );
};

export default App;
