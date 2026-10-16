const openAiService = require('./OpenAiInvoiceService');
const emailService = require('./emailService');
const db = require('../database/db');

/**
 * Service: AiChatSupportService
 * AI-powered customer & employee support assistant for Quontriz Invoza.
 * Supports:
 * - OpenAI GPT-4o / GPT-4o-mini conversational support
 * - Smart retail supermarket domain fallback if OpenAI quota is exhausted
 * - Issue resolution tracking
 * - Automatic & manual escalation via email to support@supermarket.com
 */
class AiChatSupportService {
  constructor() {
    this.supportEmail = 'support@supermarket.com';
  }

  /**
   * System Prompt with complete domain knowledge of Quontriz Invoza
   */
  getSystemPrompt(user = {}) {
    const role = user.role || 'user';
    const name = user.name || 'Valued User';

    return `You are "Invoza Assistant", an intelligent AI customer support assistant built for "Quontriz Invoza", a retail supermarket invoice processing & financial management platform.

Current User: ${name} (Role: ${role.toUpperCase()})
Support Escalation Email: support@supermarket.com

Your Knowledge Base:
1. Roles & Permissions:
   - STORE OWNER (Full Access): Can view spend analytics & KPIs, approve/reject pending invoices, record vendor bill payments (UPI, Bank Transfer NEFT/RTGS, Company Card, Cash, Cheque), manage vendors, create/manage Owner and Staff accounts, change system settings.
   - STORE STAFF (Upload & Requisition): Can upload invoice PDFs/photos, manually enter supplier bills, review OCR line items, view own invoice uploads, and submit stock requisitions to store owners under "Required Items". Cannot approve payments or edit store settings.
2. Invoices & Intake:
   - Supports Digital PDFs, pure scanned PDFs, paper receipts, and mobile photos (JPG, PNG, WEBP).
   - Automatic OCR via Tesseract and AI multimodal extraction (GPT-4o Vision).
   - Extracts: Vendor Name, GSTIN, Invoice #, Date, Due Date, PO #, Line Items (Item Name, SKU, HSN, Quantity, Unit, Price, GST rate, CGST, SGST, IGST, Line Total).
   - "Human-in-the-Loop": Uploads enter Review mode first so users can edit any field before saving.
   - Saves into "Pending Approval" status until Store Owner records payment.
3. GST Arithmetic:
   - Intra-state (same state): Split evenly into CGST + SGST (e.g. 18% = 9% CGST + 9% SGST).
   - Inter-state (different state): Applied as IGST (e.g. 18% IGST).
4. Store Requirements (Stock Requisitions):
   - Staff submit requests for supermarket shelves when stock runs low.
   - Owner receives notifications, reviews, and fulfills items when orders are placed.
5. Escalation Rule:
   - If a user's question cannot be resolved, or if they encounter a technical error, bug, payment dispute, or explicitly ask to talk to human support, provide a helpful answer AND proactively let them know they can click the "Send to Support" button to escalate the ticket directly to support@supermarket.com.

Tone: Helpful, polite, professional, concise, retail-focused. Use bullet points for steps.`;
  }

  /**
   * Intelligent Rule-based and Keyword Fallback Engine
   * Activated if OpenAI key has insufficient quota or network issue
   */
  getFallbackResponse(userMessage, user = {}) {
    const msg = (userMessage || '').toLowerCase();
    const isOwner = user?.role === 'owner';

    // 1. Escalation / Human Help
    if (
      msg.includes('not resolve') ||
      msg.includes('did not resolve') ||
      msg.includes('human') ||
      msg.includes('support@') ||
      msg.includes('agent') ||
      msg.includes('contact support') ||
      msg.includes('escalat') ||
      msg.includes('complaint')
    ) {
      return {
        reply: `I understand your issue requires direct assistance. You can click the **"Escalate to support@supermarket.com"** button below to immediately send a support ticket with your details and issue summary to our dedicated support team at **support@supermarket.com**. Our operations desk will get back to you promptly!`,
        suggestEscalation: true
      };
    }

    // 2. Invoice Upload & OCR
    if (msg.includes('upload') || msg.includes('ocr') || msg.includes('pdf') || msg.includes('image') || msg.includes('scan')) {
      return {
        reply: `### How to Upload & Process Invoices:\n1. Click **"Upload / Manual Entry"** in the navigation bar.\n2. Drag & drop your supplier invoice (PDF file or mobile photo up to 15 MB) or click to browse.\n3. The system runs **AI Multimodal OCR** to extract the Vendor, Invoice #, Date, GSTIN, and individual line items.\n4. You will be taken to the **Invoice Review** screen where you can verify prices, units, and tax rates before saving.\n5. Click **"Save Invoice"** to queue it for owner payment approval.\n\n*Did this answer resolve your question? If not, you can escalate below.*`,
        suggestEscalation: false
      };
    }

    // 3. Approval & Payments (Owner only)
    if (msg.includes('approve') || msg.includes('pay') || msg.includes('payment') || msg.includes('upi') || msg.includes('bank')) {
      return {
        reply: `### Invoice Approval & Payment Workflow:\n- **Staff uploads**: Stored as \`Pending Approval\`.\n- **Store Owner Approval**: Navigate to **"Invoices"**, click the pending bill, then click the green **"Approve & Pay"** button.\n- **Payment Modes**: You can record payments via **UPI**, **Bank Transfer (NEFT/RTGS)**, **Company Card**, **Cash**, or **Cheque** with the transaction reference ID.\n- Once recorded, the invoice status changes to **Paid** and spend analytics update in real time on your Dashboard.`,
        suggestEscalation: false
      };
    }

    // 4. Required Items / Stock Requisitions
    if (msg.includes('require') || msg.includes('stock') || msg.includes('item') || msg.includes('shortage')) {
      return {
        reply: `### Store Requirements & Stock Requisitions:\n- When supermarket shelves run low, staff can open **"Required Items"** and click **"+ Request Item"**.\n- Specify item name, quantity, unit (bags, boxes, kg, pcs), and priority (High, Medium, Urgent).\n- Store Owners receive an instant notification in the Top Navigation bar and can mark items as **Fulfilled** once purchased from suppliers.`,
        suggestEscalation: false
      };
    }

    // 5. Account creation / Passwords
    if (msg.includes('password') || msg.includes('create account') || msg.includes('staff') || msg.includes('owner account') || msg.includes('team')) {
      return {
        reply: `### Team Management & Passwords:\n- **Store Owners** can create new staff or owner accounts in **"Team & Staff"**.\n- Default passwords are set to \`staff@123\` or \`owner@123\` with a toggleable eye symbol for verification.\n- Users can change their password anytime via the **Change Password** option in **Settings**.`,
        suggestEscalation: false
      };
    }

    // 6. GST and Taxes
    if (msg.includes('gst') || msg.includes('tax') || msg.includes('cgst') || msg.includes('sgst') || msg.includes('igst')) {
      return {
        reply: `### GST Tax Arithmetic in Quontriz Invoza:\n- **Intra-State**: Invoices where supplier state matches store state split GST equally between **CGST** and **SGST** (e.g. 18% GST = 9% CGST + 9% SGST).\n- **Inter-State**: Billed from another state applies **IGST** directly (e.g. 18% IGST).\n- The review screen calculates taxable value, tax components, round-off, and grand total automatically with 100% precision.`,
        suggestEscalation: false
      };
    }

    // 7. General Fallback
    return {
      reply: `Hello! I'm your Quontriz Invoza AI assistant. I can help you with:\n- **Uploading & reviewing supplier invoices** (PDFs/Images)\n- **Owner approval & recording payments** (UPI/Card/Bank/Cash)\n- **Store stock requirements & staff requisitions**\n- **GST tax calculations & vendor management**\n\nIf your issue is specific or not resolved, please let me know or click **"Escalate to support@supermarket.com"** to email our team directly!`,
      suggestEscalation: false
    };
  }

  /**
   * Main Chat Dispatcher
   */
  async processChatMessage({ messages = [], context = {}, user = {} }) {
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content || '';

    // Check if user requested human escalation directly
    const userWantsEscalation = /not\s+resolv|didn't\s+resolv|support@|talk\s+to\s+human|contact\s+support|escalat/i.test(lastUserMessage);

    // 1. Try OpenAI API if configured
    if (openAiService.isConfigured()) {
      try {
        const apiKey = openAiService.apiKey;
        const systemMessage = {
          role: 'system',
          content: this.getSystemPrompt(user)
        };

        const trimmedHistory = messages.slice(-8).map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: String(m.content || '').slice(0, 1500)
        }));

        const response = await fetch(openAiService.apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [systemMessage, ...trimmedHistory],
            max_tokens: 600,
            temperature: 0.4
          })
        });

        const data = await response.json();

        if (response.ok && data.choices && data.choices[0]?.message?.content) {
          const reply = data.choices[0].message.content;
          return {
            reply,
            source: 'openai-gpt-4o',
            suggestEscalation: userWantsEscalation || /support@supermarket\.com|escalat/i.test(reply)
          };
        } else {
          console.warn('[AiChatSupport] OpenAI API note:', data?.error?.message || 'Fallback to retail engine');
        }
      } catch (err) {
        console.warn('[AiChatSupport] OpenAI fetch exception:', err.message);
      }
    }

    // 2. Intelligent Retail Support Engine Fallback
    const fallback = this.getFallbackResponse(lastUserMessage, user);
    return {
      reply: fallback.reply,
      source: 'retail-ai-engine',
      suggestEscalation: userWantsEscalation || fallback.suggestEscalation
    };
  }

  /**
   * Escalate Ticket directly to support@supermarket.com
   */
  async escalateToSupport({ userEmail, userName, userRole, issue, messages = [], subject }) {
    const ticketId = `TKT-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const finalSubject = subject || `[Support Ticket #${ticketId}] Help Request from ${userName || 'User'}`;
    const cleanUserEmail = userEmail || 'user@supermarket.com';

    // Format chat transcript
    const transcriptHtml = messages
      .slice(-10)
      .map(
        m => `
          <div style="margin-bottom: 8px; padding: 8px 12px; border-radius: 8px; background: ${
            m.role === 'user' ? '#eff6ff' : '#f8fafc'
          }; border: 1px solid ${m.role === 'user' ? '#bfdbfe' : '#e2e8f0'};">
            <strong style="color: ${m.role === 'user' ? '#1d4ed8' : '#334155'};">${
          m.role === 'user' ? (userName || 'User') : 'AI Assistant'
        }:</strong>
            <p style="margin: 4px 0 0; color: #1e293b; font-size: 13px; line-height: 1.4;">${String(m.content || '').replace(/\n/g, '<br/>')}</p>
          </div>
        `
      )
      .join('');

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 650px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); padding: 24px; color: #ffffff;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">Quontriz Invoza Support Desk</h2>
          <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.9;">New Escalated User Ticket #${ticketId}</p>
        </div>

        <!-- Body -->
        <div style="padding: 24px;">
          <div style="background: #f1f5f9; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr>
                <td style="padding: 4px 0; color: #64748b; width: 120px;"><strong>Ticket ID:</strong></td>
                <td style="padding: 4px 0; color: #0f172a; font-weight: bold;">${ticketId}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #64748b;"><strong>User Name:</strong></td>
                <td style="padding: 4px 0; color: #0f172a;">${userName || 'Anonymous User'}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #64748b;"><strong>User Email:</strong></td>
                <td style="padding: 4px 0; color: #2563eb; font-weight: bold;"><a href="mailto:${cleanUserEmail}" style="color: #2563eb; text-decoration: none;">${cleanUserEmail}</a></td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #64748b;"><strong>System Role:</strong></td>
                <td style="padding: 4px 0; color: #0f172a; text-transform: uppercase; font-weight: bold;">${userRole || 'Staff'}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #64748b;"><strong>Escalated At:</strong></td>
                <td style="padding: 4px 0; color: #0f172a;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (IST)</td>
              </tr>
            </table>
          </div>

          <!-- Issue Summary -->
          <div style="margin-bottom: 20px;">
            <h3 style="margin: 0 0 8px; font-size: 14px; color: #0f172a; font-weight: 700;">Issue Description:</h3>
            <div style="background: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 8px; font-size: 13px; color: #92400e;">
              ${issue || 'User marked their AI support inquiry as unresolved and requested human assistance.'}
            </div>
          </div>

          <!-- Chat Transcript -->
          ${
            transcriptHtml
              ? `
            <div style="margin-bottom: 20px;">
              <h3 style="margin: 0 0 10px; font-size: 14px; color: #0f172a; font-weight: 700;">Recent Conversation Transcript:</h3>
              <div style="max-height: 300px; overflow-y: auto; border: 1px solid #f1f5f9; padding: 12px; border-radius: 8px;">
                ${transcriptHtml}
              </div>
            </div>
          `
              : ''
          }

          <!-- Actions -->
          <div style="text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9;">
            <a href="mailto:${cleanUserEmail}?subject=Re: [Support Ticket %23${ticketId}] Follow-up from Quontriz Invoza Support" style="display: inline-block; background: #4f46e5; color: #ffffff; padding: 10px 20px; font-size: 13px; font-weight: bold; border-radius: 8px; text-decoration: none;">Reply Directly to ${userName || 'User'}</a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
          Delivered by Quontriz Invoza Automated AI Support Desk &bull; Target: support@supermarket.com
        </div>
      </div>
    `;

    console.log(`[AiChatSupport] 📨 Dispatching escalated support ticket #${ticketId} to ${this.supportEmail}...`);

    let emailDelivered = false;
    let emailError = null;

    try {
      const result = await emailService.sendNotificationEmail(
        this.supportEmail,
        finalSubject,
        emailHtml,
        `Support Ticket #${ticketId}\nFrom: ${userName} (${cleanUserEmail})\nRole: ${userRole}\nIssue: ${issue}`
      );
      emailDelivered = result.delivered;
      emailError = result.error;
    } catch (err) {
      emailError = err.message;
      console.warn('[AiChatSupport] Email dispatch note:', err.message);
    }

    // Record ticket notification in database for Store Owners
    try {
      await db.run(
        `INSERT INTO notifications (target_role, type, title, message, link, is_read, created_by_name)
         VALUES ($1, $2, $3, $4, $5, 0, $6)`,
        [
          'owner',
          'support_ticket',
          `Support Ticket #${ticketId} Escalated`,
          `${userName} (${cleanUserEmail}) escalated an unresolved issue: "${(issue || 'Support Request').slice(0, 100)}"`,
          '/settings',
          userName || 'Support Desk'
        ]
      );
    } catch (dbErr) {
      console.warn('[AiChatSupport] DB notification record note:', dbErr.message);
    }

    return {
      success: true,
      ticketId,
      recipient: this.supportEmail,
      delivered: emailDelivered,
      message: `Your ticket #${ticketId} has been escalated and sent to support@supermarket.com. Our support team will assist you shortly.`,
      emailError
    };
  }
}

module.exports = new AiChatSupportService();
