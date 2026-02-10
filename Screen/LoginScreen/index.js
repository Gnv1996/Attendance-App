import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Dimensions,
  Image,
} from 'react-native';
import {BASE_URL} from '../../config';
import {useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const {width} = Dimensions.get('window');

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigation = useNavigation();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Load saved credentials
    const loadCredentials = async () => {
      const savedEmail = await AsyncStorage.getItem('savedEmail');
      const savedPassword = await AsyncStorage.getItem('savedPassword');
      if (savedEmail && savedPassword) {
        setEmail(savedEmail);
        setPassword(savedPassword);
      }
    };

    loadCredentials();
  }, []);

  const proceedToMain = async res => {
    const user = res.data.User;
    const role = res.data.Roles[0];
    const token = res.token; // cookie token
    const address = user.address || '';

    const userData = {
      token: token,
      id: user.ID,
      name: user.realname,
      email: user.email,
      mobile: user.mobileno,
      crm_id: user.CrmEmployeeID,
      access_level: user.access_level,
      roleId: role?.RoleID,
      roleName: role?.RoleName,
      address: address,
      themeColor: user.ThemeColor,
      profileImage: user.ProfileImage, // ✅ FIXED
    };

    await AsyncStorage.setItem('userToken', token);
    await AsyncStorage.setItem('userData', JSON.stringify(userData));
    await AsyncStorage.setItem('userAddress', address);

    navigation.navigate('Main');
  };
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);

    const payload = {userName: email, password, client: 'b2b'};

    try {
      const response = await fetch(`${BASE_URL}/Login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      // 🔥 IMPORTANT: always parse response
      if (response.status === 401) {
        Alert.alert('Unauthorized', res?.message || 'Invalid credentials');
        return;
      }

      if (response.status === 400) {
        Alert.alert('Bad Request', res?.message || 'Invalid input');
        return;
      }

      if (response.status >= 500) {
        Alert.alert('Server Error', 'Something went wrong. Please try again.');
        return;
      }
      const res = await response.json();

     

      // ✅ Success
      if (res.success === true) {
        Alert.alert(
          '✅ Login Successful',
          `Welcome, ${
            res?.data?.User?.realname || 'User'
          }!\n\nDo you want to save your credentials?`,
          [
            {
              text: 'No',
              onPress: async () => {
                await AsyncStorage.removeItem('savedEmail');
                await AsyncStorage.removeItem('savedPassword');
                await proceedToMain(res);
              },
              style: 'cancel',
            },
            {
              text: 'Yes, Save',
              onPress: async () => {
                await AsyncStorage.setItem('savedEmail', email);
                await AsyncStorage.setItem('savedPassword', password);
                await proceedToMain(res);
              },
            },
          ],
          {cancelable: false},
        );
      } else {
        Alert.alert(
          'Login Failed',
          res?.message || 'Invalid username or password',
        );
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert(
        'Error',
        'Unable to connect to server. Please try again later.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar backgroundColor="#e89875" barStyle="light-content" />

      {/* Background Design */}
      <View style={styles.backgroundShape1} />
      <View style={styles.backgroundShape2} />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{translateY: slideAnim}],
          },
        ]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../../Src/Assests/logo-itdose.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.welcomeText}>Welcome Back!</Text>
          <Text style={styles.subtitleText}>
            Sign in to continue to Attendance App
          </Text>
        </View>

        {/* Login Form */}
        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="#A0A0A0"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter your password"
                placeholderTextColor="#A0A0A0"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}>
                <Text style={styles.eyeText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.loginButton,
              isLoading && styles.loginButtonDisabled,
            ]}
            onPress={handleLogin}
            disabled={isLoading}>
            <Text style={styles.loginButtonText}>
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Text>
          </TouchableOpacity>

          {/* Demo Credentials */}
          <View style={styles.demoContainer}>
            <Text style={styles.demoTitle}>Demo Credentials:</Text>
            <Text style={styles.demoText}>
              Email: gautam.kumar@itdoseinfo.com
            </Text>
            <Text style={styles.demoText}>Password: admin123</Text>
          </View>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  backgroundShape1: {
    position: 'absolute',
    width: width * 1.5,
    height: 300,
    backgroundColor: '#CE5926',
    borderBottomLeftRadius: width * 0.5,
    borderBottomRightRadius: width * 0.5,
    top: -100,
  },
  backgroundShape2: {
    position: 'absolute',
    width: 200,
    height: 200,
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
    borderRadius: 100,
    bottom: 100,
    right: -50,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  logoText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
  },
  eyeButton: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  eyeText: {
    fontSize: 18,
  },
  loginButton: {
    backgroundColor: '#CE5926',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    elevation: 3,
    shadowColor: '#4A90E2',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  loginButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  demoContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  demoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#92400E',
    marginBottom: 4,
  },
  demoText: {
    fontSize: 13,
    color: '#92400E',
    fontFamily: 'monospace',
  },
  logoImage: {
    width: 70,
    height: 70,
  },
});

export default LoginScreen;
