'use client';

import {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Dimensions,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
  TextInput,
  FlatList,
  ActivityIndicator,
  BackHandler,
  Animated,
} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {Calendar} from 'react-native-calendars';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {BASE_URL} from '../../config';
import LinearGradient from 'react-native-linear-gradient';
import axios from 'axios';
import {useEmployee} from '../Context/EmployeeContext';

const {width} = Dimensions.get('window');

const AttendanceDashboard = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  const [greeting, setGreeting] = useState('');
  const [userData, setUserData] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0],
  );

  const [calendarVisible, setCalendarVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState(null);
  const [breakRecords, setBreakRecords] = useState(null);
  const [checkoutTime, setCheckoutTime] = useState(null);
  const [NoRecord, setNoRecord] = useState(null);

  const [scaleAnim] = useState(new Animated.Value(1));
  const {setEmpCode} = useEmployee();
  const BREAKS_LOCAL_KEY = 'EMPLOYEE_BREAKS';

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userDataString = await AsyncStorage.getItem('userData');
        const userData = userDataString ? JSON.parse(userDataString) : null;
        setUserData(userData);
      } catch (error) {
        console.log('❌ Error fetching user data:', error);
      }
    };
    fetchUserData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        BackHandler.exitApp();
        return true;
      };
      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress,
      );
      return () => backHandler.remove();
    }, []),
  );

  const fetchAttendanceData = async () => {
    if (!userData) return;
  
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
  
      const payload = {
        crmEmpID: userData.crm_id.toString(),
      };
  
      const response = await fetch(
        `${BASE_URL}/CRMAttendance/GetWorkingHours`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );
  
      // 🔥 ALWAYS parse response first
      const data = await response.json();
  
      // 🔒 Session expired
      if (response.status === 401) {
        Alert.alert('Session expired', 'Please login again');
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }
  
      // ❌ Actual server error
     
  
      // ⚠️ No login/logout found (NOT an error)
      if (data.success === false) {
        setAttendanceRecords([]); // clear old data
  
        setNoRecord(data?.message || 'Failed to fetch attendance data');
        return;
      }
  
      // ✅ Success with data
      if (data.success && data.data) {
        setAttendanceRecords(data.data);
      }
    } catch (error) {
      console.error('❌ API Call Failed:', error);
      Alert.alert(
        'Error',
        'Unable to connect to server. Please try again later.'
      );
    } finally {
      setLoading(false);
    }
  };
  
  const fetchBreakRecords = async () => {
    if (!userData) return;
  
    try {
      setLoading(true);
  
      const payload = {
        crmEmpID: userData.crm_id.toString(),
        Date: selectedDate,
      };
  
      const response = await fetch(
        `${BASE_URL}/CRMAttendance/GetEmployeeTransactions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            // Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );
  
      // 🔥 ALWAYS parse response
      const res = await response.json();
  
      // ❌ Unauthorized / server-side failure
      if (!response.ok) {
        Alert.alert(
          'Error',
          res?.message || 'Unable to fetch break records'
        );
        return;
      }
  
      // ⚠️ No transactions found (NOT an error)
      if (res.success === false) {
        setBreakRecords({ transactions: [], breaks: [] });
        setEmpCode(null);
  
        Alert.alert(
          'No Records',
          res.message || 'No break records found for this date'
        );
  
        // optional: clear local cache
        await AsyncStorage.removeItem(BREAKS_LOCAL_KEY);
        return;
      }
  
      // ✅ Success with data
      if (res.success && res.data) {
        setBreakRecords(res.data);
        setEmpCode(res.data.transactions?.[0]?.empcode || null);
  
        await AsyncStorage.setItem(
          BREAKS_LOCAL_KEY,
          JSON.stringify({
            date: selectedDate,
            transactions: res.data.transactions,
          })
        );
  
        loadBreaksFromLocal();
      }
    } catch (error) {
      console.error('❌ API Error:', error);
      Alert.alert(
        'Error',
        'Unable to connect to server. Please try again later.'
      );
    } finally {
      setLoading(false);
    }
  };
  

  // Attendance
  useFocusEffect(
    useCallback(() => {
      if (!userData) return;
      fetchAttendanceData();
      const id = setInterval(fetchAttendanceData, 60000);
      return () => clearInterval(id);
    }, [userData]),
  );

  // Breaks
  useFocusEffect(
    useCallback(() => {
      fetchBreakRecords();
      const id = setInterval(fetchBreakRecords, 60000);
      return () => clearInterval(id);
    }, [userData, selectedDate]),
  );

  const isAfter8PM = () => {
    const now = new Date();
    return now.getHours() >= 20;
  };

  const loadBreaksFromLocal = async () => {
    try {
      const stored = await AsyncStorage.getItem(BREAKS_LOCAL_KEY);
      if (!stored) return;

      const parsed = JSON.parse(stored);

      // ✅ same date check (optional but recommended)
      if (parsed.date !== selectedDate) return;

      // ✅ sirf 8 PM ke baad local se load
      if (!isAfter8PM()) return;

      const transactions = Array.isArray(parsed.transactions)
        ? parsed.transactions
        : [];

      if (transactions.length === 0) return;

      // ✅ last transaction = final checkout
      const lastTransaction = transactions[transactions.length - 1];

      if (!lastTransaction?.LogoutTime) return;

      setCheckoutTime(lastTransaction.LogoutTime);
    } catch (e) {
      console.error('❌ Checkout set error', e);
    }
  };

  const calculateTotalBreakMinutes = breaks => {
    if (!Array.isArray(breaks) || breaks.length === 0) return '0 min';

    // Total seconds
    const totalSeconds = breaks.reduce((total, item) => {
      const [hh, mm, ss] = item.BreakDuration.split(':').map(Number);
      return total + hh * 3600 + mm * 60 + ss;
    }, 0);

    // Convert to decimal minutes
    const decimalMinutes = totalSeconds / 60;

    // Round to 2 decimal points
    return `${decimalMinutes.toFixed(2)} min`;
  };

  const navigation = useNavigation();

  const attendanceData = {
    totalWorkingHours: 42.5,
    weeklyTarget: 9,
    breaksToday: 4,
    totalBreakTime: 45,
    checkInTime: '09:00 AM',
    expectedCheckOut: '06:00 PM',
    breaksAllowed: 4,
    currentStatus: 'working',
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const hour = currentTime.getHours();
    if (hour >= 5 && hour < 12) setGreeting('Good Morning');
    else if (hour >= 12 && hour < 17) setGreeting('Good Afternoon');
    else if (hour >= 17 && hour < 22) setGreeting('Good Evening');
    else setGreeting('Good Night');
  }, [currentTime]);

  const formatDate = date => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  const parseWorkingHours = timeString => {
    if (!timeString) return 0;
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours + minutes / 60;
  };

  const progressPercent = Math.min(
    (parseWorkingHours(attendanceRecords?.WorkingHours) /
      attendanceData.weeklyTarget) *
      100,
    100,
  );
  const formatTime = timeStr => {
    if (!timeStr) return '--:--';

    try {
      const [hourStr, minuteStr, secondStr] = timeStr.split(':');
      const hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);

      if (isNaN(hour) || isNaN(minute)) return '--:--';

      const date = new Date();
      date.setHours(hour, minute, 0, 0);

      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch (error) {
      console.error('Format Time Error:', error);
      return '--:--';
    }
  };

  const formatTimeWithSeconds = timeStr => {
    if (!timeStr) return '--:--:--';

    try {
      const parts = timeStr.split(':');
      if (parts.length < 2) return '--:--:--';

      const hh = parts[0].padStart(2, '0');
      const mm = parts[1].padStart(2, '0');
      const ss = (parts[2] || '00').padStart(2, '0');

      return `${hh}:${mm}:${ss}`;
    } catch (e) {
      return '--:--:--';
    }
  };

  const getProgressColor = () => {
    const percent = progressPercent;
    if (percent >= 100) return '#10b981';
    if (percent >= 80) return '#3b82f6';
    if (percent >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const getStatusColor = () => {
    switch (attendanceData.currentStatus) {
      case 'working':
        return '#10b981';
      case 'on_break':
        return '#f59e0b';
      case 'checked_out':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  const getStatusText = () => {
    switch (attendanceData.currentStatus) {
      case 'working':
        return '💼 Currently Working';
      case 'on_break':
        return '☕ On Break';
      case 'checked_out':
        return '🏠 Checked Out';
      default:
        return '❓ Unknown Status';
    }
  };

  const getWorkedTimeInSeconds = () => {
    if (!attendanceRecords?.LoginTime) return 0;

    const loginTimeStr =
      attendanceRecords.LoginTime.split(' ')[1] || attendanceRecords.LoginTime;
    const [h, m, s = 0] = loginTimeStr.split(':').map(Number);

    const loginDate = new Date();
    loginDate.setHours(h, m, s, 0);

    const now = new Date();
    const diffMs = now - loginDate;

    return Math.max(Math.floor(diffMs / 1000), 0);
  };

  const formatRemainingLiveTime = () => {
    const targetSeconds = 9 * 60 * 60; // 9 hours
    const workedSeconds = getWorkedTimeInSeconds();

    let remaining = targetSeconds - workedSeconds;
    if (remaining <= 0) return '0m 0s';

    const h = Math.floor(remaining / 3600);
    const m = Math.floor((remaining % 3600) / 60);
    const s = remaining % 60;

    return `${h > 0 ? h + 'h ' : ''}${m}m ${s}s`;
  };

  // const isSunday = () => {
  //   return true; // 🔥 always Sunday
  // };

  const isSunday = () => {
    return new Date().getDay() === 0; // 0 = Sunday
  };

  useEffect(() => {
    if (!isSunday()) return;

    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  return (
    <View edges={['top']} style={styles.container}>
      <StatusBar backgroundColor="#CE5926" barStyle="light-content" />

      <LinearGradient
        colors={['#CE5926', '#E67E50']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.headerGradient}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.hiText}>👋</Text>
            <View style={styles.headerTextGroup}>
              <Text style={styles.greetingText}>{greeting}</Text>
              <TouchableOpacity onPress={fetchAttendanceData}>
                <Text style={styles.userNameText}>
                  {userData?.name || 'Guest'}
                </Text>
                <Text style={styles.dateText}>{formatDate(currentTime)}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.timeBlock}>
            <Text style={styles.timeText}>
              {currentTime.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true,
              })}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}>
    {isSunday() ? (
    <LinearGradient
      colors={['#16a34a', '#4ade80', '#bbf7d0']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.card,
        {
          paddingVertical: 34,
          alignItems: 'center',
          borderRadius: 24,
        },
      ]}
    >
      {/* Emoji */}
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Text style={{ fontSize: 70 }}>🌴🔋</Text>
      </Animated.View>

      <Text
        style={{
          fontSize: 26,
          fontWeight: '900',
          color: '#052e16',
          marginTop: 14,
        }}
      >
        Sunday Recharge Mode
      </Text>

      <Text
        style={{
          fontSize: 15,
          color: '#065f46',
          marginTop: 10,
          textAlign: 'center',
          maxWidth: 280,
          lineHeight: 22,
        }}
      >
        No office. No pressure.{"\n"}Just relax & enjoy your day 😌
      </Text>

      <View
        style={{
          marginTop: 20,
          backgroundColor: 'rgba(255,255,255,0.45)',
          paddingHorizontal: 22,
          paddingVertical: 10,
          borderRadius: 30,
          elevation: 4,
        }}
      >
        <Text
          style={{
            fontSize: 13,
            fontWeight: '800',
            color: '#064e3b',
            letterSpacing: 0.8,
          }}
        >
          ☀️ SUNDAY • OFF DAY
        </Text>
      </View>
    </LinearGradient>
  ) : (
    <>
      {/* Working Hours Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardTitle}>⏰ Today's Working Hours</Text>
            <Text style={styles.cardSubtitle}>Track your daily progress</Text>
          </View>

          <View
            style={[
              styles.badge,
              { backgroundColor: getProgressColor() },
            ]}
          >
            <Text style={styles.badgeText}>
              {Math.min(progressPercent, 100).toFixed(0)}%
            </Text>
          </View>
        </View>

        <View style={styles.hoursDisplay}>
          <View style={styles.hoursBox}>
            <Text style={styles.hoursValue}>
              {attendanceRecords?.WorkingHours ?? '0'}
            </Text>
            <Text style={styles.hoursLabel}>Hours Worked</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.hoursBox}>
            <Text style={styles.targetValue}>9</Text>
            <Text style={styles.hoursLabel}>Daily Target</Text>
          </View>
        </View>

        <View style={styles.progressContainer}>
        {NoRecord ? (
  <Text style={{ color: 'red', fontSize: 14, marginTop: 6,padding:20 }}>
    {NoRecord}
  </Text>
) : null}
          <View style={styles.progressBarBackground}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.min(progressPercent, 100)}%`,
                  backgroundColor: getProgressColor(),
                },
              ]}
            />
          </View>

          <Text style={styles.progressText}>
            {formatRemainingLiveTime()} remaining
          </Text>
        </View>
      </View>

      {/* Schedule Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>📅 Today's Schedule</Text>
        </View>

        <View style={styles.scheduleGrid}>
          <View style={styles.scheduleItem}>
            <Text style={styles.scheduleLabel}>Check-in</Text>
            <Text style={[styles.scheduleTime, { color: '#10b981' }]}>
              {attendanceRecords?.LoginTime
                ? attendanceRecords.LoginTime.split(' ')?.[1]
                : '--'}
            </Text>
          </View>

          <View style={styles.scheduleItem}>
            <Text style={styles.scheduleLabel}>Check-out</Text>
            <Text style={[styles.scheduleTime, { color: '#CE5926' }]}>
              {checkoutTime
                ? formatTimeWithSeconds(checkoutTime)
                : '----'}
            </Text>
          </View>
        </View>
      </View>
    </>
  )}

        {/* <View style={styles.card}>
          {' '}
          <View style={styles.cardHeader}>
            {' '}
            <Text style={styles.cardTitle}>📅 Today's Schedule</Text>{' '}
          </View>{' '}
          <View style={styles.scheduleGrid}>
            {' '}
            <View style={styles.scheduleItem}>
              {' '}
              <Text style={styles.scheduleLabel}>Check-in</Text>{' '}
              <Text style={[styles.scheduleTime, {color: '#10b981'}]}>
                {' '}
                {attendanceRecords?.LoginTime?.split(' ')[1] ?? '--'}{' '}
              </Text>{' '}
            </View>{' '}
            <View style={styles.scheduleItem}>
              {' '}
              <Text style={styles.scheduleLabel}>Check-out</Text>{' '}
              <Text style={[styles.scheduleTime, {color: '#CE5926'}]}>
                {' '}
                {checkoutTime
                  ? formatTimeWithSeconds(checkoutTime)
                  : '----'}{' '}
              </Text>
            </View>
          </View>
        </View> */}

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>☕ Break Summary</Text>
            <TouchableOpacity
              style={styles.viewDetailsBtn}
              onPress={() => setModalVisible(true)}>
              <Text style={styles.viewDetailsText}>View Details</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.breakStatsGrid}>
            <View style={[styles.statCard, {borderLeftColor: '#f59e0b'}]}>
              <Text style={styles.statValue}>
                {attendanceRecords?.BreakCount || 0}
              </Text>
              <Text style={styles.statLabel}>Breaks Taken</Text>
            </View>
            <View style={[styles.statCard, {borderLeftColor: '#8b5cf6'}]}>
              <Text style={styles.statValue}>
                {4 - (attendanceRecords?.BreakCount || 0)}
              </Text>
              <Text style={styles.statLabel}>Remaining</Text>
            </View>
            <View style={[styles.statCard, {borderLeftColor: '#ef4444'}]}>
              <Text style={styles.statValue}>
                {calculateTotalBreakMinutes(breakRecords?.breaks)}
              </Text>
              <Text style={styles.statLabel}>Total Time</Text>
            </View>
          </View>

          {loading && (
            <ActivityIndicator
              size="large"
              color="#CE5926"
              style={{marginTop: 20}}
            />
          )}

          {breakRecords?.breaks && breakRecords.breaks.length > 0 && (
            <View style={styles.breaksList}>
              <Text style={styles.breaksListTitle}>Today's Breaks</Text>
              {breakRecords.breaks.map((item, index) => (
                <View key={index} style={styles.breakItem}>
                  <View style={styles.breakTimeInfo}>
                    <Text style={styles.breakTime}>
                      {formatTime(item.BreakIn)} - {formatTime(item.BreakOut)}
                    </Text>
                    <View style={styles.durationBadge}>
                      <Text style={styles.durationText}>
                        {item.BreakDuration.replace(/^00:/, '')}m
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.statsRow}>
          <LinearGradient
            colors={['#CE5926', '#E67E50']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.statCardGradient}>
            <Text style={styles.statCardIcon}>📅</Text>
            <Text style={styles.statCardValue}>6</Text>
            <Text style={styles.statCardLabel}>Days This Week</Text>
          </LinearGradient>

          <LinearGradient
            colors={['#10b981', '#34d399']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.statCardGradient}>
            <Text style={styles.statCardIcon}>⏰</Text>
            <Text style={styles.statCardValue}>
              {attendanceRecords?.WorkingHours || '0'}
            </Text>
            <Text style={styles.statCardLabel}>Today's Hours</Text>
          </LinearGradient>
        </View>

        <View
          style={[
            styles.statusCard,
            {
              backgroundColor: getStatusColor() + '15',
              borderColor: getStatusColor(),
            },
          ]}>
          <View
            style={[styles.statusDot, {backgroundColor: getStatusColor()}]}
          />
          <Text style={[styles.statusText, {color: getStatusColor()}]}>
            {getStatusText()}
          </Text>
        </View>

        <View style={{height: 30}} />
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🔍 Break Records</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchRow}>
              <TextInput
                style={styles.modalInput}
                value={userData?.name?.split(' ')[0] || ''}
                placeholder="Employee Name"
                placeholderTextColor="#999"
                editable={false}
              />
              <TouchableOpacity
                style={styles.datePickerBtn}
                onPress={() => setCalendarVisible(true)}>
                <Text style={styles.datePickerText}>
                  {selectedDate
                    ? new Date(selectedDate).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'Select Date'}
                </Text>
              </TouchableOpacity>
            </View>

            {calendarVisible && (
              <Calendar
                onDayPress={day => {
                  setSelectedDate(day.dateString);
                  setCalendarVisible(false);
                }}
                style={{marginBottom: 20}}
              />
            )}

            <Text style={styles.tableTitle}>📋 Transaction Records</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, styles.tableCellHeader]}>#</Text>
              <Text style={[styles.tableCell, styles.tableCellHeader]}>
                Date
              </Text>
              <Text style={[styles.tableCell, styles.tableCellHeader]}>In</Text>
              <Text style={[styles.tableCell, styles.tableCellHeader]}>
                Out
              </Text>
              <Text style={[styles.tableCell, styles.tableCellHeader]}>
                Duration
              </Text>
            </View>

            <FlatList
              data={breakRecords?.transactions || []}
              keyExtractor={(item, index) => item.id.toString()}
              renderItem={({item, index}) => (
                <View style={styles.tableRow}>
                  <Text style={[styles.tableCell, styles.tableCellContent]}>
                    {index + 1}
                  </Text>
                  <Text style={[styles.tableCell, styles.tableCellContent]}>
                    {new Date(item.LogDate).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Text>
                  <Text style={[styles.tableCell, styles.tableCellContent]}>
                    {item.LoginTime || '—'}
                  </Text>
                  <Text style={[styles.tableCell, styles.tableCellContent]}>
                    {item.LogoutTime || '—'}
                  </Text>
                  <Text style={[styles.tableCell, styles.tableCellContent]}>
                    {item.ActualWorkingTime
                      ? item.ActualWorkingTime.replace(/^00:/, '')
                      : '—'}
                  </Text>
                </View>
              )}
              scrollEnabled={true}
            />

            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.modalCloseBtn}>
              <Text style={styles.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerGradient: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 30,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  hiText: {
    fontSize: 32,
    marginRight: 12,
  },
  headerTextGroup: {
    flex: 1,
  },
  greetingText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  userNameText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  dateText: {
    fontSize: 13,
    color: '#f3f4f6',
    marginTop: 2,
  },
  timeBlock: {
    alignItems: 'flex-end',
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 10,
    borderColor: '#E67E50',
    borderWidth: 1.5, // thinner border
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: {width: 0, height: 2},
    elevation: 2, // Android ke liye light shadow
  },

  timeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#CE5926',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 2,
  },
  badge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  badgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  hoursDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 12,
  },
  hoursBox: {
    alignItems: 'center',
    flex: 1,
  },
  hoursValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#CE5926',
    marginBottom: 4,
  },
  targetValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#9ca3af',
    marginBottom: 4,
  },
  hoursLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: '#e5e7eb',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBarBackground: {
    width: '100%',
    height: 10,
    backgroundColor: '#e5e7eb',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: 10,
    borderRadius: 5,
  },
  progressText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'right',
    fontWeight: '500',
  },
  scheduleGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  scheduleItem: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  scheduleLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 6,
  },
  scheduleTime: {
    fontSize: 18,
    fontWeight: '700',
  },
  viewDetailsBtn: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  viewDetailsText: {
    fontSize: 12,
    color: '#CE5926',
    fontWeight: '600',
  },
  breakStatsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 4,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  breaksList: {
    marginTop: 12,
  },
  breaksListTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  breakItem: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  breakTimeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakTime: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  durationBadge: {
    backgroundColor: '#fbbf24',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  durationText: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCardGradient: {
    flex: 1,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 6,
    paddingVertical: Platform.OS === 'ios' ? 0 : 18,
    // paddingVertical:20
  },
  statCardIcon: {
    fontSize: 28,
    marginBottom: 8,
    marginTop: Platform.OS === 'ios' ? 10 : 0,
  },
  statCardValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  statCardLabel: {
    fontSize: 12,
    color: '#f3f4f6',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: Platform.OS === 'ios' ? 10 : 0,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 20,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    maxHeight: '90%',
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  closeIcon: {
    fontSize: 24,
    color: '#9ca3af',
    fontWeight: '600',
  },
  modalSearchRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  modalInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
    fontSize: 14,
    color: '#1f2937',
  },
  datePickerBtn: {
    height: 44,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 140,
  },
  datePickerText: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
  tableTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
    marginTop: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
  },
  tableCellHeader: {
    fontWeight: '700',
    color: '#374151',
  },
  tableCellContent: {
    color: '#6b7280',
  },
  modalCloseBtn: {
    backgroundColor: '#CE5926',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    elevation: 3,
  },
  modalCloseBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});

export default AttendanceDashboard;
