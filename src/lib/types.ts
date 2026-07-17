// Shapes returned by the FastAPI backend. Kept deliberately close to the
// engine's own dataclasses so the "why" list survives the trip verbatim.

export interface Reason {
  factor: string; // cert | skill | familiarity | performance | availability | promise | workload | specialty
  text: string;
  points: number;
}

export interface Candidate {
  technician_id: string;
  name: string;
  level: string;
  score: number;
  best_fit: boolean;
  confident: boolean;
  reasons: Reason[];
  warnings: string[];
  data_issues: string[];
  free_at: string | null;
  projected_finish: string | null;
  promise_margin_hours: number | null;
  projected_hours_today: number;
  familiarity_repairs: number;
}

export interface NotEligible {
  technician_id: string;
  name: string;
  level: string;
  code: string;
  reason: string;
}

export interface Ranking {
  ro_id: string;
  engine_version: string;
  weights: Record<string, number>;
  candidates: Candidate[];
  all_candidates: Candidate[];
  not_eligible: NotEligible[];
}

export interface ROLine {
  op_code: string | null;
  description: string;
  flagged_hours: number;
}

export interface BoardRO {
  id: string;
  ro_number: string;
  vin: string | null;
  vehicle_year: number | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  mileage: number | null;
  concern_category: string | null;
  work_type: string | null;
  tier: string | null;
  required_certs: string[];
  required_team: string | null;
  est_hours: number;
  written_at: string | null;
  promise_at: string | null;
  status: string;
  flags: string[];
  priority: string;
  is_flagged: boolean;
  lines: ROLine[];
  ranking: Ranking | null;
}

export interface Guardian {
  source_data_age_hours: number | null;
  staleness_threshold_hours: number;
  stale: boolean;
}

export interface Board {
  tabs: { key: string; label: string; count: number }[];
  active_tab: string;
  sorts: { key: string; label: string }[];
  active_sort: string;
  unassigned: number;
  available_techs: number;
  ros: BoardRO[];
  guardian: Guardian;
}

export interface SmartAssignment {
  ro_id: string;
  ro_number: string;
  technician_id: string;
  technician_name: string;
  score: number;
  rank: number;
  reasons: Reason[];
  warnings: string[];
  confident: boolean;
  projected_finish: string | null;
  promise_at: string | null;
  est_hours: number;
}

export interface SmartPlan {
  assignments: SmartAssignment[];
  unplaced: { ro_id: string; ro_number: string; reason: string }[];
  gain: {
    ros_assigned: number;
    ros_unplaced: number;
    hours_dispatched: number;
    promises_protected: number;
    promises_at_risk_before: number;
    promises_at_risk_after: number;
    idle_techs_before: number;
    idle_techs_after: number;
    idle_change_pct: number;
    workload_spread_before: number;
    workload_spread_after: number;
    avg_match_score: number;
  };
  engine_version: string;
}

export interface AvailableTech {
  id: string;
  name: string;
  team: string | null;
  skill_level: string | null;
  level_label: string;
  on_shift: boolean;
  active: boolean;
  idle: boolean;
  overloaded: boolean;
  assigned_hours: number;
  capacity_hours: number;
  overtime_threshold: number;
  free_at: string | null;
  shift_start: string | null;
  shift_end: string | null;
  certs: string[];
  current_ro: { id: string; ro_number: string; concern_category: string; est_hours: number } | null;
  efficiency_t90: number | null;
  efficiency_target: number | null;
  data_issues: string[];
}

export interface MetricValue {
  key: string;
  value: number | null;
  available: boolean;
  numerator: number | null;
  denominator: number | null;
  sample_size: number;
  issue: string | null;
  unit: string;
}

export interface Scorecard {
  technician_id: string;
  name: string;
  team: string | null;
  skill_level: string | null;
  period: string;
  metrics: Record<string, MetricValue>;
  ro_count: number;
  flagged_hours: number;
  clocked_hours: number;
  cp_flagged_hours: number;
  warranty_flagged_hours: number;
  internal_flagged_hours: number;
  qualifies_for_ranking: boolean;
  data_complete: boolean;
  data_issues: string[];
}

export interface Scoreboard {
  period: string;
  period_start: string;
  period_end: string;
  cards: Scorecard[];
  rankings: Record<string, Record<string, string[]>>;
  team_averages: Record<string, Record<string, number | null>>;
  metric_windows: Record<string, string[]>;
  source_data_age_hours: number | null;
  formulas: Record<string, string>;
  labels: Record<string, string>;
  lower_is_better: string[];
  gates: { min_ros_to_rank: number; min_flagged_hours_to_rank: number };
}

export interface Dashboard {
  open_ros: number;
  pending_authorization: number;
  waiting_on_parts: number;
  unassigned: number;
  in_progress: number;
  waiting_customers: number;
  heat_cases: number;
  comebacks: number;
  techs_on_shift: number;
  techs_idle: number;
  techs_overloaded: number;
  idle_technicians: { id: string; name: string; team: string | null }[];
  overloaded_technicians: { id: string; name: string; assigned_hours: number; capacity_hours: number }[];
  ros_at_risk: {
    id: string;
    ro_number: string;
    promise_at: string;
    hours_to_promise: number;
    est_hours: number;
    reason: string;
  }[];
  promise_total: number;
  promise_protected: number;
  promise_at_risk: number;
  hours_sold_today: number;
  capacity_hours_today: number;
  guardian: Guardian;
}

export interface Technician {
  id: string;
  name: string;
  employee_id: string | null;
  dms_tech_no: string | null;
  team: string | null;
  skill_level: string | null;
  active: boolean;
  shift_start: string | null;
  shift_end: string | null;
  work_days: string[];
  lunch_start: string | null;
  lunch_end: string | null;
  max_daily_hours: number | null;
  overtime_threshold: number | null;
  efficiency_target: number | null;
  productivity_target: number | null;
  certs: { cert_type: string; level: string | null; expires_on: string | null }[];
  restrictions: string[];
  specialties: { work_type: string | null; vehicle_specialty: string | null }[];
  missing_fields: string[];
  completeness_pct: number;
}

export interface TechOptions {
  teams: string[];
  skill_levels: string[];
  cert_types: string[];
  work_types: string[];
  work_days: string[];
}

export interface Dealer {
  id: string;
  name: string;
  timezone: string;
}
