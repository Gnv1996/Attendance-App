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

const COLORS = {
  primary: '#EA580C', 
  primaryLight: '#FB923C',
  success: '#10B981',
  slate900: '#0F172A',
  slate600: '#475569',
  slate400: '#94A3B8',
  slate100: '#F1F5F9',
  bg: '#F8FAFC',
  white: '#FFFFFF',
  gradient: ['#F97316', '#EA580C', '#C2410C'],
};

const CustomDrawer = props => {
  const [userData, setUserData] = useState(null);

  useFocusEffect(
    useCallback(() => {
      const fetchUserData = async () => {
        try {
          const userDataString = await AsyncStorage.getItem('userData');
          if (userDataString) setUserData(JSON.parse(userDataString));
        } catch (error) {
          console.log('❌ Error fetching user data:', error);
        }
      };
      fetchUserData();
    }, []),
  );

  const menuItems = [
    { icon: 'bell-ring-outline', title: 'Notifications', subtitle: '3 new updates', color: '#6366F1' },
    { icon: 'shield-lock-outline', title: 'Security', subtitle: 'Account secure', color: COLORS.success },
    { icon: 'heart-outline', title: 'Help Center', subtitle: 'Get support', color: '#EC4899' },
  ];

  return (
    <View style={styles.drawerContainer}>
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />

      {/* REFINED HEADER SECTION */}
      <LinearGradient colors={COLORS.gradient} style={styles.profileContainer}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <View style={styles.avatarWrapper}>
              <View style={styles.imageInnerBorder}>
                <Image
                  source={{uri: userData?.profileImage || 'https://via.placeholder.com/150'}}
                  style={styles.profileImage}
                />
              </View>
              <View style={styles.activeSpot} />
            </View>
            
            <View style={styles.nameBlock}>
              <Text style={styles.profileName} numberOfLines={1}>
                {userData?.name || 'User Name'}
              </Text>
              <Text style={styles.profileEmail} numberOfLines={1}>
                {userData?.email || 'user@company.com'}
              </Text>
            </View>

            {/* FROSTED STATS CARD */}
            <View style={styles.glassStats}>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>24</Text>
                <Text style={styles.statLab}>PROJECTS</Text>
              </View>
              <View style={styles.statLine} />
              <View style={styles.statBox}>
                <Text style={styles.statNum}>156</Text>
                <Text style={styles.statLab}>TASKS</Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <DrawerContentScrollView {...props} showsVerticalScrollIndicator={false}>
        <View style={styles.mainNav}>
          <Text style={styles.sectionTitle}>WORKSPACE</Text>
          <DrawerItemList {...props} />
        </View>

        <View style={styles.quickAccessNav}>
          <Text style={styles.sectionTitle}>QUICK ACCESS</Text>
          {menuItems.map((item, index) => (
            <TouchableOpacity key={index} style={styles.menuCard} activeOpacity={0.8}>
              <View style={[styles.iconPlate, {backgroundColor: item.color + '15'}]}>
                <MaterialCommunityIcons name={item.icon} size={20} color={item.color} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardSub}>{item.subtitle}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={16} color={COLORS.slate400} />
            </TouchableOpacity>
          ))}
        </View>
      </DrawerContentScrollView>

      {/* MINIMALIST FOOTER */}
      <View style={styles.footerContainer}>
        <Text style={styles.versionText}>v2.4.0</Text>
        <View style={styles.footerDot} />
        <Text style={styles.devBy}>Developed by <Text style={styles.devName}>Gautam</Text></Text>
      </View>
    </View>
  );
};

const MainDrawer = () => {
  const [userData, setUserData] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userDataString = await AsyncStorage.getItem('userData');
        if (userDataString) setUserData(JSON.parse(userDataString));
      } catch (error) {}
    };
    fetchUserData();
  }, []);

  const handleLogout = () => {
    Alert.alert(
      '🔒 Confirm Logout',
      'Are you sure you want to end your session and log out?',
      [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.multiRemove(['userToken', 'userData']);
          navigation.replace('Login');
        },
      },
    ]);
  };

  return (
    <Drawer.Navigator
      drawerContent={props => <CustomDrawer {...props} />}
      screenOptions={({route}) => ({
        headerShown: true,
        headerTitle: route.name,
        headerTitleStyle: {fontWeight: '900', fontSize: 18, color: '#FFF'},
        headerStyle: { backgroundColor: COLORS.primary, elevation: 0, shadowOpacity: 0 },
        headerTintColor: '#fff',
        drawerActiveTintColor: COLORS.primary,
        drawerInactiveTintColor: COLORS.slate600,
        drawerActiveBackgroundColor: COLORS.primary + '0D',
        drawerLabelStyle: {marginLeft: -10, fontSize: 14, fontWeight: '800'},
        drawerItemStyle: {borderRadius: 14, marginHorizontal: 12, marginVertical: 4},
        headerRight: () => (
          <TouchableOpacity onPress={handleLogout} style={{marginRight: 16}}>
            <MaterialCommunityIcons name="power-standby" size={24} color="#fff" />
          </TouchableOpacity>
        ),
        drawerIcon: ({color}) => {
          const icons = {
            Dashboard: 'view-dashboard',
            Profile: 'account-circle-outline',
            Attendance: 'calendar-check-outline',
            Info: 'office-building-marker-outline',
          };
          return <MaterialCommunityIcons name={icons[route.name]} size={22} color={color} />;
        },
      })}>
      <Drawer.Screen name="Dashboard" component={DashboardScreen} />
      <Drawer.Screen name="Profile" component={ProfileScreen} />
      <Drawer.Screen name="Attendance" component={AttendanceScreen} />
      {userData?.crm_id === 525 && <Drawer.Screen name="Info" component={CompanyScreen} />}
    </Drawer.Navigator>
  );
};

const styles = StyleSheet.create({
  drawerContainer: {flex: 1, backgroundColor: COLORS.white},
  profileContainer: {paddingBottom: 35, borderBottomLeftRadius: 40, borderBottomRightRadius: 40},
  headerContent: {alignItems: 'center', paddingTop: 15, paddingHorizontal: 20},
  avatarWrapper: { marginBottom: 15 },
  imageInnerBorder: {
    padding: 3,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  profileImage: {width: 160, height: 160, borderRadius: 80, borderWidth: 4, borderColor: '#FFF'},
  activeSpot: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.success,
    borderWidth: 4,
    borderColor: COLORS.primary,
  },
  nameBlock: {alignItems: 'center', marginBottom: 25},
  profileName: {color: '#FFF', fontSize: 22, fontWeight: '900', letterSpacing: -0.6},
  profileEmail: {color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4, fontWeight: '500'},

  glassStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  statBox: {alignItems: 'center'},
  statNum: {color: '#FFF', fontSize: 18, fontWeight: '900'},
  statLab: {color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '700', marginTop: 2, letterSpacing: 1},
  statLine: {width: 1, height: 25, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 30},

  mainNav: {marginTop: 25},
  sectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.slate400,
    marginLeft: 28,
    marginBottom: 12,
    letterSpacing: 2,
  },
  quickAccessNav: {marginTop: 25, paddingHorizontal: 15},
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    padding: 15,
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.slate100,
  },
  iconPlate: {width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center'},
  cardText: {flex: 1, marginLeft: 15},
  cardTitle: {fontSize: 14, fontWeight: '800', color: COLORS.slate900},
  cardSub: {fontSize: 11, color: COLORS.slate600, marginTop: 2, fontWeight: '500'},

  footerContainer: {
    paddingVertical: 25,
    borderTopWidth: 1,
    borderTopColor: COLORS.slate100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  versionText: {fontSize: 11, color: COLORS.slate400, fontWeight: '800'},
  footerDot: {width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.slate400, marginHorizontal: 10, opacity: 0.3},
  devBy: {fontSize: 11, color: COLORS.slate600, fontWeight: '600'},
  devName: {color: COLORS.primary, fontWeight: '900'}
});

export default MainDrawer;