export interface User {
  id: number;
  email: string;
  name: string;
  created_at: string;
}

export interface Extension {
  id: number;
  task_id: number;
  extended_by_days: number;
  raw_reason?: string;
  raw_transcription?: string;
  ai_tag?: string; // Technical Blocker, Underestimated Effort, External Dependency, Scope Creep, Personal
  ai_reflection?: string;
  severity?: number; // 1, 2, 3
  input_method: 'voice' | 'text';
  timestamp: string;
}

export interface ScheduleBlock {
  start: string; // Format: "YYYY-MM-DD HH:MM"
  end: string;   // Format: "YYYY-MM-DD HH:MM"
  label: string;
}

export interface ScheduleSuggestion {
  id: number;
  task_id: number;
  suggested_blocks: ScheduleBlock[];
  generated_at: string;
  auto_triggered: boolean;
}

export interface InterventionLog {
  id: number;
  user_id: number;
  task_id?: number;
  intervention_type: string; // zero_subtasks, high_drift, many_extensions
  message: string;
  dismissed: boolean;
  created_at: string;
}

export interface Task {
  id: number;
  user_id: number;
  title: string;
  description?: string;
  category: string;
  original_deadline: string;
  current_deadline: string;
  status: 'active' | 'completed' | 'overdue';
  drift_score: number;
  drift_explanation?: string;
  created_at: string;
  extensions?: Extension[];
  extension_count?: number;
  schedule_suggestions?: ScheduleSuggestion[];
}

export interface InsightsMetrics {
  total_tasks: number;
  completion_rate: number;
  average_drift_score: number;
  most_common_tag: string;
  total_extensions: number;
  longest_streak: number;
}

export interface TagCount {
  tag: string;
  count: number;
}

export interface DriftPoint {
  date: string;
  avg_drift_score: number;
}

export interface CategoryStats {
  category: string;
  task_count: number;
  extension_rate: number;
  avg_extensions: number;
}

export interface HallOfFameTask {
  id: number;
  title: string;
  extension_count: number;
  tags: string[];
}

export interface InsightsOut {
  metrics: InsightsMetrics;
  tag_distribution: TagCount[];
  drift_over_time: DriftPoint[];
  category_breakdown: CategoryStats[];
  hall_of_fame: HallOfFameTask[];
}
