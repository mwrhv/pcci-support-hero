import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify the user is authenticated
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roles) {
      console.error('User is not admin');
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { importData } = await req.json();

    if (!importData || !importData.tables) {
      return new Response(
        JSON.stringify({ error: 'Invalid import data format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Importing database for admin user:', user.id);

    const results: any = {
      success: [],
      errors: []
    };

    // Import data in the correct order to respect foreign key constraints
    const importOrder = ['categories', 'sla_policies', 'assets', 'kb_articles', 
                         'tickets', 'ticket_updates', 'notifications', 'audit_logs'];

    for (const table of importOrder) {
      if (!importData.tables[table] || importData.tables[table].length === 0) {
        console.log(`Skipping ${table}: no data`);
        continue;
      }

      const { data, error } = await supabaseClient
        .from(table)
        .insert(importData.tables[table]);

      if (error) {
        console.error(`Error importing ${table}:`, error);
        results.errors.push({ table, error: error.message });
      } else {
        console.log(`Imported ${importData.tables[table].length} rows to ${table}`);
        results.success.push({ table, count: importData.tables[table].length });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        results,
        message: 'Database import completed'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in database-import function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
