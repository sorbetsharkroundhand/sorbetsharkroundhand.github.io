export const homeSubjects = [
  { label: 'Statistics', slug: 'statistics' },
  { label: 'Machine Learning', slug: 'machine-learning' },
  { label: 'Deep Learning', slug: 'deep-learning' },
  { label: 'Mathematics', slug: 'mathematics' },
  { label: 'Visualization', slug: 'visualization' },
] as const;

const granularTopicLabels: Record<string, string> = {
  'least-squares': '최소제곱법',
  'linear-regression': '선형회귀',
};

export function getTopicLabel(topic: string): string {
  return homeSubjects.find((subject) => subject.slug === topic)?.label
    ?? granularTopicLabels[topic]
    ?? topic;
}
