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
import PremiumLoader from '../../Src/Component';

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
        },
      );

      // 🔥 ALWAYS parse response first
      const data = await response.json();

      // 🔒 Session expired
      if (response.status === 401) {
        Alert.alert('Session expired', 'Please login again');
        navigation.reset({index: 0, routes: [{name: 'Login'}]});
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
        'Unable to connect to server. Please try again later.',
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
        },
      );

      // 🔥 ALWAYS parse response
      const res = await response.json();

      // ❌ Unauthorized / server-side failure
      if (!response.ok) {
        Alert.alert('Error', res?.message || 'Unable to fetch break records');
        return;
      }

      // ⚠️ No transactions found (NOT an error)
      if (res.success === false) {
        setBreakRecords({transactions: [], breaks: []});
        setEmpCode(null);

        Alert.alert(
          'No Records',
          res.message || 'No break records found for this date',
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
          }),
        );

        loadBreaksFromLocal();
      }
    } catch (error) {
      console.error('❌ API Error:', error);
      Alert.alert(
        'Error',
        'Unable to connect to server. Please try again later.',
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

      <PremiumLoader visible={loading} message="Fetching Employees..." />
      <LinearGradient
        colors={['#F97316', '#EA580C', '#C2410C'] }
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
            colors={['#0369A1', '#0891B2', '#06B6D4']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={[
              styles.card,
              {
                paddingVertical: 48,
                paddingHorizontal: 24,
                alignItems: 'center',
                borderRadius: 28,
                marginBottom: 20,
                shadowColor: '#000',
                shadowOpacity: 0.15,
                shadowOffset: {width: 0, height: 8},
                shadowRadius: 16,
                elevation: 10,
              },
            ]}>
            {/* Animated Emoji */}
            <Animated.View style={{transform: [{scale: scaleAnim}], marginBottom: 16}}>
              <Text style={{fontSize: 80}}>🌊✨</Text>
            </Animated.View>

            <Text
              style={{
                fontSize: 32,
                fontWeight: '900',
                color: '#fff',
                marginTop: 8,
                textAlign: 'center',
                letterSpacing: 0.5,
              }}>
              Sunday Recharge
            </Text>

            <Text
              style={{
                fontSize: 16,
                color: 'rgba(255,255,255,0.95)',
                marginTop: 12,
                textAlign: 'center',
                maxWidth: 300,
                lineHeight: 24,
                fontWeight: '500',
              }}>
              Time to unwind and recharge your batteries{'\n'}You&apos;ve earned it! 🎉
            </Text>

            <View
              style={{
                marginTop: 28,
                flexDirection: 'row',
                backgroundColor: 'rgba(255,255,255,0.25)',
                paddingHorizontal: 28,
                paddingVertical: 14,
                borderRadius: 40,
                borderWidth: 2,
                borderColor: 'rgba(255,255,255,0.4)',
                alignItems: 'center',
                shadowColor: '#000',
                shadowOpacity: 0.2,
                shadowOffset: {width: 0, height: 4},
                shadowRadius: 8,
                elevation: 5,
              }}>
              <Text style={{fontSize: 16, marginRight: 8}}>☀️</Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '800',
                  color: '#fff',
                  letterSpacing: 1,
                }}>
                REST DAY
              </Text>
            </View>

            <View style={{marginTop: 24, flexDirection: 'row', gap: 16}}>
              <View style={{
                flex: 1,
                backgroundColor: 'rgba(255,255,255,0.15)',
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderRadius: 16,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.2)',
              }}>
                <Text style={{fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '600'}}>No Check-in</Text>
                <Text style={{fontSize: 18, fontWeight: '800', color: '#fff', marginTop: 4}}>Required</Text>
              </View>
              <View style={{
                flex: 1,
                backgroundColor: 'rgba(255,255,255,0.15)',
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderRadius: 16,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.2)',
              }}>
                <Text style={{fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '600'}}>Enjoy Your</Text>
                <Text style={{fontSize: 18, fontWeight: '800', color: '#fff', marginTop: 4}}>Weekend</Text>
              </View>
            </View>
          </LinearGradient>
        ) : (
          <>
            {/* Working Hours Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardTitle}>⏰ Today's Working Hours</Text>
                  <Text style={styles.cardSubtitle}>
                    Track your daily progress
                  </Text>
                </View>

                <View
                  style={[styles.badge, {backgroundColor: getProgressColor()}]}>
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
                  <Text
                    style={{
                      color: 'red',
                      fontSize: 14,
                      marginTop: 6,
                      padding: 20,
                    }}>
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
                  <Text style={[styles.scheduleTime, {color: '#10b981'}]}>
                    {attendanceRecords?.LoginTime
                      ? attendanceRecords.LoginTime.split(' ')?.[1]
                      : '--'}
                  </Text>
                </View>

                <View style={styles.scheduleItem}>
                  <Text style={styles.scheduleLabel}>Check-out</Text>
                  <Text style={[styles.scheduleTime, {color: '#CE5926'}]}>
                    {checkoutTime
                      ? formatTimeWithSeconds(checkoutTime)
                      : '----'}
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}

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
            <View style={[styles.statCard, styles.totalTimeCardSmall]}>
              <Text style={styles.statValue}>
                {calculateTotalBreakMinutes(breakRecords?.breaks)}
              </Text>
              <Text style={styles.statLabel}>Total Time</Text>
            </View>
          </View>

          

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
    backgroundColor: '#f0f4f8',
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },

  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  hiText: {
    fontSize: 28,
    marginRight: 10,
  },

  headerTextGroup: {
    justifyContent: 'center',
  },

  greetingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    opacity: 0.9,
  },

  userNameText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginTop: 2,
  },

  dateText: {
    fontSize: 12,
    color: '#FFFF8F',
    opacity: 0.8,
    marginTop: 2,
  },

  timeBlock: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',

    borderWidth: 1.2,
    borderColor: '#DAA520', // soft white border
  },

  timeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 22,
    marginBottom: 18,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.12,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#e8eef7',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1f2937',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  badge: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 24,
  },
  badgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  hoursDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 18,
  },
  hoursBox: {
    alignItems: 'center',
    flex: 1,
  },
  hoursValue: {
    fontSize: 36,
    fontWeight: '900',
    color: '#CE5926',
    marginBottom: 6,
  },
  targetValue: {
    fontSize: 36,
    fontWeight: '900',
    color: '#cbd5e1',
    marginBottom: 6,
  },
  hoursLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  divider: {
    width: 1.5,
    height: 50,
    backgroundColor: '#e5e7eb',
  },
  progressContainer: {
    marginTop: 12,
  },
  progressBarBackground: {
    width: '100%',
    height: 12,
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: 12,
    borderRadius: 8,
    shadowColor: '#CE5926',
    shadowOpacity: 0.4,
    shadowOffset: {width: 0, height: 2},
  },
  progressText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'right',
    fontWeight: '600',
  },
  scheduleGrid: {
    flexDirection: 'row',
    gap: 14,
  },
  scheduleItem: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e8eef7',
  },
  scheduleLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
    marginBottom: 8,
  },
  scheduleTime: {
    fontSize: 20,
    fontWeight: '800',
  },
  viewDetailsBtn: {
    backgroundColor: '#CE5926',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  viewDetailsText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '700',
  },
  breakStatsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 5,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e8eef7',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1f2937',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
    textAlign: 'center',
  },
  breaksList: {
    marginTop: 14,
  },
  breaksListTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
  },
  breakItem: {
    backgroundColor: '#fef3c7',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 5,
    borderLeftColor: '#f59e0b',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  breakTimeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakTime: {
    fontSize: 14,
    color: '#78350f',
    fontWeight: '600',
  },
  durationBadge: {
    backgroundColor: '#ea580c',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  durationText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCardGradient: {
    flex: 1,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    paddingVertical: Platform.OS === 'ios' ? 0 : 20,
  },
  statCardIcon: {
    fontSize: 32,
    marginBottom: 10,
    marginTop: Platform.OS === 'ios' ? 10 : 0,
  },
  statCardValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 6,
  },
  statCardLabel: {
    fontSize: 12,
    color: '#e2e8f0',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Platform.OS === 'ios' ? 10 : 0,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 18,
    borderWidth: 2,
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  statusDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 14,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 32,
    maxHeight: '90%',
    elevation: 12,
    borderWidth: 1,
    borderColor: '#e8eef7',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1f2937',
  },
  closeIcon: {
    fontSize: 28,
    color: '#9ca3af',
    fontWeight: '700',
  },
  modalSearchRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  modalInput: {
    flex: 1,
    height: 48,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: '#f8fafc',
    fontSize: 14,
    color: '#1f2937',
  },
  datePickerBtn: {
    height: 48,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 150,
  },
  datePickerText: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '600',
  },
  tableTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 14,
    marginTop: 14,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
  },
  tableCellHeader: {
    fontWeight: '800',
    color: '#374151',
  },
  tableCellContent: {
    color: '#6b7280',
  },
  modalCloseBtn: {
    backgroundColor: '#CE5926',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 18,
    elevation: 4,
  },
  modalCloseBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  totalTimeCardSmall: {
    borderLeftColor: '#ef4444',
    borderLeftWidth: 5,
    backgroundColor: '#fff7f7',
    paddingVertical: 18, // thoda sa hi bada
    flex: 1.9, // default shayad 1 hoga, isko thoda zyada de do
  },
});

export default AttendanceDashboard;
