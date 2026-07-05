interface WisePaymentDetails {
  businessName?: string;
  recipientName?: string;
  recipientEmail?: string;
  paymentUrl?: string;
}

class WisePaymentService {
  getPaymentDetails(): WisePaymentDetails {
    return {
      businessName: process.env.WISE_BUSINESS_NAME,
      recipientName: process.env.WISE_RECIPIENT_NAME,
      recipientEmail: process.env.WISE_RECIPIENT_EMAIL,
      paymentUrl: process.env.WISE_PAYMENT_LINK,
    };
  }

  formatAmount(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  generatePaymentReference(studentName: string): string {
    return `${studentName} - Package Payment`;
  }

  generatePaymentInstructions(amount: number, currency: string, studentName: string): string {
    const details = this.getPaymentDetails();
    const lines = [
      `Please pay ${this.formatAmount(amount, currency)} using Wise.`,
      details.paymentUrl ? `Wise payment link: ${details.paymentUrl}` : '',
      details.businessName ? `Business: ${details.businessName}` : '',
      details.recipientName ? `Recipient: ${details.recipientName}` : '',
      details.recipientEmail ? `Wise email: ${details.recipientEmail}` : '',
      `Reference: "${this.generatePaymentReference(studentName)}"`,
      'After payment, share the Wise transfer receipt/reference with the academy. Staff will manually verify it before activating the package.',
    ];

    return lines.filter(Boolean).join('\n');
  }
}

export default new WisePaymentService();
