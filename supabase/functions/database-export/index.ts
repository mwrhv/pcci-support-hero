import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Encrypt data with password using AES-GCM
async function encryptData(data: string, password: string): Promise<{ encrypted: string; iv: string; salt: string }> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  // Derive key from password
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt']
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encryptedData = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    encoder.encode(data)
  );

  return {
    encrypted: btoa(String.fromCharCode(...new Uint8Array(encryptedData))),
    iv: btoa(String.fromCharCode(...iv)),
    salt: btoa(String.fromCharCode(...salt)),
  };
}

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

    // Get password from request body
    const { password } = await req.json();
    
    if (!password || password.length < 8) {
      return new Response(
        JSON.stringify({ error: 'Password is required and must be at least 8 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Exporting database for admin user:', user.id);

    // Export all tables data
    const tables = ['profiles', 'user_roles', 'tickets', 'ticket_updates', 'categories', 
                    'assets', 'sla_policies', 'kb_articles', 'notifications', 'audit_logs'];
    
    const exportData: any = {
      export_date: new Date().toISOString(),
      tables: {}
    };

    for (const table of tables) {
      const { data, error } = await supabaseClient
        .from(table)
        .select('*');

      if (error) {
        console.error(`Error exporting ${table}:`, error);
        continue;
      }

      exportData.tables[table] = data;
      console.log(`Exported ${data?.length || 0} rows from ${table}`);
    }

    // Encrypt the export data
    const dataString = JSON.stringify(exportData);
    const encrypted = await encryptData(dataString, password);
    
    console.log('Data encrypted successfully');

    return new Response(
      JSON.stringify({
        version: '1.0',
        encrypted: true,
        data: encrypted.encrypted,
        iv: encrypted.iv,
        salt: encrypted.salt,
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="database-export-encrypted-${new Date().toISOString()}.json"`
        } 
      }
    );

  } catch (error: any) {
    console.error('Error in database-export function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
