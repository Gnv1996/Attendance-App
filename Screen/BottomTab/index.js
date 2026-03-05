import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  StatusBar,
  Platform,
  SafeAreaView,
} from 'react-native';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItemList,
} from '@react-navigation/drawer';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import DashboardScreen from '../Dashboard';
import ProfileScreen from '../Profile';
import AttendanceScreen from '../Attaindance';
import CompanyScreen from '../Info';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Drawer = createDrawerNavigator();
const {width} = Dimensions.get('window');

const CustomDrawer = props => {
  const navigation = useNavigation();
  const [userData, setUserData] = useState(null);

  const name = userData?.name || 'Guest User';
  const email = userData?.email || 'example@email.com';

  useFocusEffect(
    useCallback(() => {
      const fetchUserData = async () => {
        try {
          const userDataString = await AsyncStorage.getItem('userData');
          const userData = userDataString ? JSON.parse(userDataString) : null;

          console.warn(userData, 'see the user Data>>>>>');

          setUserData(userData);
        } catch (error) {
          console.log('❌ Error fetching user data:', error);
        }
      };

      fetchUserData();

      // cleanup (optional)
      return () => {
        // screen blur hone par kuch cleanup chahiye ho to
      };
    }, []),
  );

  const menuItems = [
    {
      icon: 'bell-outline',
      title: 'Notifications',
      subtitle: '3 new messages',
      onPress: () => console.log('Notifications pressed'),
    },
    {
      icon: 'cog-outline',
      title: 'Settings',
      subtitle: 'App preferences',
      onPress: () => console.log('Settings pressed'),
    },
    {
      icon: 'help-circle-outline',
      title: 'Help & Support',
      subtitle: 'Get assistance',
      onPress: () => console.log('Help pressed'),
    },
  ];

  return (
    <SafeAreaView style={styles.drawerContainer}>
      <StatusBar
        backgroundColor="#CE5926"
        barStyle="light-content"
        translucent={false}
      />

      <View style={styles.profileContainer}>
        <View style={styles.profileImageContainer}>
          <Image
            source={{uri: userData?.profileImage}}
            style={styles.profileImage}
          />
          <View style={styles.onlineIndicator} />
        </View>
        <Text style={styles.profileName}>{name}</Text>
        <Text style={styles.profileEmail}>{email}</Text>

        <View style={styles.profileStats}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>24</Text>
            <Text style={styles.statLabel}>Projects</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>156</Text>
            <Text style={styles.statLabel}>Tasks</Text>
          </View>
        </View>
      </View>

      <DrawerContentScrollView
        {...props}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.menuContainer}>
          <Text style={styles.sectionHeader}>MAIN MENU</Text>
          <DrawerItemList {...props} />
        </View>

        <View style={styles.extraMenuContainer}>
          <Text style={styles.sectionHeader}>QUICK ACCESS</Text>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuCard}
              onPress={item.onPress}
              activeOpacity={0.7}>
              <View style={styles.menuIconContainer}>
                <MaterialCommunityIcons
                  name={item.icon}
                  size={22}
                  color="#3b82f6"
                />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuCardTitle}>{item.title}</Text>
                <Text style={styles.menuCardSubtitle}>{item.subtitle}</Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color="#cbd5e1"
              />
            </TouchableOpacity>
          ))}
        </View>
      </DrawerContentScrollView>
    </SafeAreaView>
  );
};

const MainDrawer = () => {
  const [userData, setUserData] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userDataString = await AsyncStorage.getItem('userData');
        const userData = userDataString ? JSON.parse(userDataString) : null;

        setUserData(userData);
        // console.warn('📦 Token:', token);
        // console.warn('👤 User Data:', userData);
      } catch (error) {
        console.log('❌ Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, []);

  const handleLogout = () => {
    Alert.alert(
      '🔓 Logout',
      '👋 Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('userToken');
              await AsyncStorage.removeItem('userData');
              navigation.replace('Login'); // ✅ No need to pass it
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ],
      {cancelable: true},
    );
  };

  return (
    <Drawer.Navigator
      initialRouteName="Dashboard"
      drawerContent={props => <CustomDrawer {...props} userData={userData} />}
      screenOptions={({route}) => ({
        headerShown: true,
        headerTitle: () => null,
        headerStyle: {
          backgroundColor: '#CE5926',
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: {width: 0, height: 2},
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        headerTintColor: '#fff',
        drawerActiveTintColor: '#CE5926',
        drawerInactiveTintColor: '#64748b',
        drawerActiveBackgroundColor: 'rgba(30, 64, 175, 0.08)',
        drawerLabelStyle: {
          marginLeft: -15,
          fontSize: 15,
          fontWeight: '500',
        },
        drawerItemStyle: {
          borderRadius: 12,
          marginHorizontal: 12,
          marginVertical: 2,
        },
        drawerIcon: ({color, focused}) => {
          const icons = {
            Dashboard: 'view-dashboard',
            Profile: 'account',
            Attendance: 'calendar-clock',
            Info: 'information-outline', // 👈 ADD THIS
          };
          return (
            <View
              style={[
                styles.drawerIconContainer,
                {
                  backgroundColor: focused
                    ? 'rgba(30, 64, 175, 0.1)'
                    : 'transparent',
                },
              ]}>
              <MaterialCommunityIcons
                name={icons[route.name]}
                size={22}
                color={color}
              />
            </View>
          );
        },
      })}>
      <Drawer.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          headerRight: () => (
            <TouchableOpacity onPress={handleLogout} style={{marginRight: 16}}>
              <MaterialCommunityIcons name="logout" size={24} color="#fff" />
            </TouchableOpacity>
          ),
        }}
      />

      <Drawer.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          headerRight: () => (
            <TouchableOpacity onPress={handleLogout} style={{marginRight: 16}}>
              <MaterialCommunityIcons name="logout" size={24} color="#fff" />
            </TouchableOpacity>
          ),
        }}
      />

      <Drawer.Screen
        name="Attendance"
        component={AttendanceScreen}
        options={{
          headerRight: () => (
            <TouchableOpacity onPress={handleLogout} style={{marginRight: 16}}>
              <MaterialCommunityIcons name="logout" size={24} color="#fff" />
            </TouchableOpacity>
          ),
        }}
      />
      {userData?.crm_id === 525 && (
        <Drawer.Screen
          name="Info"
          component={CompanyScreen}
          options={{
            headerRight: () => (
              <TouchableOpacity
                onPress={handleLogout}
                style={{marginRight: 16}}>
                <MaterialCommunityIcons name="logout" size={24} color="#fff" />
              </TouchableOpacity>
            ),
          }}
        />
      )}
    </Drawer.Navigator>
  );
};

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  profileContainer: {
    backgroundColor: '#CE5926',
    width: '100%',
    alignItems: 'center',
    paddingVertical: 40,
    marginBottom: 20,
  },

  profileImageContainer: {
    position: 'relative',
    marginBottom: 15,
    marginTop: Platform.OS === 'ios' ? 20 : 0,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#ffffff',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#10b981',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  profileName: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  profileEmail: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    marginBottom: 20,
  },
  profileStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 20,
  },
  menuContainer: {
    paddingHorizontal: 10,
    marginTop: Platform.OS === 'ios' ? -70 : 0,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 15,
    marginLeft: 20,
    letterSpacing: 1,
  },
  extraMenuContainer: {
    paddingHorizontal: 10,
    marginTop: 20,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginVertical: 4,
    marginHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  menuCardSubtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  drawerIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  versionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  versionText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  versionDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#cbd5e1',
    marginHorizontal: 8,
  },
});

export default MainDrawer;
