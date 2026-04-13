import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../src/context/ThemeContext';
import { api } from '../../src/utils/api';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MayAvatar from '../../src/components/MayAvatar';

type Message = { role: string; content: string; created_at: string };

export default function ChatScreen() {
  const { goalId } = useLocalSearchParams();
  const isGeneral = goalId === 'general';
  const { colors } = useTheme();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [headerTitle, setHeaderTitle] = useState(isGeneral ? 'Chat with May' : '');
  const [headerSub, setHeaderSub] = useState(isGeneral ? 'Ask me anything!' : '');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    (async () => {
      try {
        const chatPath = isGeneral ? '/chat/general' : `/goals/${goalId}/chat`;
        const history = await api(chatPath);
        if (!isGeneral) {
          const goal = await api(`/goals/${goalId}`);
          setHeaderTitle(goal.title);
          setHeaderSub(`Day ${goal.current_day || 0}/${goal.duration_days}`);
        }
        if (history.length === 0) {
          const welcomeMsg = isGeneral
            ? "Hey there! 💜 I'm May, your AI habit coach and life companion. You can talk to me about anything — your goals, motivation, struggles, or just life in general. What's on your mind?"
            : "Hi! I'm here to help you with your goal. How are you feeling about it today? Let's chat! 💪";
          setMessages([{ role: 'assistant', content: welcomeMsg, created_at: new Date().toISOString() }]);
        } else {
          setMessages(history);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [goalId]);

  const handleBack = () => {
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/chats');
      }
    } catch (e) {
      router.replace('/(tabs)/chats');
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    const msg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg, created_at: new Date().toISOString() }]);
    setSending(true);
    try {
      const chatPath = isGeneral ? '/chat/general' : `/goals/${goalId}/chat`;
      const result = await api(chatPath, { method: 'POST', body: JSON.stringify({ message: msg }) });
      setMessages(prev => [...prev, { role: 'assistant', content: result.ai_message.content, created_at: result.ai_message.created_at }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Oops, I had a little hiccup! Try again? 😊", created_at: new Date().toISOString() }]);
    }
    finally { setSending(false); }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.msgRow, isUser ? styles.userRow : styles.aiRow]}>
        {!isUser && <MayAvatar size={30} />}
        <View style={[styles.bubble, isUser
          ? { backgroundColor: colors.primary, borderBottomRightRadius: 4 }
          : { backgroundColor: colors.ai_bubble, borderBottomLeftRadius: 4 }
        ]}>
          {!isUser && <Text style={[styles.bubbleName, { color: colors.primary }]}>May</Text>}
          <Text style={[styles.bubbleText, { color: isUser ? '#fff' : colors.text_primary }]}>{item.content}</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity testID="chat-back-btn" onPress={handleBack} style={styles.backBtn} activeOpacity={0.6}>
          <Ionicons name="arrow-back" size={24} color={colors.text_primary} />
        </TouchableOpacity>
        <MayAvatar size={36} showStatus />
        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, { color: colors.text_primary }]} numberOfLines={1}>{headerTitle || 'May'}</Text>
          <Text style={[styles.headerSub, { color: colors.text_secondary }]}>{headerSub || 'Online'}</Text>
        </View>
      </View>

      {loading ? <View style={styles.centerContent}><ActivityIndicator size="large" color={colors.primary} /></View> : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />
      )}

      {sending && (
        <View style={styles.typingRow}>
          <MayAvatar size={24} />
          <View style={[styles.typingBubble, { backgroundColor: colors.ai_bubble }]}>
            <Text style={[styles.typingDots, { color: colors.primary }]}>● ● ●</Text>
          </View>
        </View>
      )}

      <View style={[styles.inputBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TextInput
          testID="chat-input"
          style={[styles.textInput, { backgroundColor: colors.surface_alt, color: colors.text_primary }]}
          value={input}
          onChangeText={setInput}
          placeholder="Message May..."
          placeholderTextColor={colors.text_secondary}
          multiline
        />
        <TouchableOpacity testID="chat-send-btn" onPress={sendMessage} disabled={!input.trim() || sending} activeOpacity={0.7}>
          <LinearGradient
            colors={input.trim() ? ['#8C65F7', '#6200EA'] : [colors.surface_alt, colors.surface_alt]}
            style={styles.sendBtn}
          >
            <Ionicons name="send" size={18} color={input.trim() ? '#fff' : colors.text_secondary} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 56, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1 },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  headerSub: { fontSize: 12, marginTop: 1 },
  messagesList: { paddingHorizontal: 16, paddingVertical: 16, gap: 8 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, maxWidth: '82%', marginBottom: 4 },
  userRow: { alignSelf: 'flex-end' }, aiRow: { alignSelf: 'flex-start' },
  bubble: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12, maxWidth: '100%' },
  bubbleName: { fontSize: 11, fontWeight: '800', marginBottom: 4, letterSpacing: 0.5 },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingBottom: 8 },
  typingBubble: { borderRadius: 16, paddingHorizontal: 16, paddingVertical: 10 },
  typingDots: { fontSize: 14, fontWeight: '800', letterSpacing: 2 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 32, borderTopWidth: 1 },
  textInput: { flex: 1, borderRadius: 22, paddingHorizontal: 18, paddingVertical: 12, fontSize: 15, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
});
