import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Shield, Mic, Send, Copy, Phone, ExternalLink } from 'lucide-react-native';
import { Audio } from 'expo-av'; // 🌟 필수 추가
import * as FileSystem from 'expo-file-system'; // 🌟 필수 추가
import Colors from '@/constants/colors';
import { BASE_URL } from '@/constants/config'; // 🌟 아까 만든 파일 연결
import { ChatMessage, chatbotInitialMessage } from '@/constants/mockData';

export default function ReportingChatbotScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([chatbotInitialMessage]);
  const [inputText, setInputText] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false); // 🌟 녹음 상태 관리
  const recordingRef = useRef<Audio.Recording | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, []);

  // 🔊 AI 답변 음성 재생 함수 [cite: 2026-02-03]
  const playAudioResponse = async (url: string) => {
    try {
      const { sound } = await Audio.Sound.createAsync({ uri: url });
      await sound.playAsync();
    } catch (e) {
      console.error("Audio playback error:", e);
    }
  };

  // 🤖 백엔드 통신 및 메시지 처리 함수 [cite: 2026-02-03, 2026-02-28]
  const handleChat = async (userText: string) => {
    // 1. 유저 메시지 화면에 표시
    const userMsg: ChatMessage = { id: `user-${Date.now()}`, text: userText, isBot: false, timestamp: 'Now' };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');

    try {
      // 2. 백엔드 API 호출 (텍스트 기반)
      const response = await fetch(`${BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_message: userText }),
      });
      const data = await response.json();

      // 3. AI 답변 화면 표시 및 음성 재생 [cite: 2026-02-03, 2026-02-28]
      const botMsg: ChatMessage = { id: `bot-${Date.now()}`, text: data.reply, isBot: true, timestamp: 'Now' };
      setMessages(prev => [...prev, botMsg]);
      if (data.audio_url) playAudioResponse(data.audio_url);
    } catch (e) {
      console.error("Chat Error:", e);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      // 1. 녹음 중단 상태로 변경 [cite: 2026-02-28]
      setIsRecording(false);
      try {
        await recordingRef.current?.stopAndUnloadAsync();
        
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false, // 마이크 사용 중단 [cite: 2026-02-28]
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false, // 스피커폰 강제 사용 [cite: 2026-02-28]
        });

        const uri = recordingRef.current?.getURI();
        if (uri) {
          const formData = new FormData();
          formData.append('file', { 
            uri, 
            name: `voice_${Date.now()}.wav`, // 캐싱 방지를 위해 파일명에 시간 추가 [cite: 2026-02-28]
            type: 'audio/wav' 
          } as any);
          
          const response = await fetch(`${BASE_URL}/voice-chat`, {
            method: 'POST',
            body: formData,
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          const data = await response.json();
          
          // 메시지 UI 업데이트 [cite: 2026-02-03, 2026-02-28]
          setMessages(prev => [...prev, 
            { id: `user-${Date.now()}`, text: data.user_text, isBot: false, timestamp: 'Now' },
            { id: `bot-${Date.now()}`, text: data.reply, isBot: true, timestamp: 'Now' }
          ]);
          
          if (data.audio_url) {
            console.log("🔊 Playing Audio:", data.audio_url);
            playAudioResponse(data.audio_url);
          }
        }
      } catch (e) { 
        console.error("Recording Stop Error:", e); 
      }
    } else {
      // 2. 녹음 시작 [cite: 2026-02-28]
      try {
        await Audio.requestPermissionsAsync();
        // 녹음을 위해 오디오 세션 카테고리 변경 [cite: 2026-02-28]
        await Audio.setAudioModeAsync({ 
          allowsRecordingIOS: true, 
          playsInSilentModeIOS: true 
        });
        
        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        recordingRef.current = recording;
        setIsRecording(true);
      } catch (e) { 
        console.error("Recording Start Error:", e); 
      }
    }
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* ... 헤더 부분 동일 ... */}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scrollRef} style={styles.chatArea} contentContainerStyle={styles.chatContent}>
          {messages.map((msg) => (
            <View key={msg.id} style={msg.isBot ? styles.botRow : styles.userRow}>
              {msg.isBot && <View style={styles.botAvatar}><Shield size={16} color={Colors.primary} /></View>}
              <View style={msg.isBot ? styles.botBubble : styles.userBubble}>
                <Text style={msg.isBot ? styles.botText : styles.userText}>{msg.text}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
          <TouchableOpacity 
            style={[styles.micButton, isRecording && { backgroundColor: 'red' }]} 
            onPress={toggleRecording}
          >
            <Mic size={22} color={isRecording ? 'white' : Colors.primary} />
          </TouchableOpacity>
          <TextInput
            style={styles.textInput}
            placeholder="Describe your situation..."
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => handleChat(inputText)}
          />
          <TouchableOpacity style={styles.sendButton} onPress={() => handleChat(inputText)}>
            <Send size={18} color="white" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}
// ... 스타일 정의 생략 ...

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
