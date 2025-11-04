-- =====================================================
-- Migration: Système de Gestion des Temps
-- Description: Tables pour pointage, congés, horaires
-- Date: 2024-10-28
-- =====================================================

-- =====================================================
-- 1. Table: time_entries (Pointages)
-- =====================================================
CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('clock_in', 'clock_out', 'break_start', 'break_end')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Géolocalisation (optionnel)
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  address TEXT,
  -- Informations appareil
  device_type VARCHAR(20) CHECK (device_type IN ('web', 'mobile', 'external')),
  device_id VARCHAR(255),
  ip_address INET,
  -- Notes et validation
  notes TEXT,
  validated BOOLEAN DEFAULT FALSE,
  validated_by UUID REFERENCES auth.users(id),
  validated_at TIMESTAMPTZ,
  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX idx_time_entries_timestamp ON time_entries(timestamp);
CREATE INDEX idx_time_entries_event_type ON time_entries(event_type);
CREATE INDEX idx_time_entries_date ON time_entries(DATE(timestamp));

-- =====================================================
-- 2. Table: work_sessions (Sessions de travail)
-- =====================================================
CREATE TABLE IF NOT EXISTS work_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clock_in_id UUID NOT NULL REFERENCES time_entries(id),
  clock_out_id UUID REFERENCES time_entries(id),
  date DATE NOT NULL,
  clock_in_time TIMESTAMPTZ NOT NULL,
  clock_out_time TIMESTAMPTZ,
  break_duration_minutes INTEGER DEFAULT 0,
  total_work_minutes INTEGER DEFAULT 0,
  overtime_minutes INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'incomplete')),
  validated BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_work_sessions_user_id ON work_sessions(user_id);
CREATE INDEX idx_work_sessions_date ON work_sessions(date);
CREATE INDEX idx_work_sessions_status ON work_sessions(status);

-- =====================================================
-- 3. Table: work_schedules (Horaires de travail)
-- =====================================================
CREATE TABLE IF NOT EXISTS work_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  schedule_type VARCHAR(20) DEFAULT 'fixed' CHECK (schedule_type IN ('fixed', 'flexible', 'shift')),
  -- Horaires par jour (format HH:MM)
  monday_start TIME,
  monday_end TIME,
  tuesday_start TIME,
  tuesday_end TIME,
  wednesday_start TIME,
  wednesday_end TIME,
  thursday_start TIME,
  thursday_end TIME,
  friday_start TIME,
  friday_end TIME,
  saturday_start TIME,
  saturday_end TIME,
  sunday_start TIME,
  sunday_end TIME,
  -- Configuration
  expected_hours_per_day DECIMAL(4, 2) DEFAULT 8.00,
  expected_hours_per_week DECIMAL(5, 2) DEFAULT 40.00,
  break_duration_minutes INTEGER DEFAULT 60,
  -- Période de validité
  effective_from DATE NOT NULL,
  effective_until DATE,
  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_work_schedules_user_id ON work_schedules(user_id);
CREATE INDEX idx_work_schedules_effective ON work_schedules(effective_from, effective_until);

-- =====================================================
-- 4. Table: leave_requests (Demandes de congé)
-- =====================================================
CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  leave_type VARCHAR(30) NOT NULL CHECK (leave_type IN ('paid_leave', 'sick_leave', 'unpaid_leave', 'rtt', 'other')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days DECIMAL(3, 1) NOT NULL,
  half_day BOOLEAN DEFAULT FALSE,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_leave_requests_user_id ON leave_requests(user_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
CREATE INDEX idx_leave_requests_dates ON leave_requests(start_date, end_date);

-- =====================================================
-- 5. Table: time_balances (Compteurs)
-- =====================================================
CREATE TABLE IF NOT EXISTS time_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  -- Congés payés
  paid_leave_total DECIMAL(4, 1) DEFAULT 25.0,
  paid_leave_taken DECIMAL(4, 1) DEFAULT 0.0,
  paid_leave_remaining DECIMAL(4, 1) DEFAULT 25.0,
  -- RTT
  rtt_total DECIMAL(3, 1) DEFAULT 0.0,
  rtt_taken DECIMAL(3, 1) DEFAULT 0.0,
  rtt_remaining DECIMAL(3, 1) DEFAULT 0.0,
  -- Heures supplémentaires
  overtime_accumulated_minutes INTEGER DEFAULT 0,
  overtime_paid_minutes INTEGER DEFAULT 0,
  overtime_remaining_minutes INTEGER DEFAULT 0,
  -- Congés maladie
  sick_leave_days_taken DECIMAL(4, 1) DEFAULT 0.0,
  -- Métadonnées
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, year)
);

-- Index
CREATE INDEX idx_time_balances_user_id ON time_balances(user_id);
CREATE INDEX idx_time_balances_year ON time_balances(year);

-- =====================================================
-- 6. Table: time_rules (Règles de temps)
-- =====================================================
CREATE TABLE IF NOT EXISTS time_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  rule_type VARCHAR(30) NOT NULL CHECK (rule_type IN ('overtime', 'break', 'weekly_limit', 'daily_limit', 'other')),
  -- Limites
  max_daily_hours DECIMAL(4, 2),
  max_weekly_hours DECIMAL(5, 2),
  min_break_minutes INTEGER,
  -- Heures supplémentaires
  overtime_threshold_daily DECIMAL(4, 2),
  overtime_threshold_weekly DECIMAL(5, 2),
  overtime_rate_percentage INTEGER DEFAULT 125, -- 125% = +25%
  -- Application
  applies_to_all BOOLEAN DEFAULT TRUE,
  department_ids TEXT[], -- Array de départements
  effective_from DATE NOT NULL,
  effective_until DATE,
  active BOOLEAN DEFAULT TRUE,
  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_time_rules_active ON time_rules(active);
CREATE INDEX idx_time_rules_effective ON time_rules(effective_from, effective_until);

-- =====================================================
-- 7. Fonctions et Triggers
-- =====================================================

-- Fonction: Mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour chaque table
CREATE TRIGGER update_time_entries_updated_at BEFORE UPDATE ON time_entries
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_sessions_updated_at BEFORE UPDATE ON work_sessions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_schedules_updated_at BEFORE UPDATE ON work_schedules
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON leave_requests
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_balances_updated_at BEFORE UPDATE ON time_balances
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_rules_updated_at BEFORE UPDATE ON time_rules
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. Politiques RLS (Row Level Security)
-- =====================================================

-- Activer RLS
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_rules ENABLE ROW LEVEL SECURITY;

-- time_entries: Utilisateurs voient leurs propres données
CREATE POLICY "Users can view own time entries"
  ON time_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own time entries"
  ON time_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Superviseurs/Admins voient tout
CREATE POLICY "Supervisors can view all time entries"
  ON time_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('supervisor', 'admin')
    )
  );

-- work_sessions: Mêmes règles
CREATE POLICY "Users can view own work sessions"
  ON work_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Supervisors can view all work sessions"
  ON work_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('supervisor', 'admin')
    )
  );

-- work_schedules: Utilisateurs voient leur horaire
CREATE POLICY "Users can view own work schedule"
  ON work_schedules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage work schedules"
  ON work_schedules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- leave_requests: Utilisateurs gèrent leurs demandes
CREATE POLICY "Users can manage own leave requests"
  ON leave_requests FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Supervisors can manage all leave requests"
  ON leave_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('supervisor', 'admin')
    )
  );

-- time_balances: Lecture pour tous, écriture admin
CREATE POLICY "Users can view own time balances"
  ON time_balances FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage time balances"
  ON time_balances FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- time_rules: Lecture pour tous, écriture admin
CREATE POLICY "Everyone can view active time rules"
  ON time_rules FOR SELECT
  USING (active = TRUE);

CREATE POLICY "Admins can manage time rules"
  ON time_rules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- =====================================================
-- 9. Données de test (optionnel)
-- =====================================================

-- Règle par défaut: 35h/semaine, 7h/jour
INSERT INTO time_rules (name, description, rule_type, max_daily_hours, max_weekly_hours, overtime_threshold_daily, overtime_threshold_weekly, effective_from)
VALUES (
  'Convention Collective Standard',
  'Règle standard: 35h/semaine, 7h/jour maximum',
  'weekly_limit',
  10.00,
  35.00,
  7.00,
  35.00,
  '2024-01-01'
) ON CONFLICT DO NOTHING;

-- =====================================================
-- FIN DE LA MIGRATION
-- =====================================================

-- Pour exécuter cette migration dans Supabase:
-- 1. Allez dans le SQL Editor de Supabase
-- 2. Copiez-collez tout ce script
-- 3. Cliquez sur "Run"
-- 4. Vérifiez que toutes les tables sont créées
