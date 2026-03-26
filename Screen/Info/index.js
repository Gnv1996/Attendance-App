import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  FlatList,
  TextInput,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import PremiumLoader from '../../Src/Component';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#F97316',
  primaryDark: '#EA580C',
  bg: '#F8FAFC',
  white: '#FFFFFF',
  slate900: '#0F172A',
  slate600: '#475569',
  slate400: '#94A3B8',
  indigo: '#6366F1',
  success: '#10B981',
  border: '#E2E8F0',
  gradient: ['#F97316', '#FB923C'],
};

const CompanyScreen = () => {
  const [loading, setLoading] = useState(false);
  const [employeeList, setEmployeeList] = useState([]);
  const [employeeCount, setEmployeeCount] = useState(null);
  const [activeTab, setActiveTab] = useState('group');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    fetchGroupInfo();
  }, []);

  const fetchData = async (roleId, type) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      setLoading(true);

      const response = await fetch(
        'https://crm.itdoseinfo.com/api/CRMAttendance/EmployeeBind',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            CrmEmployeeID: '8',
            RoleID: roleId,
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        if (type === 'group') {
          setEmployeeList(result.data);
          setEmployeeCount(null);
        } else {
          setEmployeeCount(result.data.length);
          setEmployeeList([]);
        }
      } else {
        Alert.alert('Error', 'Data not found');
      }
    } catch (error) {
      console.log(error);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupInfo = () => {
    setActiveTab('group');
    setSearchText('');
    fetchData('2', 'group');
  };

  const fetchCompanyInfo = () => {
    setActiveTab('company');
    fetchData('3', 'company');
  };

  const filteredList = useMemo(() => {
    return employeeList.filter(item =>
      item.EmployeeName.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [searchText, employeeList]);

  const renderEmployeeCard = ({ item, index }) => (
    <TouchableOpacity style={styles.card} activeOpacity={0.9}>
      <View style={styles.cardLeft}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {item.EmployeeName.charAt(0).toUpperCase()}
          </Text>
          <View style={styles.onlineBadge} />
        </View>
        <View style={styles.infoGroup}>
          <Text style={styles.employeeName}>{item.EmployeeName}</Text>
          <Text style={styles.employeeId}>Employee ID: {item.Employee_ID}</Text>
        </View>
      </View>
      <View style={styles.cardRight}>
        <Icon name="chevron-right" size={20} color={COLORS.slate400} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <PremiumLoader visible={loading} message="Fetching Employees..." />
      
      {/* PREMIUM HEADER */}
      <LinearGradient colors={COLORS.gradient} style={styles.header}>
        <SafeAreaView>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerSubtitle}>Directory</Text>
              <Text style={styles.headerTitle}>Team Member</Text>
            </View>
            <TouchableOpacity style={styles.filterBtn}>
              <Icon name="tune" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View style={styles.content}>
        {/* SEGMENTED TAB SELECTOR */}
        <View style={styles.tabWrapper}>
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'group' && styles.activeTab]}
              onPress={fetchGroupInfo}
            >
              <Text style={[styles.tabText, activeTab === 'group' && styles.activeTabText]}>
                Group Members
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'company' && styles.activeTab]}
              onPress={fetchCompanyInfo}
            >
              <Text style={[styles.tabText, activeTab === 'company' && styles.activeTabText]}>
                Company Summary
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loaderText}>Syncing directory...</Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            {activeTab === 'group' ? (
              <View style={{ flex: 1 }}>
                {/* MODERN SEARCH BAR */}
                <View style={styles.searchBox}>
                  <Icon name="search" size={20} color={COLORS.slate400} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search by name..."
                    placeholderTextColor={COLORS.slate400}
                    value={searchText}
                    onChangeText={setSearchText}
                  />
                  {searchText.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchText('')}>
                      <Icon name="cancel" size={18} color={COLORS.slate400} />
                    </TouchableOpacity>
                  )}
                </View>

                <FlatList
                  data={filteredList}
                  keyExtractor={(item) => item.Employee_ID.toString()}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.listContainer}
                  renderItem={renderEmployeeCard}
                  ListHeaderComponent={() => (
                    <Text style={styles.resultsLabel}>
                      Showing {filteredList.length} colleagues
                    </Text>
                  )}
                  ListEmptyComponent={
                    <View style={styles.emptyState}>
                      <Icon name="person-search" size={60} color={COLORS.slate400} opacity={0.3} />
                      <Text style={styles.emptyTitle}>No Colleagues Found</Text>
                      <Text style={styles.emptySub}>Try a different search term</Text>
                    </View>
                  }
                />
              </View>
            ) : (
              /* COMPANY SUMMARY UI */
              <View style={styles.summaryContainer}>
                <LinearGradient 
                  colors={['#6366F1', '#4F46E5']} 
                  start={{x:0, y:0}} end={{x:1, y:0}}
                  style={styles.statsCard}
                >
                  <View style={styles.statsRow}>
                    <View>
                      <Text style={styles.statsNum}>{employeeCount || 0}</Text>
                      <Text style={styles.statsLabel}>Total Workforce</Text>
                    </View>
                    <View style={styles.statsIconBox}>
                      <Icon name="groups" size={40} color="rgba(255,255,255,0.4)" />
                    </View>
                  </View>
                  <View style={styles.statsProgressTrack}>
                    <View style={styles.statsProgressFill} />
                  </View>
                  <Text style={styles.statsFooterText}>+2% increase from last month</Text>
                </LinearGradient>

                <View style={styles.infoGrid}>
                  <View style={styles.gridCard}>
                    <View style={[styles.gridIcon, { backgroundColor: COLORS.success + '15' }]}>
                      <Icon name="verified-user" size={24} color={COLORS.success} />
                    </View>
                    <Text style={styles.gridVal}>{Math.round(employeeCount * 0.85)}</Text>
                    <Text style={styles.gridLab}>On-Duty</Text>
                  </View>
                  <View style={styles.gridCard}>
                    <View style={[styles.gridIcon, { backgroundColor: COLORS.primary + '15' }]}>
                      <Icon name="event-busy" size={24} color={COLORS.primary} />
                    </View>
                    <Text style={styles.gridVal}>{Math.round(employeeCount * 0.15)}</Text>
                    <Text style={styles.gridLab}>On-Leave</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingBottom: 40,
    paddingHorizontal: 25,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 10 : 25,
  },
  headerSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },
  headerTitle: { color: '#FFF', fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  filterBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },

  content: { flex: 1, marginTop: -25 },
  tabWrapper: { paddingHorizontal: 25, marginBottom: 20 },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 6,
    borderRadius: 18,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
      android: { elevation: 3 }
    })
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 14 },
  activeTab: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 13, fontWeight: '700', color: COLORS.slate600 },
  activeTabText: { color: '#FFF' },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 25,
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingHorizontal: 15,
    height: 52,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 15,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: COLORS.slate900, fontWeight: '500' },

  listContainer: { paddingHorizontal: 25, paddingBottom: 40 },
  resultsLabel: { fontSize: 12, fontWeight: '800', color: COLORS.slate400, marginBottom: 15, textTransform: 'uppercase', letterSpacing: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center' },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: COLORS.primary, fontSize: 18, fontWeight: '800' },
  onlineBadge: { position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: 7, backgroundColor: COLORS.success, borderWidth: 3, borderColor: '#FFF' },
  infoGroup: { marginLeft: 15 },
  employeeName: { fontSize: 16, fontWeight: '700', color: COLORS.slate900 },
  employeeId: { fontSize: 12, color: COLORS.slate400, marginTop: 2, fontWeight: '600' },

  summaryContainer: { paddingHorizontal: 25, flex: 1 },
  statsCard: { padding: 25, borderRadius: 28, marginBottom: 20 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statsNum: { fontSize: 36, fontWeight: '800', color: '#FFF' },
  statsLabel: { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  statsProgressTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, marginVertical: 20 },
  statsProgressFill: { width: '70%', height: '100%', backgroundColor: '#FFF', borderRadius: 3 },
  statsFooterText: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700' },

  infoGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  gridCard: { width: '48%', backgroundColor: '#FFF', padding: 20, borderRadius: 24, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  gridIcon: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  gridVal: { fontSize: 24, fontWeight: '800', color: COLORS.slate900 },
  gridLab: { fontSize: 12, color: COLORS.slate400, fontWeight: '700', marginTop: 4 },

  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderText: { marginTop: 15, color: COLORS.slate600, fontWeight: '600' },
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: COLORS.slate900, marginTop: 15 },
  emptySub: { fontSize: 14, color: COLORS.slate400, marginTop: 5 }
});

export default CompanyScreen;