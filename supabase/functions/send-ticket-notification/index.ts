import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: "ticket_created" | "ticket_assigned" | "ticket_updated" | "ticket_resolved";
  ticketId: string;
  ticketCode: string;
  ticketTitle: string;
  recipientEmail: string;
  recipientName: string;
  additionalInfo?: {
    assigneeName?: string;
    previousStatus?: string;
    newStatus?: string;
    comment?: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error("Authentication error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const notification: NotificationRequest = await req.json();
    console.log("Processing notification:", notification);

    let subject = "";
    let htmlContent = "";

    switch (notification.type) {
      case "ticket_created":
        subject = `Nouveau ticket créé: ${notification.ticketCode}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Nouveau ticket créé</h2>
            <p>Bonjour ${notification.recipientName},</p>
            <p>Un nouveau ticket a été créé avec succès.</p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Code du ticket:</strong> ${notification.ticketCode}</p>
              <p><strong>Titre:</strong> ${notification.ticketTitle}</p>
            </div>
            <p>Vous pouvez suivre l'évolution de votre ticket dans votre espace personnel.</p>
            <p>Cordialement,<br>L'équipe Support</p>
          </div>
        `;
        break;

      case "ticket_assigned":
        subject = `Ticket assigné: ${notification.ticketCode}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Nouveau ticket assigné</h2>
            <p>Bonjour ${notification.recipientName},</p>
            <p>Un ticket vous a été assigné.</p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Code du ticket:</strong> ${notification.ticketCode}</p>
              <p><strong>Titre:</strong> ${notification.ticketTitle}</p>
            </div>
            <p>Veuillez consulter les détails du ticket et commencer à le traiter.</p>
            <p>Cordialement,<br>L'équipe Support</p>
          </div>
        `;
        break;

      case "ticket_updated":
        subject = `Mise à jour du ticket: ${notification.ticketCode}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Mise à jour du ticket</h2>
            <p>Bonjour ${notification.recipientName},</p>
            <p>Votre ticket a été mis à jour.</p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Code du ticket:</strong> ${notification.ticketCode}</p>
              <p><strong>Titre:</strong> ${notification.ticketTitle}</p>
              ${notification.additionalInfo?.previousStatus && notification.additionalInfo?.newStatus ? 
                `<p><strong>Statut:</strong> ${notification.additionalInfo.previousStatus} → ${notification.additionalInfo.newStatus}</p>` : ''}
              ${notification.additionalInfo?.comment ? 
                `<p><strong>Commentaire:</strong> ${notification.additionalInfo.comment}</p>` : ''}
            </div>
            <p>Vous pouvez consulter les détails complets dans votre espace personnel.</p>
            <p>Cordialement,<br>L'équipe Support</p>
          </div>
        `;
        break;

      case "ticket_resolved":
        subject = `Ticket résolu: ${notification.ticketCode}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #16a34a;">Ticket résolu</h2>
            <p>Bonjour ${notification.recipientName},</p>
            <p>Votre ticket a été résolu avec succès.</p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Code du ticket:</strong> ${notification.ticketCode}</p>
              <p><strong>Titre:</strong> ${notification.ticketTitle}</p>
            </div>
            <p>Si vous avez d'autres questions ou si le problème persiste, n'hésitez pas à nous contacter.</p>
            <p>Cordialement,<br>L'équipe Support</p>
          </div>
        `;
        break;
    }

    const emailResponse = await resend.emails.send({
      from: "Support PCCI <onboarding@resend.dev>",
      to: [notification.recipientEmail],
      subject: subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-ticket-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
