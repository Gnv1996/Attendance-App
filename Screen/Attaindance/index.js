import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Animated,
  Alert,ActivityIndicator
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import moment from 'moment';
import { BASE_URL } from '../../config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import PremiumLoader from '../../Src/Component';

const { width } = Dimensions.get('window');

const LeaveSummaryHeader = ({ leaves }) => {
  return (
    <LinearGradient
      colors={['#F97316', '#EA580C', '#C2410C']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.summaryContainer}
    >
      {leaves.map((item, index) => (
        <View key={index} style={styles.summaryCard}>
          <View style={styles.summaryCardInner}>
            <Text style={styles.summaryCount}>{item.Available}</Text>
            <Text style={styles.summaryType}>{item.LeaveType}</Text>
          </View>
        </View>
      ))}
    </LinearGradient>
  );
};

const AttendanceScreen = () => {
  const [selectedMonth, setSelectedMonth] = useState(moment());
  const [attendanceData, setAttendanceData] = useState({});
  const [fadeAnim] = useState(new Animated.Value(0));
  const [userData, setUserData] = useState(null);
  const [leaveSummary, setLeaveSummary] = useState([]);
  const[loading,setLoading]=useState(false)

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


  const fetchAttendanceRecord = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
  
      if (!token) return;
  
      const formData = new FormData();
      // formData.append('ID', userData.id);
      // formData.append('LoginName', userData.name);
      // formData.append('CrmEmpID', userData.crm_id);
      // formData.append('Month', selectedMonth.month() + 1);
      // formData.append('Year', selectedMonth.year());
      const payload = {
        CrmEmpID: userData.crm_id, // 525 jaise value
        Year: selectedMonth.year(), // 2025
        Month: selectedMonth.month() + 1 // 11 (Nov)
      };
      const response = await fetch(
        `${BASE_URL}/CRMAttendance/LeaveRequest_BindCalender`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            // Authorization: `Bearer ${token}` // agar nahi bhejna to comment karo
          },
          body: JSON.stringify(payload)

        }
      );

      // console.warn(payload,"See the payload")
    
    
  
      if (response.status === 401) return;
  
      const result = await response.json();
      // console.warn(result,"see the Attaindace app record")
      if (result.success && result.data) {
        // 0 → Leave summary
        const leaveSummary = result.data[0] || [];

        const filteredLeaves = leaveSummary.filter(item =>
          ['CL', 'SL', 'OL', 'WO'].includes(item.LeaveType)
        );
        
        setLeaveSummary(filteredLeaves);
      
        // 1 → Day-wise attendance
        const dayRecords = result.data[1] || [];
    

      
        const parsedAttendance = {};
        dayRecords.forEach((entry) => {
          const isApproved = entry.IsApproved === 1;
          const day = entry.Day;
          const date = moment(
            `${selectedMonth.year()}-${selectedMonth.month() + 1}-${day}`,
            'YYYY-M-D'
          ).format('YYYY-MM-DD');
      
          const hasLeave = entry.HasLeave?.toString()?.toUpperCase();
          let existing = parsedAttendance[date] || {};
      
          if (['CL', 'SL', 'EL', 'PL','RT'].includes(entry.Holiday)) {
            parsedAttendance[date] = {
              ...existing,
              status: entry.Holiday,
              holidayName: entry.Holiday,
              leaveDescription: entry.LeaveDescription || "",
              isApproved,
            };
          } else if (entry.Holiday === 'OL' || hasLeave === 'OL') {
            parsedAttendance[date] = {
              ...existing,
              status: 'OL',
              holidayName: 'Optional Leave',
            };
          } else if (hasLeave === '2') {
            const html = entry.Holiday || '';
            if (html.startsWith('Login:')) {
              const inTime = html.match(/Login:([\d: ]+[APM]+)/)?.[1]?.trim() || null;
              const outTime = html.match(/Logout:([\d: ]+[APM]+)/)?.[1]?.trim() || null;
              const workHourMatch = html.match(/Work Hour:.*?([\d:]+)/);
              const workHours = workHourMatch ? `${workHourMatch[1]}h` : null;
      
              parsedAttendance[date] = {
                ...existing,
                status: 'present',
                inTime,
                outTime,
                workHours,
                isApproved,
              };
            }
          } else if (entry.Holiday && !entry.Holiday.startsWith("Login:")) {
            parsedAttendance[date] = {
              ...existing,
              status: 'holiday',
              holidayName: entry.Holiday,
            };
          }
        });
      
        setAttendanceData(parsedAttendance);
      }
    } catch (error) {
      console.error('❌ API Error:', error);
      Alert.alert('Error', 'Something went wrong while fetching attendance.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (!userData) return;
    fetchAttendanceRecord();
  }, [userData, selectedMonth]);
  

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [selectedMonth]);

  const getDaysInMonth = () => {
    const start = selectedMonth.clone().startOf("month");
    const end = selectedMonth.clone().endOf("month");
    const days = [];
  
    for (let i = 1; i <= end.date(); i++) {
      const date = start.clone().add(i - 1, "days");
      const key = date.format("YYYY-MM-DD");
      const weekday = date.format("dddd");
  
      let status = "notMarked";
      let holiday = "";
      let leaveDescription = "";
      let inTime = null;
      let outTime = null;
      let workHours = null;
      let isApproved = false;   // ✅ important
  
      if (weekday === "Sunday") {
        status = "sunday";
      }
  
      if (attendanceData[key]) {
        const item = attendanceData[key];
  
        isApproved = item.isApproved || false;   // ✅ approved pass ho raha
  
        holiday = item.holidayName || "";
        leaveDescription = item.leaveDescription || "";
  
        if (holiday.startsWith("Login:")) {
          status = "present";
          inTime = holiday.match(/Login:([\d: ]+[APM]+)/)?.[1]?.trim() || null;
          outTime = holiday.match(/Logout:([\d: ]+[APM]+)/)?.[1]?.trim() || null;
          const workHourMatch = holiday.match(/Work Hour:.*?([\d:]+)/);
          workHours = workHourMatch ? `${workHourMatch[1]}h` : null;
        } else {
          status = item.status || status;
          inTime = item.inTime || null;
          outTime = item.outTime || null;
          workHours = item.workHours || null;
        }
      }
  
      days.push({
        date,
        key,
        weekday,
        status,
        holiday,
        leaveDescription,
        inTime,
        outTime,
        workHours,
        isApproved,   // ✅ UI tak jaa raha
      });
    }
  
    return days;
  };
  
  
  
  

  const getStatusConfig = (status) => {
    const configs = {
      CL: {
        icon: 'beach', // or any relevant icon
        color: '#2563eb', // blue
        bgColor: '#eff6ff',
        borderColor: '#93c5fd',
        label: 'Casual Leave',
        textColor: '#1e3a8a',
      },
      SL: {
        icon: 'medical-bag',
        color: '#dc2626', // red
        bgColor: '#fee2e2',
        borderColor: '#fecaca',
        label: 'Sick Leave',
        textColor: '#7f1d1d',
      },
      OL: {
        icon: 'party-popper',
        color: '#d97706', // orange
        bgColor: '#fff7ed',
        borderColor: '#fed7aa',
        label: 'Optional Leave',
        textColor: '#92400e',
      },
      RT: {
        icon: 'calendar-star',
        color: '#0ea5e9', // sky blue
        bgColor: '#f0f9ff',
        borderColor: '#bae6fd',
        label: 'Restricted Holiday',
        textColor: '#075985',
      },
      present: {
        icon: 'check-circle',
        color: '#10b981',
        bgColor: '#ecfdf5',
        borderColor: '#a7f3d0',
        label: 'Present',
        textColor: '#065f46',
      },
      absent: {
        icon: 'close-circle',
        color: '#ef4444',
        bgColor: '#fef2f2',
        borderColor: '#fecaca',
        label: 'Absent',
        textColor: '#991b1b',
      },
      late: {
        icon: 'clock-alert',
        color: '#f59e0b',
        bgColor: '#fffbeb',
        borderColor: '#fed7aa',
        label: 'Late Arrival',
        textColor: '#92400e',
      },
      halfDay: {
        icon: 'clock-outline',
        color: '#8b5cf6',
        bgColor: '#f5f3ff',
        borderColor: '#c4b5fd',
        label: 'Half Day',
        textColor: '#5b21b6',
      },
      holiday: {
        icon: 'party-popper',
        color: '#ec4899',
        bgColor: '#fdf2f8',
        borderColor: '#f9a8d4',
        label: 'Holiday',
        textColor: '#be185d',
      },
      sunday: {
        icon: 'weather-sunny',
        color: '#f59e0b',
        bgColor: '#fffbeb',
        borderColor: '#fed7aa',
        label: 'Sunday',
        textColor: '#92400e',
      },
      weekend: {
        icon: 'calendar-weekend',
        color: '#6366f1',
        bgColor: '#eef2ff',
        borderColor: '#c7d2fe',
        label: 'Weekend',
        textColor: '#3730a3',
      },
      notMarked: {
        icon: 'help-circle',
        color: '#6b7280',
        bgColor: '#f9fafb',
        borderColor: '#e5e7eb',
        label: 'Not Marked',
        textColor: '#374151',
      },
      GZ: {
        icon: 'flag',
        color: '#f43f5e',
        bgColor: '#fef2f2',
        borderColor: '#fecaca',
        label: 'Gazetted Holiday',
        textColor: '#7f1d1d',
      },
      
    };
    return configs[status] || configs.notMarked;
  };

  const goPrevMonth = () => setSelectedMonth(prev => prev.clone().subtract(1, 'month'));
  const goNextMonth = () => setSelectedMonth(prev => prev.clone().add(1, 'month'));

  return (
    <View style={{ flex: 1, backgroundColor: '#f0f4f8' }}>
      <StatusBar backgroundColor="#EA580C" barStyle="light-content" />
      <PremiumLoader visible={loading} message="Fetching Employees..." />
      <LeaveSummaryHeader leaves={leaveSummary} />
      <LinearGradient
  colors={['#F97316', '#EA580C', '#C2410C']}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 0 }}
  style={{ 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingTop: 16, 
    paddingBottom: 24, 
    borderBottomLeftRadius: 30, 
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 10
  }}
>
  
  <TouchableOpacity onPress={goPrevMonth} style={{ padding: 8 }}>
    <MaterialCommunityIcons name="chevron-left" size={28} color="white" />
  </TouchableOpacity>

  <View style={{ alignItems: 'center' }}>
    <TouchableOpacity onPress={() => fetchAttendanceRecord()}>
      <Text style={{ fontSize: 22, fontWeight: '800', color: 'white', letterSpacing: 0.5 }}>
        {selectedMonth.format('MMMM YYYY')}
      </Text>
    </TouchableOpacity>

    <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 4 }}>
      Attendance Overview
    </Text>
  </View>

  <TouchableOpacity onPress={goNextMonth} style={{ padding: 8 }}>
    <MaterialCommunityIcons name="chevron-right" size={28} color="white" />
  </TouchableOpacity>

</LinearGradient>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>




        
        {getDaysInMonth().map((day) => {
          const config = getStatusConfig(day.status);
          const isToday = day.date.isSame(moment(), 'day');
          let isApproved = false;


          return (
            <Animated.View
            key={day.key}
            style={{
              marginHorizontal: 16,
              marginVertical: 6,
              padding: 16,
              borderRadius: 16,
          
              // ✅ Dark green background
              backgroundColor: day.isApproved 
                ? '#66CDAA'   // dark green
                : config.bgColor,
          
              // ✅ Dark green border
              borderColor: day.isApproved
                ? '#166534'
                : isToday
                  ? config.color
                  : config.borderColor,
          
              borderWidth: isToday ? 2 : 1,
          
              shadowColor: day.isApproved ? '#166534' : config.color,
              shadowOpacity: 0.3,
              shadowOffset: { width: 0, height: 4 },
              shadowRadius: 10,
          
              transform: [{ scale: fadeAnim }],
              opacity: fadeAnim,
            }}
          >
          
          
              <View style={{ alignSelf: 'flex-start', backgroundColor: config.color, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 8 }}>
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 12 }}>{config.label.toUpperCase()}</Text>
              </View>

              {isToday && (
                <View style={{ position: 'absolute', top: -8, right: 16, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, backgroundColor: config.color }}>
                  <Text style={{ color: 'white', fontSize: 10, fontWeight: '700' }}>TODAY</Text>
                </View>
              )}

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                <View>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: config.textColor }}>{day.date.format('D')}</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: config.textColor }}>{day.date.format('ddd')}</Text>
                </View>
                <View style={{ backgroundColor: config.color, borderRadius: 24, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
                  <MaterialCommunityIcons name={config.icon} size={26} color="white" />
                </View>
              </View>
              {day.isApproved && day.leaveDescription ? (
  <View style={{
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: day.isApproved ? 'rgba(255,255,255,0.15)' : '#f3f4f6'
  }}>
    <Text style={{
      color: day.isApproved ? '#000' : '#065f46',
      fontWeight: '700'
    }}>
      Approved :
      <Text style={{ fontWeight: '400' }}>
        {" "}{day.leaveDescription}
      </Text>
    </Text>
  </View>
) : null}


              {(day.inTime || day.outTime) && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <View style={{ backgroundColor: '#d1fae5', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 }}>
                    <MaterialCommunityIcons name="login" size={16} color="#059669" />
                    <Text style={{ fontWeight: '600', marginLeft: 6, color: '#065f46' }}>In: {day.inTime || '--'}</Text>
                  </View>
                  <View style={{ backgroundColor: '#fee2e2', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 }}>
                    <MaterialCommunityIcons name="logout" size={16} color="#b91c1c" />
                    <Text style={{ fontWeight: '600', marginLeft: 6, color: '#7f1d1d' }}>Out: {day.outTime || '--'}</Text>
                  </View>
                </View>
              )}

              {day.workHours && (
                <View style={{ backgroundColor: '#f3f4f6', borderRadius: 12, paddingVertical: 6, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', alignSelf: 'center', marginTop: 6 }}>
                  <MaterialCommunityIcons name="clock-time-four" size={16} color="#6b7280" />
                  <Text style={{ marginLeft: 6, fontWeight: '600', fontSize: 13, color: '#374151' }}>Total: {day.workHours}</Text>
                </View>
              )}
            </Animated.View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#0f766e',
    borderBottomWidth: 0,
  },
  summaryCard: {
    alignItems: 'center',
    padding: 12,
    flex: 1,
    marginHorizontal: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  summaryCardInner: {
    alignItems: 'center',
  },
  summaryType: {
    fontWeight: '700',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 8,
    letterSpacing: 0.3,
  },
  summaryCount: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
});

export default AttendanceScreen;