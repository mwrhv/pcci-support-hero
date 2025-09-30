-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create enum types
CREATE TYPE app_role AS ENUM ('agent', 'supervisor', 'admin');
CREATE TYPE priority_level AS ENUM ('Low', 'Medium', 'High', 'Critical');
CREATE TYPE ticket_status AS ENUM ('New', 'Triaged', 'In_Progress', 'Pending_User', 'Pending_ThirdParty', 'Resolved', 'Closed', 'Canceled');
CREATE TYPE notification_channel AS ENUM ('email', 'inapp');
CREATE TYPE kb_visibility AS ENUM ('agent', 'all');
CREATE TYPE asset_status AS ENUM ('Active', 'Maintenance', 'Retired');
CREATE TYPE update_type AS ENUM ('comment', 'status_change', 'assignment', 'priority_change');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role app_role NOT NULL DEFAULT 'agent',
  department TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create SLA policies table
CREATE TABLE public.sla_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  response_time_minutes INTEGER NOT NULL,
  resolve_time_minutes INTEGER NOT NULL,
  business_hours BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create categories table (hierarchical)
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create assets table
CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tag TEXT NOT NULL UNIQUE,
  serial TEXT,
  model TEXT NOT NULL,
  location TEXT,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status asset_status NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create tickets table
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  priority priority_level NOT NULL DEFAULT 'Medium',
  status ticket_status NOT NULL DEFAULT 'New',
  sla_policy_id UUID REFERENCES public.sla_policies(id) ON DELETE SET NULL,
  due_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create ticket updates table (audit timeline)
CREATE TABLE public.ticket_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  type update_type NOT NULL,
  body TEXT,
  from_value TEXT,
  to_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create knowledge base articles table
CREATE TABLE public.kb_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  body_md TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  visibility kb_visibility NOT NULL DEFAULT 'agent',
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel notification_channel NOT NULL DEFAULT 'inapp',
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create audit log table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_tickets_priority ON public.tickets(priority);
CREATE INDEX idx_tickets_assignee ON public.tickets(assignee_id);
CREATE INDEX idx_tickets_due_at ON public.tickets(due_at);
CREATE INDEX idx_tickets_requester ON public.tickets(requester_id);
CREATE INDEX idx_ticket_updates_ticket ON public.ticket_updates(ticket_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_tickets_code_trgm ON public.tickets USING gin (code gin_trgm_ops);
CREATE INDEX idx_tickets_title_trgm ON public.tickets USING gin (title gin_trgm_ops);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kb_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create security definer functions for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND role = _role AND is_active = true
  )
$$;

CREATE OR REPLACE FUNCTION public.is_supervisor_or_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND role IN ('supervisor', 'admin') AND is_active = true
  )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view all active profiles"
  ON public.profiles FOR SELECT
  USING (is_active = true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can manage all profiles"
  ON public.profiles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for tickets
CREATE POLICY "Users can view their tickets"
  ON public.tickets FOR SELECT
  USING (
    auth.uid() = requester_id 
    OR auth.uid() = assignee_id 
    OR public.is_supervisor_or_admin(auth.uid())
  );

CREATE POLICY "Agents can create tickets"
  ON public.tickets FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Assigned agents can update their tickets"
  ON public.tickets FOR UPDATE
  USING (auth.uid() = assignee_id OR public.is_supervisor_or_admin(auth.uid()))
  WITH CHECK (auth.uid() = assignee_id OR public.is_supervisor_or_admin(auth.uid()));

-- RLS Policies for ticket updates
CREATE POLICY "Users can view updates for accessible tickets"
  ON public.ticket_updates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tickets
      WHERE id = ticket_id
        AND (requester_id = auth.uid() OR assignee_id = auth.uid() OR public.is_supervisor_or_admin(auth.uid()))
    )
  );

CREATE POLICY "Users can create updates on accessible tickets"
  ON public.ticket_updates FOR INSERT
  WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (
      SELECT 1 FROM public.tickets
      WHERE id = ticket_id
        AND (requester_id = auth.uid() OR assignee_id = auth.uid() OR public.is_supervisor_or_admin(auth.uid()))
    )
  );

-- RLS Policies for categories
CREATE POLICY "Everyone can view categories"
  ON public.categories FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage categories"
  ON public.categories FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for SLA policies
CREATE POLICY "Everyone can view SLA policies"
  ON public.sla_policies FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage SLA policies"
  ON public.sla_policies FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for assets
CREATE POLICY "Users can view all assets"
  ON public.assets FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage assets"
  ON public.assets FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for KB articles
CREATE POLICY "Users can view visible KB articles"
  ON public.kb_articles FOR SELECT
  USING (visibility = 'all' OR (visibility = 'agent' AND auth.uid() IS NOT NULL));

CREATE POLICY "Supervisors and admins can manage KB articles"
  ON public.kb_articles FOR ALL
  USING (public.is_supervisor_or_admin(auth.uid()))
  WITH CHECK (public.is_supervisor_or_admin(auth.uid()));

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for audit logs
CREATE POLICY "Supervisors and admins can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.is_supervisor_or_admin(auth.uid()));

-- Create function to generate ticket code
CREATE OR REPLACE FUNCTION public.generate_ticket_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  year_month TEXT;
  sequence_num INTEGER;
  new_code TEXT;
BEGIN
  year_month := TO_CHAR(now(), 'YYYYMM');
  
  -- Get the next sequence number for this month
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(code FROM 'HD-[0-9]{6}-([0-9]{4})') AS INTEGER)
  ), 0) + 1
  INTO sequence_num
  FROM public.tickets
  WHERE code LIKE 'HD-' || year_month || '-%';
  
  new_code := 'HD-' || year_month || '-' || LPAD(sequence_num::TEXT, 4, '0');
  
  RETURN new_code;
END;
$$;

-- Create trigger to auto-generate ticket code
CREATE OR REPLACE FUNCTION public.set_ticket_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := public.generate_ticket_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_ticket_code
  BEFORE INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_ticket_code();

-- Create function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    'agent'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sla_policies_updated_at BEFORE UPDATE ON public.sla_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_kb_articles_updated_at BEFORE UPDATE ON public.kb_articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert seed data
-- SLA Policies
INSERT INTO public.sla_policies (name, response_time_minutes, resolve_time_minutes, business_hours) VALUES
  ('Standard', 240, 2880, true),
  ('Priority', 60, 480, true);

-- Categories
INSERT INTO public.categories (name, description) VALUES
  ('Matériel', 'Problèmes de matériel informatique'),
  ('Logiciel', 'Problèmes logiciels et applications'),
  ('Réseau', 'Problèmes de connectivité réseau'),
  ('Accès', 'Problèmes d''accès et permissions'),
  ('Autre', 'Autres demandes');