import twilio from 'twilio';

class WhatsAppService {
  private isConfigured(): boolean {
    return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM);
  }

  async sendMessage(to: string, body: string): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('WhatsApp delivery is not configured');
    }

    const from = process.env.TWILIO_WHATSAPP_FROM!;
    const normalizedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
    const normalizedFrom = from.startsWith('whatsapp:') ? from : `whatsapp:${from}`;

    const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
    const message = await client.messages.create({
      from: normalizedFrom,
      to: normalizedTo,
      body: body.slice(0, 1600),
    });

    return message.sid;
  }
}

export default new WhatsAppService();
