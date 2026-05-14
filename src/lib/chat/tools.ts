import type Anthropic from "@anthropic-ai/sdk";

/**
 * Anthropic tool definitions for Iris.
 *
 * - `navigate_to_page` and `book_meeting` are "client-rendered" tools: the
 *   server emits the tool_use block to the client unchanged, and the widget
 *   renders it as a button. They have no server-side execution.
 * - `capture_email` IS executed server-side — it writes a lead row into the
 *   contact_submissions table and emails Arnab via Brevo (same pipeline as
 *   the /contact form). The tool result is then fed back to Claude so it can
 *   confirm the capture in its next turn.
 */
export const IRIS_TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: "navigate_to_page",
    description:
      "Suggest a specific intelle.io page for the visitor to read. Use this after answering a question that has a deeper page on the site — e.g., 'we cover X' → navigate them to the X service page. Don't use this for the home page; the visitor is already on the site.",
    input_schema: {
      type: "object",
      properties: {
        href: {
          type: "string",
          description:
            "Internal path starting with /. Must be a real page from the knowledge base (e.g., /engineering/knowledge-management-strategy, /research/energy, /industries/oil-gas, /insights, /about).",
        },
        label: {
          type: "string",
          description:
            "Short button label, e.g., 'See KM Strategy advisory' or 'Read about Oil & Gas'. Keep under 40 characters.",
        },
        reason: {
          type: "string",
          description:
            "One short sentence explaining why this page is relevant to what the visitor asked. Shown as helper text under the button.",
        },
      },
      required: ["href", "label", "reason"],
    },
  },
  {
    name: "book_meeting",
    description:
      "Offer the visitor a free 30-minute discovery call with our Senior Practitioner. Use this when the visitor signals readiness ('we'd like to talk', 'how do we start', 'can we set up a call'), or after a substantive Q&A when a conversation would be the natural next step. The widget will render a 'Book a Discovery Call' button that takes them to the booking page. NEVER refer to the Senior Practitioner by a personal name.",
    input_schema: {
      type: "object",
      properties: {
        context: {
          type: "string",
          description:
            "One short sentence summarising what the visitor wants to discuss, so the booking page can pre-fill the topic. E.g., 'GenAI KM pilot for an upstream NOC'.",
        },
      },
      required: ["context"],
    },
  },
  {
    name: "capture_email",
    description:
      "Capture the visitor's email so our Senior Practitioner can follow up. Use this when (a) the visitor isn't ready to book but wants to stay in touch, (b) they've asked for something to be sent (sample report, proposal, more info), or (c) they've volunteered their email unprompted. Always confirm the email back to the visitor after capturing. The capture writes a lead into the intelle.io CRM and emails the Senior Practitioner immediately.",
    input_schema: {
      type: "object",
      properties: {
        email: {
          type: "string",
          description: "The visitor's email address. Must be a valid email format.",
        },
        name: {
          type: "string",
          description:
            "The visitor's name if they've shared it. Omit if unknown — don't fabricate.",
        },
        company: {
          type: "string",
          description:
            "The visitor's company if they've shared it. Omit if unknown — don't fabricate.",
        },
        context: {
          type: "string",
          description:
            "Short summary of what the visitor asked about and what follow-up they want. E.g., 'Asked about KM maturity assessment; wants a sample scoping doc.'",
        },
      },
      required: ["email", "context"],
    },
  },
];

export type NavigateToPageInput = {
  href: string;
  label: string;
  reason: string;
};

export type BookMeetingInput = {
  context: string;
};

export type CaptureEmailInput = {
  email: string;
  name?: string;
  company?: string;
  context: string;
};
