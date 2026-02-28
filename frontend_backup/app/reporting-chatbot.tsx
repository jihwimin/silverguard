import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  Shield,
  Mic,
  Send,
  Copy,
  Phone,
  ExternalLink,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import {
  ChatMessage,
  chatbotInitialMessage,
  chatbotQuickReplies,
  chatbotResponses,
} from '@/constants/mockData';

export default function ReportingChatbotScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([chatbotInitialMessage]);
  const [inputText, setInputText] = useState<string>('');
  const [showQuickReplies, setShowQuickReplies] = useState<boolean>(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, []);

  const addBotResponse = useCallback((reply: string) => {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      text: reply,
      isBot: false,
      timestamp: '지금',
    };
    setMessages((prev) => [...prev, userMsg]);
    setShowQuickReplies(false);

    setTimeout(() => {
      const responses = chatbotResponses[reply];
      if (responses) {
        setMessages((prev) => [...prev, ...responses]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            text: '해당 상황에 대한 안내를 준비 중입니다. 긴급한 경우 112로 연락해 주세요.',
            isBot: true,
            timestamp: '지금',
          },
        ]);
      }
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }, 800);

    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const handleSend = useCallback(() => {
    if (!inputText.trim()) return;
    addBotResponse(inputText.trim());
    setInputText('');
  }, [inputText, addBotResponse]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <Shield size={18} color={Colors.primary} strokeWidth={2.5} />
          </View>
          <View>
            <Text style={styles.headerTitle}>신고 도우미</Text>
            <View style={styles.secureBadge}>
              <View style={styles.secureDot} />
              <Text style={styles.secureText}>보안 연결</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton} testID="close-chatbot">
          <X size={22} color={Colors.textSecondary} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.chatArea}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((msg) => (
            <View key={msg.id} style={msg.isBot ? styles.botRow : styles.userRow}>
              {msg.isBot && (
                <View style={styles.botAvatar}>
                  <Shield size={16} color={Colors.primary} strokeWidth={2} />
                </View>
              )}
              <View style={msg.isBot ? styles.botBubble : styles.userBubble}>
                <Text style={msg.isBot ? styles.botText : styles.userText}>{msg.text}</Text>
                {msg.card && (
                  <View style={styles.summaryCard}>
                    <View style={styles.summaryHeader}>
                      <Text style={styles.summaryTitle}>{msg.card.title}</Text>
                      <TouchableOpacity>
                        <Copy size={16} color={Colors.primary} strokeWidth={2} />
                      </TouchableOpacity>
                    </View>
                    {msg.card.items.map((item, i) => (
                      <Text key={i} style={styles.summaryItem}>• {item}</Text>
                    ))}
                    {msg.card.keywords && (
                      <View style={styles.keywordsRow}>
                        {msg.card.keywords.map((kw, i) => (
                          <View key={i} style={styles.keywordChip}>
                            <Text style={styles.keywordText}>{kw}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>
          ))}

          {showQuickReplies && (
            <View style={styles.quickReplies}>
              {chatbotQuickReplies.map((reply, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.quickReplyButton}
                  onPress={() => addBotResponse(reply)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.quickReplyText}>{reply}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={styles.stickyActions}>
          <TouchableOpacity style={styles.actionButton} activeOpacity={0.85}>
            <Phone size={16} color={Colors.white} strokeWidth={2.5} />
            <Text style={styles.actionButtonText}>112/금감원 안내 보기</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionSecondary} activeOpacity={0.75}>
            <ExternalLink size={16} color={Colors.primary} strokeWidth={2} />
            <Text style={styles.actionSecondaryText}>상담 연결</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
          <TouchableOpacity style={styles.micButton} activeOpacity={0.75}>
            <Mic size={22} color={Colors.primary} strokeWidth={2} />
          </TouchableOpacity>
          <TextInput
            style={styles.textInput}
            placeholder="상황을 입력하세요..."
            placeholderTextColor={Colors.textTertiary}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim()}
            activeOpacity={0.85}
          >
            <Send size={18} color={inputText.trim() ? Colors.white : Colors.textTertiary} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  secureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  secureText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500' as const,
  },
  closeButton: {
    padding: 8,
  },
  chatArea: {
    flex: 1,
  },
  chatContent: {
    padding: 16,
    gap: 12,
  },
  botRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    maxWidth: '85%',
  },
  userRow: {
    alignItems: 'flex-end',
    alignSelf: 'flex-end',
    maxWidth: '80%',
  },
  botAvatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.primaryFaint,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  botBubble: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderTopLeftRadius: 4,
    padding: 14,
    flex: 1,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    borderTopRightRadius: 4,
    padding: 14,
  },
  botText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },
  userText: {
    fontSize: 15,
    color: Colors.white,
    lineHeight: 22,
  },
  summaryCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  summaryItem: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 4,
  },
  keywordsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  keywordChip: {
    backgroundColor: Colors.primaryFaint,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  keywordText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  quickReplies: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    paddingLeft: 40,
  },
  quickReplyButton: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  quickReplyText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  stickyActions: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 44,
  },
  actionButtonText: {
    fontSize: 14,
    color: Colors.white,
    fontWeight: '700' as const,
  },
  actionSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 16,
  },
  actionSecondaryText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: Colors.white,
  },
  micButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    height: 44,
    backgroundColor: Colors.background,
    borderRadius: 22,
    paddingHorizontal: 16,
    fontSize: 15,
    color: Colors.text,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: {
    backgroundColor: Colors.borderLight,
  },
});
