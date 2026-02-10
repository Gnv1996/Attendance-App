import React, {useEffect, useState, useCallback} from 'react';
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
} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useEmployee} from '../Context/EmployeeContext';

const ProfileScreen = () => {
  const [userData, setUserData] = useState(null);
  const {empCode} = useEmployee();

  const user = {
    name: userData?.name,
    email: userData?.email,
    role: 'Senior Software Engineer',
    department: 'Technology',
    employeeId: empCode,
    joinDate: 'Dec 2024',
    profilePic: userData?.profileImage,
    mobileno: userData?.mobile,
    stats: {
      totalHours: 1240,
      projectsCompleted: 15,
      attendanceRate: 99,
    },
  };

  const navigation = useNavigation();

  useFocusEffect(
    useCallback(() => {
      const fetchUserData = async () => {
        try {
          const userDataString = await AsyncStorage.getItem('userData');
          const userData = userDataString ? JSON.parse(userDataString) : null;

          // console.warn(userData, 'see the user Data>>>>>');

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

  // Ensure status bar shows on iOS
  useFocusEffect(() => {
    StatusBar.setBarStyle('light-content', true);
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('#CE5926');
    }
  });

  const handleEditProfile = () => {
    Alert.alert(
      '🔒 Edit Profile Locked',
      'For your security, profile changes can only be made by HR.\n\nPlease contact the HR department to update your details.',
      [
        {
          text: 'Got it!',
          style: 'default',
        },
      ],
      {cancelable: true},
    );
  };

  const handleSettings = () => {
    Alert.alert('Settings', 'Settings page coming soon!');
  };

  const handleChangePassword = () => {
    Alert.alert(
      'Change Password',
      'Change password functionality coming soon!',
    );
  };

  const handleNotifications = () => {
    Alert.alert('Notifications', 'Notification settings coming soon!');
  };

  const handleHelp = () => {
    Alert.alert('Help & Support', 'Help center coming soon!');
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header with Gradient Background */}
      <View style={styles.headerContainer}>
        <View style={styles.headerGradient}>
          <View style={styles.profileHeader}>
            {/* Avatar */}

            <View style={styles.avatarOuter}>
              <View style={styles.avatarWrapper}>
                <Image
                  source={{uri: user.profilePic}}
                  style={styles.profileImage}
                />
                <View style={styles.onlineIndicator} />
              </View>
            </View>

            {/* Name & Email */}
            <Text style={styles.name}>{user.name || '—'}</Text>
            <Text style={styles.email}>{user.email || '—'}</Text>

            {/* Role Card */}
            <View style={styles.roleCard}>
              <Text style={styles.roleText}>👨‍💻 {user.role}</Text>
              <Text style={styles.departmentText}>
                {user.department} • Emp ID: {user.employeeId}
              </Text>
            </View>

            {/* Extra Info */}
            <View style={styles.infoRow}>
              <Text style={styles.infoText}>📅 Joined {user.joinDate}</Text>
              <Text style={styles.infoText}>📱 {user.mobileno}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Stats Section */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>⏰</Text>
          <Text style={styles.statValue}>{user.stats.totalHours}h</Text>
          <Text style={styles.statLabel}>Total Hours</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>🎯</Text>
          <Text style={styles.statValue}>{user.stats.projectsCompleted}</Text>
          <Text style={styles.statLabel}>Projects</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>📊</Text>
          <Text style={styles.statValue}>{user.stats.attendanceRate}%</Text>
          <Text style={styles.statLabel}>Attendance</Text>
        </View>
      </View>

      {/* Options Section */}
      <View style={styles.optionsContainer}>
        <Text style={styles.sectionTitle}>Account Settings</Text>

        <TouchableOpacity
          style={styles.optionButton}
          onPress={handleEditProfile}>
          <View style={styles.optionLeft}>
            <View style={[styles.optionIcon, {backgroundColor: '#CE5926'}]}>
              <Text style={styles.optionIconText}>✏️</Text>
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionText}>Edit Profile</Text>
              <Text style={styles.optionSubtext}>
                Update your personal information
              </Text>
            </View>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionButton}
          onPress={handleChangePassword}>
          <View style={styles.optionLeft}>
            <View style={[styles.optionIcon, {backgroundColor: '#10b981'}]}>
              <Text style={styles.optionIconText}>🔒</Text>
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionText}>Change Password</Text>
              <Text style={styles.optionSubtext}>
                Update your account password
              </Text>
            </View>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionButton}
          onPress={handleNotifications}>
          <View style={styles.optionLeft}>
            <View style={[styles.optionIcon, {backgroundColor: '#f59e0b'}]}>
              <Text style={styles.optionIconText}>🔔</Text>
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionText}>Notifications</Text>
              <Text style={styles.optionSubtext}>
                Manage notification preferences
              </Text>
            </View>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>General</Text>

        <TouchableOpacity style={styles.optionButton} onPress={handleSettings}>
          <View style={styles.optionLeft}>
            <View style={[styles.optionIcon, {backgroundColor: '#8b5cf6'}]}>
              <Text style={styles.optionIconText}>⚙️</Text>
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionText}>Settings</Text>
              <Text style={styles.optionSubtext}>
                App preferences and configuration
              </Text>
            </View>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.optionButton} onPress={handleHelp}>
          <View style={styles.optionLeft}>
            <View style={[styles.optionIcon, {backgroundColor: '#06b6d4'}]}>
              <Text style={styles.optionIconText}>❓</Text>
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionText}>Help & Support</Text>
              <Text style={styles.optionSubtext}>
                Get help and contact support
              </Text>
            </View>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={{height: 100}} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerContainer: {
    marginBottom: -40,
  },

  headerGradient: {
    backgroundColor: '#CE5926',
    paddingTop: 60,
    paddingBottom: 60,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },

  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  avatarOuter: {
    padding: 6,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginBottom: 18,
  },

  avatarWrapper: {
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 12,
  },

  profileImage: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 4,
    borderColor: '#fff',
    backgroundColor: '#f1f5f9',
  },

  onlineIndicator: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#22c55e',
    borderWidth: 3,
    borderColor: '#fff',
  },

  name: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginTop: 6,
  },

  email: {
    fontSize: 14,
    color: '#ffe4d6',
    marginBottom: 16,
  },

  roleCard: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
  },

  roleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },

  departmentText: {
    fontSize: 13,
    color: '#fde8dd',
    marginTop: 2,
  },

  infoRow: {
    flexDirection: 'row',
    gap: 12,
  },

  infoText: {
    fontSize: 12,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },

  onlineIndicator: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10b981',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  name: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: '#e2e8f0',
    marginBottom: 8,
  },
  roleContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  role: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
    marginBottom: 4,
  },
  department: {
    fontSize: 14,
    color: '#cbd5e1',
  },
  joinDate: {
    fontSize: 14,
    color: '#cbd5e1',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 50,
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },

  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  optionsContainer: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 15,
    marginTop: 10,
  },
  optionButton: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // elevation: 2,
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: 1 },
    // shadowOpacity: 0.05,
    // shadowRadius: 4,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  optionIconText: {
    fontSize: 18,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  optionSubtext: {
    fontSize: 13,
    color: '#6b7280',
  },
  arrow: {
    fontSize: 20,
    color: '#9ca3af',
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#fee2e2',
    borderRadius: 16,
    padding: 18,
    marginTop: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  logoutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#dc2626',
  },
});

export default ProfileScreen;
