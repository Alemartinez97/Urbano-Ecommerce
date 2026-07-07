import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  useColorScheme, 
  Dimensions, 
  TouchableOpacity,
  SafeAreaView
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../constants/Colors';
import { useGoogleAuth } from '../hooks/useGoogleAuth';
import Animated, { 
  FadeInDown, 
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';


const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const { signIn, isLoading } = useGoogleAuth();
  const router = useRouter();

  // Animación para el botón
  const scale = useSharedValue(1);
  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  const handleLogin = async () => {
    scale.value = withSequence(withTiming(0.95), withSpring(1));
    const result = await signIn();
    if (result.success) {
      router.replace('/(tabs)/home');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style="light" />
      
      <LinearGradient
        colors={[theme.primary, theme.primaryDark || '#0087C1']}
        style={styles.header}
      >
        <SafeAreaView style={styles.headerContent}>
          <Animated.View entering={FadeInUp.delay(200).duration(1000)}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoBadgeText}>E</Text>
            </View>
            <Text style={styles.logoText}>EventGo</Text>
            <Text style={styles.subtitleText}>Servicios premium para tus eventos</Text>
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>

      <View style={styles.content}>
        <Animated.View 
          entering={FadeInDown.delay(500).duration(1000).springify()}
          style={[styles.card, { backgroundColor: theme.cardBackground, shadowColor: theme.shadow }]}
        >
          <Text style={[styles.welcomeTitle, { color: theme.text }]}>¡Bienvenido!</Text>
          <Text style={[styles.welcomeSubtitle, { color: theme.textSecondary }]}>
            Conecta con los mejores profesionales para tu próximo evento en segundos.
          </Text>

          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Animated.View style={[
              styles.googleButton, 
              { backgroundColor: theme.primary },
              animatedButtonStyle
            ]}>
              <View style={styles.googleIconCircle}>
                <Text style={styles.googleG}>G</Text>
              </View>
              <Text style={styles.googleButtonText}>
                {isLoading ? 'Iniciando...' : 'Ingresar con Google'}
              </Text>
            </Animated.View>
          </TouchableOpacity>

          <Text style={[styles.footerText, { color: theme.textSecondary }]}>
            Al ingresar, aceptas nuestros Términos y Condiciones
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: height * 0.5,
    borderBottomLeftRadius: 60,
    borderBottomRightRadius: 60,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadge: {
    width: 80,
    height: 80,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    alignSelf: 'center'
  },
  logoBadgeText: {
    fontSize: 40,
    fontWeight: '900',
    color: '#FFF',
  },
  logoText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: -1,
    textAlign: 'center'
  },
  subtitleText: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginTop: 10,
    fontWeight: '500'
  },
  content: {
    flex: 1,
    paddingHorizontal: 25,
    marginTop: -80,
  },
  card: {
    borderRadius: 35,
    padding: 35,
    elevation: 10,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 10,
  },
  welcomeSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 30,
    borderRadius: 20,
    width: width - 120,
    justifyContent: 'center',
  },
  googleIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  googleG: {
    color: '#4285F4',
    fontWeight: '900',
    fontSize: 18,
  },
  googleButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  footerText: {
    fontSize: 12,
    marginTop: 30,
    textAlign: 'center',
  },
});
