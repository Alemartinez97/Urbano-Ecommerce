import React from 'react';
import { View, TextInput, StyleSheet, useColorScheme } from 'react-native';
import { Search } from 'lucide-react-native';
import { Colors } from '../constants/Colors';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export default function SearchBar({ value, onChangeText, placeholder }: SearchBarProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;

  return (
    <View style={[styles.container, { backgroundColor: theme.cardBackground, shadowColor: theme.shadow }]}>
      <Search size={20} color={theme.textSecondary} style={styles.icon} />
      <TextInput
        placeholder={placeholder || "¿Qué servicio necesitas?"}
        placeholderTextColor={theme.textSecondary}
        value={value}
        onChangeText={onChangeText}
        style={[styles.input, { color: theme.text }]}
        clearButtonMode="while-editing"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 60,
    borderRadius: 18,
    marginHorizontal: 15,
    marginTop: 15,
    elevation: 3,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
});
