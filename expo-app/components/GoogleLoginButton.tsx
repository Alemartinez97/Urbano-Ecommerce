import React from 'react';
import { StyleSheet, Text, View, useColorScheme } from 'react-native';
import { Colors } from '../constants/Colors';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';

interface GoogleLoginButtonProps {
  onPress: () => void;
  isLoading?: boolean;
}

export function GoogleLoginButton({ onPress, isLoading }: GoogleLoginButtonProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const pressed = useSharedValue(false);

  const tap = Gesture.Tap()
    .onBegin(() => {
      pressed.value = true;
    })
    .onFinalize(() => {
      pressed.value = false;
    })
    .onEnd(() => {
      // Usar runOnJS para llamadas a funciones no animadas en el main thread
      // Pero react-native-gesture-handler puede invocar funciones pasadas si no están worletizadas
      // Es más simple manejar el trigger en JS.
    });

  const animatedStyles = useAnimatedStyle(() => {
    return {
      transform: [{ scale: withSpring(pressed.value ? 0.95 : 1) }],
      opacity: withTiming(pressed.value ? 0.8 : 1),
    };
  });

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!isLoading) {
      onPress();
    }
  };

  return (
    <GestureDetector gesture={tap}>
      <Animated.View style={[styles.container, animatedStyles]}>
        <View
          style={[
            styles.button,
            {
              backgroundColor: theme.googleButton,
              borderColor: theme.googleButtonBorder,
            },
          ]}
          onTouchEnd={handlePress}
        >
          {/* El logo de Google en SVG simplificado */}
          <View style={styles.iconContainer}>
            <Text style={styles.googleG}>G</Text>
          </View>
          <Text
            style={[
              styles.text,
              { color: theme.googleButtonText },
            ]}
          >
            {isLoading ? 'Iniciando sesión...' : 'Continuar con Google'}
          </Text>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2, // Para Android
  },
  iconContainer: {
    marginRight: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff', // Fondo blanco para que la G resalte en modo oscuro
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleG: {
    fontWeight: 'bold',
    color: '#4285F4',
    fontSize: 16,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});
