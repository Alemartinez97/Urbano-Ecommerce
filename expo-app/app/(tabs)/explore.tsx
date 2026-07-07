import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  KeyboardAvoidingView, 
  Platform, 
  useColorScheme,
  ActivityIndicator,
  SafeAreaView,
  ScrollView
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { Send, Bot, User, Sparkles, ArrowRight, Star } from 'lucide-react-native';
import { SERVICE_URLS } from '../../src/services/apiClient';
import { Provider } from '../../src/services/catalogService';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

// Lista completa de proveedores para match interactivo en el chat
const ALL_PROVIDERS: Provider[] = [
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

const MOCK_IMAGES: Record<string, string> = {
  CATERING: 'https://images.unsplash.com/photo-1555244162-803834f70033?w=300&auto=format&fit=crop&q=60',
  MUSIC: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&auto=format&fit=crop&q=60',
  STAFF: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=60',
  VENUE: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=300&auto=format&fit=crop&q=60',
  PHOTOGRAPHY: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=300&auto=format&fit=crop&q=60',
  DECORATION: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=300&auto=format&fit=crop&q=60',
};

// Simulador de IA offline
const MOCK_AI_RESPONSES = [
  {
    keywords: ['dj', 'banda', 'musica', 'música'],
    response: '¡Hola! Encontré este DJ excelente disponible en EventGo:\n\n🎵 **DJ "SoundWave" Sonido**\n⭐ Calificación: 4.8\n💰 Precio Base: $35,000\n\n¿Querés que verifique si está disponible para alguna fecha en particular?'
  },
  {
    keywords: ['mozo', 'mozos', 'barman', 'personal', 'staff'],
    response: '¡Hola! Encontré este equipo excelente disponible para tu evento:\n\n🤵 **Servicio de Mozos Premium**\n⭐ Calificación: 4.7\n💰 Precio Base: $15,000\n\n¿Para qué fecha y horario los necesitas?'
  },
  {
    keywords: ['salon', 'salón', 'quinta', 'lugar', 'venue'],
    response: '¡Hola! Te recomiendo esta locación soñada en Buenos Aires:\n\n🏡 **Salón Quinta "Las Camelias"**\n⭐ Calificación: 5.0\n💰 Precio Base: $120,000\n\nEs ideal para casamientos o fiestas de 15. ¿Querés ver disponibilidad?'
  },
  {
    keywords: ['catering', 'comida', 'asado', 'asador'],
    response: '¡Hola! Encontré esta propuesta riquísima para agasajar a tus invitados:\n\n🍖 **Catering "La Pampa"**\n⭐ Calificación: 4.9\n💰 Precio Base: $50,000\n\n¿Querés que te reserve un menú para alguna fecha?'
  },
  {
    keywords: ['foto', 'video', 'fotografo', 'fotógrafo'],
    response: '¡Hola! Encontré este equipo audiovisual de primer nivel:\n\n📸 **Aura Producciones Fotografía**\n⭐ Calificación: 4.9\n💰 Precio Base: $40,000\n\n¿Te gustaría ver muestras de su cobertura?'
  }
];

export default function ChatScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '¡Hola! Soy **EventGo IA**, tu asistente inteligente para eventos.\n\nDecime qué proveedor estás buscando (ej: *"necesito un DJ"* o *"buscame un salón disponible"*), tu presupuesto aproximado, ¡y te ayudo a reservarlo en segundos!',
      createdAt: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Escanea el texto del bot para ver si menciona algún proveedor real de nuestra lista
  const detectRecommendedProviders = (content: string): Provider[] => {
    const lowerContent = content.toLowerCase();
    return ALL_PROVIDERS.filter(prov => 
      lowerContent.includes(prov.id.toLowerCase()) || 
      lowerContent.includes(prov.name.toLowerCase()) ||
      (prov.name.includes('"') && lowerContent.includes(prov.name.split('"')[1].toLowerCase()))
    );
  };

  const getOfflineResponse = (userText: string): string => {
    const lowerText = userText.toLowerCase();
    for (const item of MOCK_AI_RESPONSES) {
      if (item.keywords.some(k => lowerText.includes(k))) {
        return item.response;
      }
    }
    return '¡Hola! Entiendo tu consulta. Como asistente de **EventGo**, puedo ayudarte a buscar catering, música/DJs, mozos, salones, decoración o fotógrafos.\n\nProbá escribiendo por ejemplo: *"buscame un mozo"* o *"salones disponibles"* y te muestro las opciones reales.';
  };

  const handleSend = async () => {
    if (inputText.trim() === '') return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText,
      createdAt: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    const apiBodyMessages = [...messages, userMessage].map(m => ({
      role: m.role,
      content: m.content
    }));

    try {
      const response = await fetch(SERVICE_URLS.CHATBOT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: apiBodyMessages }),
      });

      if (response.ok) {
        const text = await response.text();
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: text,
          createdAt: new Date()
        };
        setMessages(prev => [...prev, botMessage]);
      } else {
        throw new Error('Backend failed');
      }
    } catch (e) {
      console.warn('Utilizando asistente simulado local (Backend desconectado)');
      await new Promise(resolve => setTimeout(resolve, 1500));

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: getOfflineResponse(userMessage.content),
        createdAt: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    } finally {
      setLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const renderMessageItem = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    const recommended = !isUser ? detectRecommendedProviders(item.content) : [];

    return (
      <View style={styles.messageContainer}>
        <View style={[
          styles.messageRow, 
          isUser ? styles.userRow : styles.botRow
        ]}>
          {!isUser && (
            <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
              <Bot size={16} color="#FFF" />
            </View>
          )}
          <View style={[
            styles.bubble, 
            isUser 
              ? [styles.userBubble, { backgroundColor: theme.primary }] 
              : [styles.botBubble, { backgroundColor: theme.cardBackground, borderColor: theme.border }]
          ]}>
            <Text style={[
              styles.messageText, 
              { color: isUser ? '#FFF' : theme.text }
            ]}>
              {item.content}
            </Text>
          </View>
          {isUser && (
            <View style={[styles.avatar, { backgroundColor: theme.textSecondary }]}>
              <User size={16} color="#FFF" />
            </View>
          )}
        </View>

        {/* Dynamic Interactive Cards underneath Bot recommendations */}
        {recommended.length > 0 && (
          <View style={styles.recommendationsContainer}>
            <Text style={[styles.recommendationTitle, { color: theme.textSecondary }]}>
              Recomendación interactiva:
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalCardsScroll}>
              {recommended.map((prov) => {
                const imgSource = MOCK_IMAGES[prov.category] || 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=300&auto=format&fit=crop&q=60';
                return (
                  <TouchableOpacity
                    key={prov.id}
                    style={[styles.miniCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                    onPress={() => router.push(`/provider/${prov.id}`)}
                    activeOpacity={0.8}
                  >
                    <Image source={{ uri: imgSource }} style={styles.miniCardImage} contentFit="cover" />
                    <View style={styles.miniCardContent}>
                      <Text style={[styles.miniCardName, { color: theme.text }]} numberOfLines={1}>
                        {prov.name}
                      </Text>
                      <View style={styles.miniCardStats}>
                        <View style={styles.miniRating}>
                          <Star size={12} color="#FFD700" fill="#FFD700" />
                          <Text style={[styles.miniRatingText, { color: theme.text }]}>{prov.rating}</Text>
                        </View>
                        <Text style={[styles.miniCardPrice, { color: theme.primary }]}>
                          ${prov.basePrice.toLocaleString('es-AR')}
                        </Text>
                      </View>
                      <View style={styles.miniCardFooter}>
                        <Text style={styles.miniCardBtnText}>Ver y Reservar</Text>
                        <ArrowRight size={12} color={theme.primary} />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header del Chat */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.logoIcon, { backgroundColor: theme.primary }]}>
            <Sparkles size={18} color="#FFF" fill="#FFF" />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: theme.text }]}>EventGo IA</Text>
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Asistente Activo</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Lista de mensajes */}
      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessageItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            loading ? (
              <View style={styles.typingContainer}>
                <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                  <Bot size={16} color="#FFF" />
                </View>
                <View style={[styles.typingBubble, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                  <ActivityIndicator size="small" color={theme.primary} />
                  <Text style={[styles.typingText, { color: theme.textSecondary }]}>IA escribiendo...</Text>
                </View>
              </View>
            ) : null
          }
        />

        {/* Input Bar */}
        <View style={[styles.inputBar, { backgroundColor: theme.cardBackground, borderTopColor: theme.border }]}>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Preguntale cualquier cosa a EventGo IA..."
            placeholderTextColor={theme.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <TouchableOpacity 
            style={[styles.sendButton, { backgroundColor: theme.primary }]}
            onPress={handleSend}
            disabled={inputText.trim() === ''}
          >
            <Send size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2E7D32',
  },
  statusText: {
    fontSize: 11,
    color: '#2E7D32',
    fontWeight: '600',
  },
  keyboardContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 20,
    paddingBottom: 24,
  },
  messageContainer: {
    gap: 8,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    maxWidth: '85%',
  },
  userRow: {
    alignSelf: 'flex-end',
  },
  botRow: {
    alignSelf: 'flex-start',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    padding: 14,
    borderRadius: 20,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  botBubble: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  recommendationsContainer: {
    marginLeft: 36,
    marginTop: 4,
    gap: 6,
  },
  recommendationTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  horizontalCardsScroll: {
    gap: 10,
    paddingRight: 20,
  },
  miniCard: {
    width: 180,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  miniCardImage: {
    width: '100%',
    height: 90,
  },
  miniCardContent: {
    padding: 10,
    gap: 4,
  },
  miniCardName: {
    fontSize: 13,
    fontWeight: '750',
  },
  miniCardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  miniRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  miniRatingText: {
    fontSize: 11,
    fontWeight: '600',
  },
  miniCardPrice: {
    fontSize: 13,
    fontWeight: '800',
  },
  miniCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 8,
    marginTop: 4,
  },
  miniCardBtnText: {
    color: '#009EE3',
    fontSize: 11,
    fontWeight: '700',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  typingText: {
    fontSize: 13,
    fontWeight: '600',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 18,
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
});
