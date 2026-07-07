import React from 'react';
import { 
  ScrollView, 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  useColorScheme 
} from 'react-native';
import { Colors } from '../constants/Colors';
import { 
  Utensils, 
  Music, 
  Users, 
  Building, 
  Camera, 
  Sparkles,
  LayoutGrid
} from 'lucide-react-native';

// Las categorías del backend EventGo
export const CATEGORIES = [
  { id: 'ALL', name: 'Todos', icon: LayoutGrid },
  { id: 'CATERING', name: 'Catering', icon: Utensils },
  { id: 'MUSIC', name: 'Música', icon: Music },
  { id: 'STAFF', name: 'Personal', icon: Users },
  { id: 'VENUE', name: 'Salón', icon: Building },
  { id: 'PHOTOGRAPHY', name: 'Fotografía', icon: Camera },
  { id: 'DECORATION', name: 'Decoración', icon: Sparkles },
];

interface CategoryListProps {
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
}

export default function CategoryList({ 
  selectedCategory, 
  onSelectCategory 
}: CategoryListProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {CATEGORIES.map((category) => {
        const isSelected = selectedCategory === category.id;
        const IconComponent = category.icon;

        return (
          <TouchableOpacity
            key={category.id}
            onPress={() => onSelectCategory(category.id)}
            style={[
              styles.pill,
              { 
                backgroundColor: isSelected ? theme.primary : theme.cardBackground,
                borderColor: isSelected ? theme.primary : theme.border,
              }
            ]}
            activeOpacity={0.7}
          >
            <IconComponent 
              size={18} 
              color={isSelected ? '#FFFFFF' : theme.textSecondary} 
              style={styles.icon}
            />
            <Text 
              style={[
                styles.label,
                { 
                  color: isSelected ? '#FFFFFF' : theme.text,
                  fontWeight: isSelected ? '700' : '500'
                }
              ]}
            >
              {category.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    gap: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  icon: {
    marginRight: 6,
  },
  label: {
    fontSize: 14,
  },
});
