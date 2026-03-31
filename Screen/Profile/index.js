import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  ScrollView,
  Dimensions,
  StatusBar,
  Platform,
  SafeAreaView
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useEmployee } from '../Context/EmployeeContext';
import { BASE_URL } from '../../config';
import PremiumLoader from '../../Src/Component';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#F97316', // Vibrant Orange
  primaryDark: '#C2410C',
  accent: '#0EA5E9',
  bg: '#F8FAFC',
  card: '#FFFFFF',
  textMain: '#0F172A',
  textLight: '#64748B',
  success: '#10B981',
  border: '#E2E8F0',
  gradient: ['#F97316', '#EA580C', '#C2410C']
};

const ProfileScreen = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [empcode, setempcode] = useState('');
  const navigation = useNavigation();

  useEffect(() => {
    fetchAttendanceData();
  }, []);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      const userDataString = await AsyncStorage.getItem('userData');
      const userDatas = userDataString ? JSON.parse(userDataString) : null;

      const payload = {
        CrmEmployeeID: userDatas.crm_id.toString(),
        RoleID: userDatas.roleId.toString()
      };

      const response = await fetch(`${BASE_URL}/CRMAttendance/EmployeeBind`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.data && data.data[0]) {
        setempcode(data.data[0].EmployeeCode);
      }

      if (response.status === 401) {
        Alert.alert('Session expired', 'Please login again');
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }
    } catch (error) {
      console.error('❌ API Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const fetchUserData = async () => {
        try {
          const userDataString = await AsyncStorage.getItem('userData');
          if (userDataString) setUserData(JSON.parse(userDataString));
        } catch (error) {
          console.log('❌ Error:', error);
        }
      };
      fetchUserData();
      StatusBar.setBarStyle('light-content', true);
      if (Platform.OS === 'android') StatusBar.setBackgroundColor('transparent');
    }, [])
  );

  const stats = [
    { label: 'Total Hours', value: '1,240h', icon: 'schedule', color: '#6366F1' },
    { label: 'Projects', value: '15', icon: 'assignment', color: '#F59E0B' },
    { label: 'Attendance', value: '99%', icon: 'insights', color: '#10B981' },
  ];

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

  const SettingItem = ({ icon, title, sub, color, onPress, isLast }) => (
    <TouchableOpacity 
        style={[styles.optionButton, !isLast && styles.borderBottom]} 
        onPress={onPress}
        activeOpacity={0.7}
    >
      <View style={styles.optionLeft}>
        <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
          <Icon name={icon} size={22} color={color} />
        </View>
        <View>
          <Text style={styles.optionText}>{title}</Text>
          <Text style={styles.optionSubtext}>{sub}</Text>
        </View>
      </View>
      <Icon name="chevron-right" size={24} color={COLORS.textLight} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.mainContainer}>
  <StatusBar backgroundColor="#EA580C" barStyle="light-content" />
  <PremiumLoader visible={loading} message="Fetching Employees..." />
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        
        {/* HEADER SECTION */}
        <LinearGradient colors={COLORS.gradient} style={styles.headerGradient}>
          <SafeAreaView>
            <View style={styles.headerInternal}>
              <View style={styles.topActions}>
                {/* <Text style={styles.headerTitle}>Profile</Text> */}
                <TouchableOpacity style={styles.notifBtn}>
                  <Icon name="notifications-none" size={24} color="#FFF" />
                </TouchableOpacity>
              </View>

              <View style={styles.profileInfo}>
                <View style={styles.avatarWrapper}>
                  <Image
                    source={{ uri: userData?.profileImage || 'https://via.placeholder.com/150' }}
                    style={styles.profileImage}
                  />
                  <View style={styles.activeBadge} />
                </View>
                <Text style={styles.userName}>{userData?.name || 'User Name'}</Text>
                <Text style={styles.userEmail}>{userData?.email || 'email@company.com'}</Text>
                
                <View style={styles.badgeRow}>
                  <View style={styles.glassBadge}>
                    <Icon name="work-outline" size={14} color="#FFF" />
                    <Text style={styles.badgeText}>Senior Engineer</Text>
                  </View>
                  <View style={styles.glassBadge}>
                    <Icon name="fingerprint" size={14} color="#FFF" />
                    <Text style={styles.badgeText}>ID: {empcode || '---'}</Text>
                  </View>
                </View>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>

        {/* STATS SECTION */}
        <View style={styles.contentBody}>
          <View style={styles.statsRow}>
            {stats.map((s, i) => (
              <View key={i} style={styles.statCard}>
                <View style={[styles.statIconCircle, { backgroundColor: s.color + '10' }]}>
                  <Icon name={s.icon} size={20} color={s.color} />
                </View>
                <Text style={styles.statVal}>{s.value}</Text>
                <Text style={styles.statLab}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* SETTINGS GROUPS */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Account Settings</Text>
            <View style={styles.card}>
              <SettingItem 
                icon="person-outline" 
                title="Edit Profile" 
                sub="Personal details and display name" 
                color="#6366F1"
                onPress={() => Alert.alert('Notice', 'Contact HR to update profile.')}
              />
              <SettingItem 
                icon="lock-outline" 
                title="Change Password" 
                sub="Secure your account with a new password" 
                color={COLORS.success}
                onPress={() => {}}
              />
              <SettingItem 
                icon="notifications-paused" 
                title="Notifications" 
                sub="Daily alerts and reminders" 
                color="#F59E0B"
                onPress={() => {}}
                isLast
              />
            </View>
          </View>

          <View style={[styles.section, { marginBottom: 40 }]}>
            <Text style={styles.sectionLabel}>Support & App</Text>
            <View style={styles.card}>
              <SettingItem 
                icon="help-outline" 
                title="Help Center" 
                sub="FAQ and technical support" 
                color="#0EA5E9"
                onPress={() => {}}
              />
              <SettingItem 
                icon="info-outline" 
                title="Terms & Privacy" 
                sub="Legal information and policies" 
                color={COLORS.textLight}
                onPress={() => {}}
                isLast
              />
            </View>
            
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <Icon name="power-settings-new" size={20} color={COLORS.primary} />
                <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: COLORS.bg },
  headerGradient: { 
    paddingBottom: 40,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  headerInternal: { paddingHorizontal: 24, paddingTop: 10 },
  topActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  notifBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  
  profileInfo: { alignItems: 'center', marginTop: 20 },
  avatarWrapper: {
    padding: 5,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginBottom: 15,
  },
  profileImage: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#FFF' },
  activeBadge: { position: 'absolute', bottom: 5, right: 5, width: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.success, borderWidth: 3, borderColor: COLORS.primary },
  
  userName: { color: '#FFF', fontSize: 24, fontWeight: '800' },
  userEmail: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 4 },
  
  badgeRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  glassBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: '700', marginLeft: 6 },

  contentBody: { paddingHorizontal: 20, marginTop: -30 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  statCard: { 
    width: '31%', 
    backgroundColor: '#FFF', 
    borderRadius: 24, 
    paddingVertical: 20, 
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 10 },
      android: { elevation: 4 }
    })
  },
  statIconCircle: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statVal: { fontSize: 18, fontWeight: '800', color: COLORS.textMain },
  statLab: { fontSize: 10, color: COLORS.textLight, fontWeight: '600' },

  section: { marginTop: 10 },
  sectionLabel: { fontSize: 14, fontWeight: '800', color: COLORS.textLight, marginBottom: 12, marginLeft: 5, textTransform: 'uppercase', letterSpacing: 1 },
  card: { backgroundColor: '#FFF', borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  optionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  optionLeft: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  iconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  optionText: { fontSize: 16, fontWeight: '700', color: COLORS.textMain },
  optionSubtext: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 25, backgroundColor: COLORS.primary + '10', paddingVertical: 16, borderRadius: 20, borderWidth: 1, borderColor: COLORS.primary + '30' },
  logoutText: { color: COLORS.primary, fontWeight: '800', fontSize: 16, marginLeft: 10 }
});

export default ProfileScreen;