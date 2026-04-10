import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  company: z.string().optional(),
  phone: z.string().optional(),
  service_interest: z.string().optional(),
  message: z.string().min(1, "Message is required"),
  source_page: z.string().optional(),
});

async function sendBrevoEmail({
  to,
  subject,
  htmlContent,
}: {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
}) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.warn("BREVO_API_KEY not set — skipping email");
    return;
  }

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: {
        name: "intelle.io",
        email: process.env.ADMIN_EMAIL || "contact@intelle.io",
      },
      to,
      subject,
      htmlContent,
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error("Brevo API error:", res.status, errorBody);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = contactSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const data = result.data;

    // Store in Supabase
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("contact_submissions")
      .insert(data);

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to save submission" },
        { status: 500 }
      );
    }

    // Send admin notification email
    const adminEmail = process.env.ADMIN_EMAIL || "contact@intelle.io";
    await sendBrevoEmail({
      to: [{ email: adminEmail, name: "intelle.io Team" }],
      subject: `New Contact: ${data.name}${data.company ? ` (${data.company})` : ""}`,
      htmlContent: `
        <h2>New Contact Form Submission</h2>
        <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Name</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.name}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Email</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><a href="mailto:${data.email}">${data.email}</a></td></tr>
          ${data.company ? `<tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Company</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.company}</td></tr>` : ""}
          ${data.phone ? `<tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Phone</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.phone}</td></tr>` : ""}
          ${data.service_interest ? `<tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Service Interest</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.service_interest}</td></tr>` : ""}
          <tr><td style="padding: 8px; font-weight: bold; vertical-align: top;">Message</td><td style="padding: 8px;">${data.message.replace(/\n/g, "<br>")}</td></tr>
        </table>
        <p style="margin-top: 16px; color: #666; font-size: 12px;">Submitted from ${data.source_page || "contact page"}</p>
      `,
    });

    // Send confirmation to the submitter
    await sendBrevoEmail({
      to: [{ email: data.email, name: data.name }],
      subject: "Thank you for contacting intelle.io",
      htmlContent: `
        <p>Dear ${data.name},</p>
        <p>Thank you for reaching out to intelle.io. We have received your message and will get back to you within 1-2 business days.</p>
        <p>In the meantime, feel free to explore our <a href="https://intelle.io/insights">latest insights</a> or learn more about our <a href="https://intelle.io/research">research services</a>.</p>
        <br>
        <p>Best regards,<br><strong>intelle.io Team</strong><br>SparkLab LLC | Dubai, UAE</p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Contact API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
