import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

const PremiumLoader = ({ message = "Syncing Data...", visible = true }) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Fade In Overlay
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();

      // Infinite Spin
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2500,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true,
        })
      ).start();

      // Multi-Layer Pulse Sequence
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [visible]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.8],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.6, 0.3, 0],
  });

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      <View style={styles.contentContainer}>
        
        {/* ANIMATED RINGS SYSTEM */}
        <View style={styles.visualStack}>
          {/* PULSING OUTER SONAR */}
          <Animated.View 
            style={[
              styles.pulseRing, 
              { transform: [{ scale: pulseScale }], opacity: pulseOpacity }
            ]} 
          />
          <Animated.View 
            style={[
              styles.pulseRing, 
              { 
                transform: [{ scale: pulseScale }], 
                opacity: pulseOpacity,
                width: 100, height: 100, borderRadius: 50 
              }
            ]} 
          />

          {/* GRADIENT ORBIT INNER */}
          <Animated.View style={[styles.orbit, { transform: [{ rotate: spin }] }]}>
            <LinearGradient
              colors={['#F97316', '#6366F1', 'transparent']}
              style={styles.gradientBorder}
            />
          </Animated.View>

          {/* CENTRAL CORE */}
          <View style={styles.coreCard}>
            <LinearGradient colors={['#FFFFFF', '#F1F5F9']} style={styles.coreGradient}>
              <Icon name="auto-awesome" size={34} color="#F97316" />
            </LinearGradient>
          </View>
        </View>

        {/* TYPOGRAPHY & PROGRESS */}
        <View style={styles.infoArea}>
          <Text style={styles.loaderTitle}>{message}</Text>
          
          <View style={styles.track}>
            <Animated.View 
                style={[
                    styles.shimmer, 
                    { 
                        transform: [
                            { translateX: -60 },
                            { scaleX: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.1, 1] }) },
                            { translateX: 60 }
                        ] 
                    }
                ]} 
            />
          </View>

          <View style={styles.statusBadge}>
            <View style={styles.dot} />
            <Text style={styles.statusText}>ENCRYPTED CHANNEL ACTIVE</Text>
          </View>
        </View>

      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 15, 30, 0.94)', // Deep Space Navy
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  contentContainer: { alignItems: 'center' },
  visualStack: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: 'rgba(249, 115, 22, 0.5)',
  },
  orbit: {
    width: 120,
    height: 120,
    borderRadius: 60,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientBorder: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  coreCard: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF',
    ...Platform.select({
      ios: { shadowColor: '#F97316', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 15 },
      android: { elevation: 12 },
    }),
    overflow: 'hidden',
    padding: 3
  },
  coreGradient: {
    flex: 1,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoArea: {
    marginTop: 40,
    alignItems: 'center',
  },
  loaderTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 3,
    textTransform: 'uppercase',
    textAlign: 'center'
  },
  track: {
    width: 140,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    marginTop: 20,
    overflow: 'hidden',
  },
  shimmer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F97316',
    borderRadius: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 25,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  statusText: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
});

export default PremiumLoader;