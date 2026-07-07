import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  useColorScheme 
} from 'react-native';
import { Image } from 'expo-image';
import { Colors } from '../constants/Colors';
import { Star, MapPin } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Provider } from '../src/services/catalogService';

interface ProviderCardProps {
  provider: Provider;
}

// Mapeo visual de imágenes realistas según la categoría
const MOCK_IMAGES: Record<string, string> = {
  CATERING: 'https://images.unsplash.com/photo-1555244162-803834f70033?w=500&auto=format&fit=crop&q=60',
  MUSIC: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=60',
  STAFF: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500&auto=format&fit=crop&q=60',
  VENUE: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=500&auto=format&fit=crop&q=60',
  PHOTOGRAPHY: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=500&auto=format&fit=crop&q=60',
  DECORATION: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=500&auto=format&fit=crop&q=60',
};

const CATEGORY_NAMES: Record<string, string> = {
  CATERING: 'Catering y Comida',
  MUSIC: 'Bandas y DJ',
  STAFF: 'Mozos y Personal',
  VENUE: 'Salones y Locaciones',
  PHOTOGRAPHY: 'Foto y Video',
  DECORATION: 'Decoración y Flores',
};

export default function ProviderCard({ provider }: ProviderCardProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  const handlePress = () => {
    router.push(`/provider/${provider.id}`);
  };

  const imageSource = provider.image || MOCK_IMAGES[provider.category] || 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=500&auto=format&fit=crop&q=60';

  return (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: theme.cardBackground, shadowColor: theme.shadow }]}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      <Image
        source={{ uri: imageSource }}
        style={styles.image}
        contentFit="cover"
        transition={300}
      />
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={[styles.category, { color: theme.primary }]}>
            {CATEGORY_NAMES[provider.category] || provider.category}
          </Text>
          <View style={styles.ratingContainer}>
            <Star size={14} color="#FFD700" fill="#FFD700" />
            <Text style={[styles.ratingText, { color: theme.text }]}>
              {provider.rating ? provider.rating.toFixed(1) : 'Nuevo'}
            </Text>
          </View>
        </View>

        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          {provider.name}
        </Text>

        {provider.bio && (
          <Text style={[styles.bio, { color: theme.textSecondary }]} numberOfLines={2}>
            {provider.bio}
          </Text>
        )}

        <View style={styles.footerRow}>
          <View style={styles.locationContainer}>
            <MapPin size={14} color={theme.textSecondary} />
            <Text style={[styles.locationText, { color: theme.textSecondary }]}>
              Buenos Aires, ARG
            </Text>
          </View>
          <View style={styles.priceContainer}>
            <Text style={[styles.priceLabel, { color: theme.textSecondary }]}>
              Desde
            </Text>
            <Text style={[styles.priceValue, { color: theme.primary }]}>
              ${provider.basePrice.toLocaleString('es-AR')}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  image: {
    width: '100%',
    height: 180,
  },
  content: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  category: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  bio: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    paddingTop: 12,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 12,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '900',
  },
});
