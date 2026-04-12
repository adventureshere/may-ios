import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../src/context/ThemeContext';
import { api } from '../../src/utils/api';
import { Ionicons } from '@expo/vector-icons';

type Message = { role: string; content: string; created_at: string };

export default function ChatScreen() {
  const { goalId } = useLocalSearchParams();
  const { colors } = useTheme();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [goalTitle, setGoalTitle] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    (async () => {
      try {
        const [history, goal] = await Promise.all([api(`/goals/${goalId}/chat`), api(`/goals/${goalId}`)]);
        setMessages(history);
        setGoalTitle(goal.title);
        if (history.length === 0) {
          setMessages([{ role: 'assistant', content: `Hi! I'm May, your habit coach. I'm here to help you with "${goal.title}". How can I help you today? 💜`, created_at: new Date().toISOString() }]);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [goalId]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    const msg = input.trim();
    setInput('');
    const userMsg: Message = { role: 'user', content: msg, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setSending(true);
    try {
      const result = await api(`/goals/${goalId}/chat`, { method: 'POST', body: JSON.stringify({ message: msg }) });
      setMessages(prev => [...prev, { role: 'assistant', content: result.ai_message.content, created_at: result.ai_message.created_at }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I couldn't respond right now. Try again!", created_at: new Date().toISOString() }]);
    }
    finally { setSending(false); }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.bubbleRow, isUser ? styles.userRow : styles.aiRow]}>
        {!isUser && <View style={[styles.aiAvatar, { backgroundColor: colors.primary + '20' }]}><Ionicons name="sparkles" size={14} color={colors.primary} /></View>}
        <View style={[styles.bubble, isUser ? { backgroundColor: colors.primary, borderBottomRightRadius: 4 } : { backgroundColor: colors.ai_bubble, borderBottomLeftRadius: 4 }]}>
          <Text style={[styles.bubbleText, { color: isUser ? colors.primary_foreground : colors.text_primary }]}>{item.content}</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity testID="chat-back-btn" onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color={colors.text_primary} /></TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, { color: colors.text_primary }]}>May</Text>
          <Text style={[styles.headerSub, { color: colors.text_secondary }]} numberOfLines={1}>{goalTitle}</Text>
        </View>
        <View style={[styles.onlineDot, { backgroundColor: colors.success }]} />
      </View>

      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : (
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

      {sending && <View style={styles.typingRow}><View style={[styles.aiAvatar, { backgroundColor: colors.primary + '20' }]}><Ionicons name="sparkles" size={14} color={colors.primary} /></View><Text style={[styles.typingText, { color: colors.text_secondary }]}>May is typing...</Text></View>}

      <View style={[styles.inputBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TextInput testID="chat-input" style={[styles.textInput, { backgroundColor: colors.surface_alt, color: colors.text_primary }]} value={input} onChangeText={setInput} placeholder="Message May..." placeholderTextColor={colors.text_secondary} multiline onSubmitEditing={sendMessage} />
        <TouchableOpacity testID="chat-send-btn" style={[styles.sendBtn, { backgroundColor: input.trim() ? colors.primary : colors.surface_alt }]} onPress={sendMessage} disabled={!input.trim() || sending}>
          <Ionicons name="send" size={18} color={input.trim() ? colors.primary_foreground : colors.text_secondary} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 56, paddingBottom: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  headerInfo: { flex: 1, marginLeft: 4 }, headerTitle: { fontSize: 18, fontWeight: '700' }, headerSub: { fontSize: 13 },
  onlineDot: { width: 8, height: 8, borderRadius: 4 },
  messagesList: { paddingHorizontal: 16, paddingVertical: 16, gap: 10 },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, maxWidth: '85%' },
  userRow: { alignSelf: 'flex-end' }, aiRow: { alignSelf: 'flex-start' },
  aiAvatar: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  bubble: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12, maxWidth: '100%' },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingBottom: 8 },
  typingText: { fontSize: 13, fontStyle: 'italic' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 32, borderTopWidth: 1 },
  textInput: { flex: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
});
