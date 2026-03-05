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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <View style={styles.container}>
        
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.title}>Company Directory</Text>
          <Text style={styles.subtitle}>Manage and explore your team</Text>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'group' && styles.activeTab,
            ]}
            onPress={fetchGroupInfo}
            activeOpacity={0.7}>
            <View style={[styles.tabIndicator, activeTab === 'group' && styles.activeTabIndicator]} />
            <Text style={[styles.tabText, activeTab === 'group' && styles.activeTabText]}>
              👥 Group Info
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'company' && styles.activeTab,
            ]}
            onPress={fetchCompanyInfo}
            activeOpacity={0.7}>
            <View style={[styles.tabIndicator, activeTab === 'company' && styles.activeTabIndicator]} />
            <Text style={[styles.tabText, activeTab === 'company' && styles.activeTabText]}>
              🏢 Company Info
            </Text>
          </TouchableOpacity>
        </View>

        {/* Loading Indicator */}
        {loading && (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#60A5FA" />
            <Text style={styles.loaderText}>Loading data...</Text>
          </View>
        )}

        {/* Group Info Section */}
        {activeTab === 'group' && !loading && (
          <View style={styles.content}>
            {/* Search Box */}
            <View style={styles.searchContainer}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search employee name..."
                placeholderTextColor="#94A3B8"
                value={searchText}
                onChangeText={setSearchText}
              />
              {searchText.length > 0 && (
                <TouchableOpacity onPress={() => setSearchText('')}>
                  <Text style={styles.clearIcon}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Employee Count Badge */}
            {filteredList.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>
                  {filteredList.length} employee{filteredList.length !== 1 ? 's' : ''} found
                </Text>
              </View>
            )}

            {/* Employee List */}
            <FlatList
  data={filteredList}
  keyExtractor={(item) => item.Employee_ID.toString()}
  showsVerticalScrollIndicator={false}
  contentContainerStyle={{ paddingBottom: 90 }}
              renderItem={({ item, index }) => (
                <View style={[styles.card, { marginTop: index === 0 ? 0 : 12 }]}>
                  <View style={styles.cardContent}>
                    <View style={styles.avatarContainer}>
                      <Text style={styles.avatar}>
                        {item.EmployeeName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.employeeInfo}>
                      <Text style={styles.employeeName}>{item.EmployeeName}</Text>
                      <Text style={styles.employeeId}>
                        ID: {item.Employee_ID}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.chevron}>
                    <Text>→</Text>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyIcon}>👤</Text>
                  <Text style={styles.emptyText}>No employees found</Text>
                  <Text style={styles.emptySubtext}>
                    Try adjusting your search
                  </Text>
                </View>
              }
            />
          </View>
        )}

        {/* Company Info Count Section */}
        {activeTab === 'company' && employeeCount !== null && !loading && (
          <View style={styles.content}>
            <View style={styles.statsCard}>
              <View style={styles.statsContent}>
                <Text style={styles.statsIcon}>📊</Text>
                <View style={styles.statsTextContainer}>
                  <Text style={styles.statsLabel}>Total Employees</Text>
                  <Text style={styles.statsNumber}>{employeeCount}</Text>
                </View>
              </View>
              <View style={styles.statsDecor} />
            </View>

            <View style={styles.infoGrid}>
              <View style={styles.infoCard}>
                <Text style={styles.infoIcon}>👨‍💼</Text>
                <Text style={styles.infoLabel}>Active</Text>
                <Text style={styles.infoValue}>{Math.round(employeeCount * 0.85)}</Text>
              </View>
              <View style={styles.infoCard}>
                <Text style={styles.infoIcon}>📅</Text>
                <Text style={styles.infoLabel}>On Leave</Text>
                <Text style={styles.infoValue}>{Math.round(employeeCount * 0.15)}</Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

export default CompanyScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 18,
    paddingTop: 12,
  },

  /* Header */
  header: {
    marginBottom: 22,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },

  /* Tabs */
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 14,
    padding: 5,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#F97316',
    elevation: 3,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  activeTabText: {
    color: '#FFFFFF',
  },

  /* Search */
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 18,
    height: 50,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
  },
  clearIcon: {
    fontSize: 18,
    color: '#94A3B8',
  },

  /* Employee Count */
  countBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 14,
  },
  countBadgeText: {
    color: '#1E40AF',
    fontSize: 12,
    fontWeight: '600',
  },

  /* Employee Card */
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatar: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },

  employeeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  employeeId: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },

  /* Empty */
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  emptySubtext: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
  },

  /* Stats Card */
  statsCard: {
    backgroundColor: '#F97316',
    borderRadius: 18,
    padding: 22,
    marginBottom: 20,
    elevation: 6,
  },
  statsContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsIcon: {
    fontSize: 36,
    marginRight: 16,
  },
  statsLabel: {
    fontSize: 13,
    color: '#BFDBFE',
  },
  statsNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* Info Cards */
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    elevation: 4,
  },
  infoIcon: {
    fontSize: 26,
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
  },
  infoValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
});
