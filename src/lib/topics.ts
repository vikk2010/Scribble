/**
 * Group topics: each has an emoji and a cover gradient. Both gradient stops
 * keep white text at 4.5:1 or better (WCAG 2.1 AA); ratios are noted per topic.
 */
export const TOPICS = {
  sports: { label: "Sports", emoji: "⚽", from: "#15803d", to: "#0f766e" }, // 5.02 / 5.47
  tech: { label: "Tech", emoji: "💻", from: "#1d4ed8", to: "#6d28d9" }, // 6.70 / 7.10
  food: { label: "Food", emoji: "🍛", from: "#c2410c", to: "#b91c1c" }, // 5.18 / 6.47
  travel: { label: "Travel", emoji: "✈️", from: "#0369a1", to: "#0e7490" }, // 5.93 / 5.36
  fitness: { label: "Fitness", emoji: "🏃", from: "#be123c", to: "#9d174d" }, // 6.29 / 7.88
  arts: { label: "Arts", emoji: "🎨", from: "#a21caf", to: "#7e22ce" }, // 6.32 / 6.98
  music: { label: "Music", emoji: "🎵", from: "#4338ca", to: "#be185d" }, // 7.90 / 6.04
  photography: { label: "Photography", emoji: "📸", from: "#334155", to: "#0f172a" }, // 10.35 / 17.85
  local: { label: "Local", emoji: "📍", from: "#b45309", to: "#047857" }, // 5.02 / 5.48
  other: { label: "Community", emoji: "💬", from: "#c2410c", to: "#be123c" }, // 5.18 / 6.29
} as const;

export type Topic = keyof typeof TOPICS;
export const TOPIC_KEYS = Object.keys(TOPICS) as Topic[];

export function isTopic(value: unknown): value is Topic {
  return typeof value === "string" && value in TOPICS;
}

const KEYWORDS: [Topic, RegExp][] = [
  ["sports", /football|soccer|cricket|basketball|tennis|badminton|kabaddi|hockey|sport|match/i],
  ["fitness", /run|yoga|gym|fitness|cycl|marathon|workout|trek|hik/i],
  ["tech", /develop|code|coding|program|tech|web|software|ai\b|startup|design/i],
  ["food", /food|cook|recipe|chef|dosa|biryani|cafe|coffee|baking|foodie/i],
  ["travel", /travel|trip|backpack|tour|road|beach|wander/i],
  ["photography", /photo|camera|shot|film/i],
  ["music", /music|band|sing|guitar|song|dj|concert/i],
  ["arts", /art|paint|draw|sketch|craft|dance|book|writ|poetry/i],
  ["local", /neighbour|neighbor|society|city|local|mumbai|delhi|bangalore|bengaluru|pune|chennai|kolkata|hyderabad/i],
];

/** The group's chosen topic, or a best guess from its name and description. */
export function topicOf(group: { topic?: string | null; name: string; description: string }): Topic {
  if (isTopic(group.topic)) return group.topic;
  const text = `${group.name} ${group.description}`;
  return KEYWORDS.find(([, re]) => re.test(text))?.[0] ?? "other";
}

export function coverStyle(topic: Topic): React.CSSProperties {
  const t = TOPICS[topic];
  return { backgroundImage: `linear-gradient(135deg, ${t.from}, ${t.to})` };
}
