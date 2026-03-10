import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Button,
  FlatList,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

type EventItem = {
  id: string;
  title: string;
  start: string;
  end: string;
};

type MailItem = {
  id: string;
  from: string;
  subject: string;
  body: string;
  translatedBody: string;
  summary: string;
  replied: boolean;
  priority: "high" | "medium" | "low";
};

type AssistantBrief = {
  unrepliedCount: number;
  highPriorityCount: number;
  top3: string[];
  focusSuggestion: string;
};

const BASE_URL = "http://localhost:4000";

export default function App() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [mails, setMails] = useState<MailItem[]>([]);
  const [brief, setBrief] = useState<AssistantBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [newEventTitle, setNewEventTitle] = useState("집중 업무 블록");
  const [newEventStart, setNewEventStart] = useState("2026-03-09T16:00:00+09:00");
  const [newEventEnd, setNewEventEnd] = useState("2026-03-09T16:30:00+09:00");
  const [message, setMessage] = useState("");

  const firstMail = useMemo(() => mails[0], [mails]);

  async function loadAll() {
    setLoading(true);
    setMessage("");
    try {
      const [evRes, mailRes, briefRes] = await Promise.all([
        fetch(`${BASE_URL}/api/calendar/events`),
        fetch(`${BASE_URL}/api/mail/inbox`),
        fetch(`${BASE_URL}/api/assistant/brief`)
      ]);

      const evJson = await evRes.json();
      const mailJson = await mailRes.json();
      const briefJson = await briefRes.json();

      setEvents(evJson.items ?? []);
      setMails(mailJson.items ?? []);
      setBrief(briefJson);
    } catch (error) {
      setMessage("서버 연결에 실패했습니다. server 실행 여부를 확인해주세요.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function createEvent() {
    const res = await fetch(`${BASE_URL}/api/calendar/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newEventTitle, start: newEventStart, end: newEventEnd })
    });
    const data = await res.json();
    if (res.ok) {
      setMessage(`일정 생성 완료 (충돌 ${data.conflicts.length}건)`);
      loadAll();
    } else {
      setMessage(data.message || "일정 생성 실패");
    }
  }

  async function createDraft() {
    if (!firstMail) return;
    const res = await fetch(`${BASE_URL}/api/mail/${firstMail.id}/reply-draft`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setDraft(data.draft.body);
      setMessage("답장 초안을 생성했습니다.");
    }
  }

  async function sendDraft() {
    if (!firstMail || !draft.trim()) return;
    const res = await fetch(`${BASE_URL}/api/mail/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: firstMail.from, subject: `Re: ${firstMail.subject}`, body: draft })
    });
    const data = await res.json();
    if (res.ok) {
      setMessage(`메일 발송 완료 (총 ${data.sentCount}건)`);
      setDraft("");
      loadAll();
    } else {
      setMessage(data.message || "메일 발송 실패");
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>AI 비서 데이터를 불러오는 중...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>AI 일정 비서 (MVP 구현)</Text>
        <Text style={styles.caption}>일정/메일/비서 브리핑/초안 발송 API 연동</Text>

        {message ? <Text style={styles.message}>{message}</Text> : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>오늘의 비서 브리핑</Text>
          <Text>미응답 메일: {brief?.unrepliedCount ?? 0}건</Text>
          <Text>중요 메일: {brief?.highPriorityCount ?? 0}건</Text>
          <Text style={styles.focus}>{brief?.focusSuggestion}</Text>
          <FlatList
            data={brief?.top3 ?? []}
            keyExtractor={(item) => item}
            renderItem={({ item }) => <Text style={styles.listItem}>• {item}</Text>}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>일정 생성</Text>
          <TextInput style={styles.input} value={newEventTitle} onChangeText={setNewEventTitle} />
          <TextInput style={styles.input} value={newEventStart} onChangeText={setNewEventStart} />
          <TextInput style={styles.input} value={newEventEnd} onChangeText={setNewEventEnd} />
          <Button title="일정 생성 + 충돌 확인" onPress={createEvent} />
          {events.map((ev) => (
            <Text key={ev.id} style={styles.listItem}>• {ev.title} ({ev.start.slice(11, 16)}~{ev.end.slice(11, 16)})</Text>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>메일함 (요약/번역)</Text>
          {mails.map((mail) => (
            <View key={mail.id} style={styles.mailCard}>
              <Text style={styles.mailSubject}>{mail.subject}</Text>
              <Text>보낸사람: {mail.from}</Text>
              <Text>요약: {mail.summary}</Text>
              <Text>번역: {mail.translatedBody}</Text>
              <Text>상태: {mail.replied ? "답장 완료" : "미응답"}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>답장 초안 생성/발송</Text>
          <Button title="첫 메일 답장 초안 생성" onPress={createDraft} />
          <TextInput
            style={[styles.input, styles.multiline]}
            value={draft}
            onChangeText={setDraft}
            placeholder="초안이 여기에 표시됩니다"
            multiline
          />
          <Button title="초안 발송" onPress={sendDraft} />
        </View>

        <Button title="새로고침" onPress={loadAll} />
      </ScrollView>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10 },
  content: { padding: 16, gap: 12 },
  title: { fontSize: 24, fontWeight: "700" },
  caption: { color: "#4b5563", marginBottom: 8 },
  message: { backgroundColor: "#d1fae5", padding: 10, borderRadius: 8 },
  section: { backgroundColor: "white", borderRadius: 10, padding: 12, gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: "600" },
  focus: { color: "#2563eb", fontWeight: "600" },
  listItem: { color: "#111827" },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#fff"
  },
  multiline: { minHeight: 100, textAlignVertical: "top" },
  mailCard: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, padding: 8, gap: 4 },
  mailSubject: { fontWeight: "700" }
});
