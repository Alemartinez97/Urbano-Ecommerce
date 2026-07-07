import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  useColorScheme, 
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { Colors } from '../../constants/Colors';
import SearchBar from '../../components/SearchBar';
import CategoryList from '../../components/CategoryList';
import ProviderCard from '../../components/ProviderCard';
import { catalogService, Provider } from '../../src/services/catalogService';
import { Star, Sparkles } from 'lucide-react-native';

const MOCK_PROVIDERS: Provider[] = [
  {
    id: 'prov-1',
    name: 'Catering "La Pampa"',
    category: 'CATERING',
    rating: 4.9,
    basePrice: 50000,
    bio: 'Servicio de asado premium, postres tradicionales y mozos experimentados para todo tipo de fiestas.',
  },
  {
    id: 'prov-2',
    name: 'DJ "SoundWave" Sonido',
    category: 'MUSIC',
    rating: 4.8,
    basePrice: 35000,
    bio: 'DJ profesional con sonido de alta definición, luces LED robóticas y animación completa de pista.',
  },
  {
    id: 'prov-3',
    name: 'Servicio de Mozos Premium',
    category: 'STAFF',
    rating: 4.7,
    basePrice: 15000,
    bio: 'Personal capacitado para protocolo, etiqueta y coctelería premium. Garantía de excelente trato.',
  },
  {
    id: 'prov-4',
    name: 'Salón Quinta "Las Camelias"',
    category: 'VENUE',
    rating: 5.0,
    basePrice: 120000,
    bio: 'Predio hermoso con pileta, parque arbolado, salón cubierto climatizado y estacionamiento vigilado.',
  },
  {
    id: 'prov-5',
    name: 'Aura Producciones Fotografía',
    category: 'PHOTOGRAPHY',
    rating: 4.9,
    basePrice: 40000,
    bio: 'Cobertura de fotos y video en alta calidad con drone. Entregamos álbum digital y video editado.',
  },
  {
    id: 'prov-6',
    name: 'Eventos Glam Ambientación',
    category: 'DECORATION',
    rating: 4.6,
    basePrice: 28000,
    bio: 'Especialistas en arreglos florales, arcos de globos y luces temáticas para eventos soñados.',
  }
];

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [filteredProviders, setFilteredProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar proveedores desde el backend (con fallback a mocks)
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const data = await catalogService.getServices();
        if (data && data.length > 0) {
          setProviders(data);
        } else {
          setProviders(MOCK_PROVIDERS);
        }
      } catch (err) {
        console.warn('Error connecting to backend services, using high-fidelity mock data:', err);
        setProviders(MOCK_PROVIDERS);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filtrar según categoría y barra de búsqueda
  useEffect(() => {
    let result = providers;

    if (selectedCategory !== 'ALL') {
      result = result.filter(p => p.category === selectedCategory);
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(q) || 
        (p.bio && p.bio.toLowerCase().includes(q))
      );
    }

    setFilteredProviders(result);
  }, [searchQuery, selectedCategory, providers]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header Premium */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.welcomeText, { color: theme.textSecondary }]}>Buenas noches 👋</Text>
          <View style={styles.logoRow}>
            <Text style={[styles.logoText, { color: theme.text }]}>EventGo</Text>
            <Sparkles size={16} color={theme.primary} fill={theme.primary} />
          </View>
        </View>
        <View style={[styles.avatarCircle, { backgroundColor: theme.primary }]}>
          <Text style={styles.avatarText}>U</Text>
        </View>
      </View>

      {/* Buscador */}
      <SearchBar 
        value={searchQuery} 
        onChangeText={setSearchQuery} 
        placeholder="Buscá mozos, DJs, salones..." 
      />

      {/* Categorías */}
      <View style={styles.categoriesTitleRow}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Servicios Disponibles</Text>
      </View>
      <View>
        <CategoryList 
          selectedCategory={selectedCategory} 
          onSelectCategory={setSelectedCategory} 
        />
      </View>

      {/* Lista de proveedores */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Cargando marketplace...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProviders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ProviderCard provider={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Star size={32} color={theme.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No encontramos resultados</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                Probá buscando otra palabra o cambiando la categoría.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 5,
  },
  welcomeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  logoText: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  categoriesTitleRow: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
