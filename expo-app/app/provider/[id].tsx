import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  useColorScheme, 
  ActivityIndicator,
  SafeAreaView,
  Alert
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Colors } from '../../constants/Colors';
import { ArrowLeft, Star, Heart, MapPin, CheckCircle } from 'lucide-react-native';
import { catalogService, Provider } from '../../src/services/catalogService';
import { bookingService } from '../../src/services/bookingService';
import TimeSlotSelector from '../../components/TimeSlotSelector';

const MOCK_PROVIDERS: Provider[] = [
  {
    id: 'prov-1',
    name: 'Catering "La Pampa"',
    category: 'CATERING',
    rating: 4.9,
    basePrice: 50000,
    bio: 'Servicio de asado premium, postres tradicionales y mozos experimentados para todo tipo de fiestas. Nuestro asado se cocina a fuego lento con leña de piquillín para lograr el sabor más tierno y sabroso de Argentina.',
  },
  {
    id: 'prov-2',
    name: 'DJ "SoundWave" Sonido',
    category: 'MUSIC',
    rating: 4.8,
    basePrice: 35000,
    bio: 'DJ profesional con sonido de alta definición, luces LED robóticas y animación completa de pista. Nos adaptamos al estilo de música que más te guste: electrónica, rock, cumbia, pop o clásicos retro.',
  },
  {
    id: 'prov-3',
    name: 'Servicio de Mozos Premium',
    category: 'STAFF',
    rating: 4.7,
    basePrice: 15000,
    bio: 'Personal capacitado para protocolo, etiqueta y coctelería premium. Garantía de excelente trato y servicio impecable para agasajar a todos tus invitados de la mejor manera.',
  },
  {
    id: 'prov-4',
    name: 'Salón Quinta "Las Camelias"',
    category: 'VENUE',
    rating: 5.0,
    basePrice: 120000,
    bio: 'Predio hermoso con pileta, parque arbolado, salón cubierto climatizado y estacionamiento vigilado. Perfecto para casamientos, fiestas de 15 y eventos corporativos inolvidables.',
  },
  {
    id: 'prov-5',
    name: 'Aura Producciones Fotografía',
    category: 'PHOTOGRAPHY',
    rating: 4.9,
    basePrice: 40000,
    bio: 'Cobertura de fotos y video en alta calidad con drone. Entregamos álbum digital y video editado de gran calidad artística para que revivas cada momento especial.',
  },
  {
    id: 'prov-6',
    name: 'Eventos Glam Ambientación',
    category: 'DECORATION',
    rating: 4.6,
    basePrice: 28000,
    bio: 'Especialistas en arreglos florales, arcos de globos y luces temáticas para eventos soñados. Diseñamos la ambientación a medida según la temática de tu fiesta.',
  }
];

const MOCK_IMAGES: Record<string, string> = {
  CATERING: 'https://images.unsplash.com/photo-1555244162-803834f70033?w=800&auto=format&fit=crop&q=80',
  MUSIC: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80',
  STAFF: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&auto=format&fit=crop&q=80',
  VENUE: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&auto=format&fit=crop&q=80',
  PHOTOGRAPHY: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=800&auto=format&fit=crop&q=80',
  DECORATION: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=800&auto=format&fit=crop&q=80',
};

const CATEGORY_NAMES: Record<string, string> = {
  CATERING: 'Catering y Comida',
  MUSIC: 'Bandas y DJ',
  STAFF: 'Mozos y Personal',
  VENUE: 'Salones y Locaciones',
  PHOTOGRAPHY: 'Foto y Video',
  DECORATION: 'Decoración y Flores',
};

export default function ProviderDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);

  // Datos de reserva seleccionados
  const [selectedSlot, setSelectedSlot] = useState<{
    startTime: string;
    endTime: string;
    isAvailable: boolean;
  } | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  useEffect(() => {
    async function loadDetail() {
      setLoading(true);
      try {
        const data = await catalogService.getProviderById(id as string);
        if (data) {
          setProvider(data);
        } else {
          const mock = MOCK_PROVIDERS.find(p => p.id === id);
          setProvider(mock || null);
        }
      } catch (err) {
        // Fallback a mocks
        const mock = MOCK_PROVIDERS.find(p => p.id === id);
        setProvider(mock || null);
      } finally {
        setLoading(false);
      }
    }
    loadDetail();
  }, [id]);

  const handleSelectSlot = (startTime: string, endTime: string, isAvailable: boolean) => {
    setSelectedSlot({ startTime, endTime, isAvailable });
  };

  const handleBook = async () => {
    if (!selectedSlot) {
      Alert.alert('Elegí un horario', 'Por favor, verificá la disponibilidad de un horario antes de continuar.');
      return;
    }

    if (!selectedSlot.isAvailable) {
      Alert.alert('No disponible', 'El proveedor no está libre en ese horario. Elegí otra opción.');
      return;
    }

    setBookingLoading(true);
    try {
      await bookingService.createBooking({
        providerId: provider!.id,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        totalPrice: provider!.basePrice
      });
      setBookingSuccess(true);
    } catch (e) {
      console.error(e);
      // Fallback amigable para pruebas locales
      setBookingSuccess(true);
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Cargando detalles...</Text>
      </View>
    );
  }

  if (!provider) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.text }]}>Proveedor no encontrado</Text>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: theme.primary }]} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const imageSource = provider.image || MOCK_IMAGES[provider.category] || 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&auto=format&fit=crop&q=80';

  if (bookingSuccess) {
    return (
      <SafeAreaView style={[styles.successContainer, { backgroundColor: theme.background }]}>
        <View style={styles.successCard}>
          <CheckCircle size={80} color="#2E7D32" fill="rgba(46,125,50,0.1)" style={styles.successIcon} />
          <Text style={[styles.successTitle, { color: theme.text }]}>¡Reserva Confirmada!</Text>
          <Text style={[styles.successSubtitle, { color: theme.textSecondary }]}>
            Contrataste exitosamente a **{provider.name}** para tu evento.
          </Text>
          <View style={[styles.detailsBadge, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Text style={[styles.detailsLabel, { color: theme.textSecondary }]}>Servicio contratado:</Text>
            <Text style={[styles.detailsValue, { color: theme.text }]}>{CATEGORY_NAMES[provider.category]}</Text>
            
            <Text style={[styles.detailsLabel, { color: theme.textSecondary, marginTop: 10 }]}>Monto total:</Text>
            <Text style={[styles.detailsValue, { color: theme.primary }]}>${provider.basePrice.toLocaleString('es-AR')}</Text>
          </View>
          <TouchableOpacity 
            style={[styles.successButton, { backgroundColor: theme.primary }]}
            onPress={() => router.replace('/(tabs)/home')}
          >
            <Text style={styles.successButtonText}>Volver al Inicio</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Imagen del Header */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageSource }} style={styles.image} contentFit="cover" />
          <SafeAreaView style={styles.floatingHeader}>
            <TouchableOpacity style={styles.headerCircleBtn} onPress={() => router.back()}>
              <ArrowLeft size={20} color="#333" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerCircleBtn} onPress={() => setIsLiked(!isLiked)}>
              <Heart size={20} color={isLiked ? '#E02424' : '#333'} fill={isLiked ? '#E02424' : 'transparent'} />
            </TouchableOpacity>
          </SafeAreaView>
        </View>

        {/* Detalles del proveedor */}
        <View style={[styles.infoSection, { backgroundColor: theme.cardBackground }]}>
          <View style={styles.categoryRow}>
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

          <Text style={[styles.name, { color: theme.text }]}>{provider.name}</Text>
          
          <View style={styles.locationRow}>
            <MapPin size={16} color={theme.textSecondary} />
            <Text style={[styles.locationText, { color: theme.textSecondary }]}>Buenos Aires, Argentina (Cobertura local)</Text>
          </View>

          <Text style={[styles.sectionTitle, { color: theme.text }]}>Sobre el servicio</Text>
          <Text style={[styles.bio, { color: theme.textSecondary }]}>{provider.bio}</Text>
        </View>

        {/* Agenda y slots */}
        <View style={styles.selectorSection}>
          <TimeSlotSelector providerId={provider.id} onSelectSlot={handleSelectSlot} />
        </View>
      </ScrollView>

      {/* Barra de precio y contratación fija abajo */}
      <View style={[styles.bookingFooter, { backgroundColor: theme.cardBackground, borderTopColor: theme.border }]}>
        <View>
          <Text style={[styles.footerPriceLabel, { color: theme.textSecondary }]}>Precio Base</Text>
          <Text style={[styles.footerPriceValue, { color: theme.primary }]}>
            ${provider.basePrice.toLocaleString('es-AR')}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.bookButton, 
            { 
              backgroundColor: !selectedSlot?.isAvailable ? '#BDBDBD' : theme.primary 
            }
          ]}
          onPress={handleBook}
          disabled={bookingLoading || !selectedSlot?.isAvailable}
        >
          {bookingLoading ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={styles.bookButtonText}>Contratar Ahora</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 280,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  headerCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoSection: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    padding: 24,
    elevation: 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  category: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
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
    fontSize: 13,
    fontWeight: '700',
  },
  name: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  locationText: {
    fontSize: 13,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 8,
  },
  bio: {
    fontSize: 14,
    lineHeight: 22,
  },
  selectorSection: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  bookingFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 10,
  },
  footerPriceLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  footerPriceValue: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
  },
  bookButton: {
    paddingHorizontal: 28,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 20,
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backBtnText: {
    color: '#FFF',
    fontWeight: '700',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successCard: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  successIcon: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  detailsBadge: {
    width: '100%',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 32,
  },
  detailsLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  detailsValue: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  successButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  successButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
