import cors from "cors";
import dotenv from "dotenv";
import express from "express";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  attendees?: string[];
};

type MailMessage = {
  id: string;
  from: string;
  subject: string;
  body: string;
  language: "ko" | "en";
  translatedBody?: string;
  summary?: string;
  replied: boolean;
  priority: "high" | "medium" | "low";
};

const events: CalendarEvent[] = [
  {
    id: "ev-1",
    title: "주간 팀 스탠드업",
    start: "2026-03-09T09:30:00+09:00",
    end: "2026-03-09T10:00:00+09:00",
    attendees: ["team@company.com"]
  },
  {
    id: "ev-2",
    title: "파트너사 미팅",
    start: "2026-03-09T14:00:00+09:00",
    end: "2026-03-09T15:00:00+09:00",
    attendees: ["partner@vendor.com"]
  }
];

const messages: MailMessage[] = [
  {
    id: "m-1",
    from: "alex@global.io",
    subject: "Updated contract terms",
    body: "Please review the attached draft and let us know your availability this week.",
    language: "en",
    replied: false,
    priority: "high"
  },
  {
    id: "m-2",
    from: "hr@company.com",
    subject: "복지 제도 변경 안내",
    body: "다음 달부터 복지 포인트 정책이 일부 변경됩니다. 첨부 문서를 확인해주세요.",
    language: "ko",
    replied: false,
    priority: "medium"
  }
];

const sentMails: Array<{ to: string; subject: string; body: string; createdAt: string }> = [];

function summarize(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= 120) return cleaned;
  return `${cleaned.slice(0, 117)}...`;
}

function translateEnToKo(text: string): string {
  return `[번역] ${text}`;
}

function suggestReply(message: MailMessage): string {
  if (message.language === "en") {
    return "Thanks for sharing. I reviewed the draft and can discuss this on Wednesday afternoon. Please suggest a time.";
  }
  return "안녕하세요. 내용 확인했습니다. 이번 주 수요일 오후에 논의 가능하니 가능한 시간 제안 부탁드립니다.";
}

function findConflicts(start: string, end: string): CalendarEvent[] {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return events.filter((ev) => {
    const es = new Date(ev.start).getTime();
    const ee = new Date(ev.end).getTime();
    return s < ee && e > es;
  });
}

function buildAssistantBrief() {
  const unreplied = messages.filter((m) => !m.replied);
  const highPriority = unreplied.filter((m) => m.priority === "high");
  const todayTop3 = [
    "14:00 파트너사 미팅 준비",
    "중요 메일 답장 2건 처리",
    "Slack 브리핑 확인 및 일정 조정"
  ];

  return {
    todayEvents: events,
    unrepliedCount: unreplied.length,
    highPriorityCount: highPriority.length,
    top3: todayTop3,
    focusSuggestion: "13:20~13:50는 집중 답장 시간으로 확보하세요."
  };
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "ai-assistant-server" });
});

app.get("/api/calendar/events", (_req, res) => {
  res.json({ items: events });
});

app.post("/api/calendar/events", (req, res) => {
  const { title, start, end, attendees } = req.body as Partial<CalendarEvent>;
  if (!title || !start || !end) {
    return res.status(400).json({ message: "title, start, end are required" });
  }

  const conflicts = findConflicts(start, end);
  const item: CalendarEvent = {
    id: `ev-${Date.now()}`,
    title,
    start,
    end,
    attendees: attendees ?? []
  };
  events.push(item);

  return res.status(201).json({ item, conflicts });
});

app.get("/api/mail/inbox", (_req, res) => {
  const items = messages.map((m) => ({
    ...m,
    summary: summarize(m.body),
    translatedBody: m.language === "en" ? translateEnToKo(m.body) : m.body
  }));
  res.json({ items });
});

app.post("/api/mail/:id/reply-draft", (req, res) => {
  const mail = messages.find((m) => m.id === req.params.id);
  if (!mail) return res.status(404).json({ message: "mail not found" });

  const draft = {
    to: mail.from,
    subject: `Re: ${mail.subject}`,
    body: suggestReply(mail)
  };
  return res.json({ draft });
});

app.post("/api/mail/send", (req, res) => {
  const { to, subject, body } = req.body as { to?: string; subject?: string; body?: string };
  if (!to || !subject || !body) {
    return res.status(400).json({ message: "to, subject, body are required" });
  }

  sentMails.push({ to, subject, body, createdAt: new Date().toISOString() });
  const original = messages.find((m) => m.from === to && subject.includes(m.subject));
  if (original) original.replied = true;

  return res.status(201).json({ ok: true, sentCount: sentMails.length });
});

app.get("/api/assistant/brief", (_req, res) => {
  res.json(buildAssistantBrief());
});

app.post("/api/slack/daily-brief", (_req, res) => {
  const brief = buildAssistantBrief();
  const text = `오늘 일정 ${brief.todayEvents.length}건, 미응답 메일 ${brief.unrepliedCount}건입니다.`;
  return res.json({ ok: true, channel: "dm", text });
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
