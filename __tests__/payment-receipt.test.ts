import { describe, it, expect, vi } from 'vitest'
import {
  generatePaymentReceiptWhatsAppMessage,
  type PaymentReceiptData,
} from '@/lib/utils/payment-receipt'
import type { AppointmentPaymentWithCreator } from '@/lib/models/appointment-payment/appointment-payment'

const createMockPayment = (overrides?: Partial<AppointmentPaymentWithCreator>): AppointmentPaymentWithCreator => ({
  id: 'pay-12345678-abcd-1234-efgh-123456789012',
  appointment_id: 'apt-1',
  business_id: 'biz-1',
  amount_cents: 50000,
  payment_method: 'AT_VENUE',
  payment_date: '2024-01-15T14:30:00Z',
  notes: null,
  created_by: 'user-1',
  created_at: '2024-01-15T14:30:00Z',
  updated_at: '2024-01-15T14:30:00Z',
  ...overrides,
})

const createMockReceiptData = (overrides?: Partial<PaymentReceiptData>): PaymentReceiptData => ({
  payment: createMockPayment(),
  businessName: 'Salón Bella Vista',
  businessAddress: 'Calle 123 #45-67',
  businessPhone: '3001234567',
  businessNit: '900123456-1',
  customerName: 'María García',
  appointmentDate: '2024-01-20T10:00:00Z',
  services: [
    { name: 'Corte de cabello', price_cents: 35000 },
    { name: 'Manicure', price_cents: 25000 },
  ],
  totalPriceCents: 60000,
  totalPaidCents: 50000,
  balanceDueCents: 10000,
  ...overrides,
})

describe('Payment Receipt Utils', () => {
  describe('generatePaymentReceiptWhatsAppMessage', () => {
    it('should generate a formatted WhatsApp message', () => {
      const data = createMockReceiptData()
      const message = generatePaymentReceiptWhatsAppMessage(data)

      expect(message).toContain('COMPROBANTE DE ABONO')
      expect(message).toContain('Salón Bella Vista')
      expect(message).toContain('María García')
    })

    it('should include business information', () => {
      const data = createMockReceiptData()
      const message = generatePaymentReceiptWhatsAppMessage(data)

      expect(message).toContain('Salón Bella Vista')
      expect(message).toContain('Calle 123 #45-67')
      expect(message).toContain('3001234567')
      expect(message).toContain('900123456-1')
    })

    it('should include customer name', () => {
      const data = createMockReceiptData({ customerName: 'Juan Pérez' })
      const message = generatePaymentReceiptWhatsAppMessage(data)

      expect(message).toContain('Juan Pérez')
    })

    it('should list all services', () => {
      const data = createMockReceiptData({
        services: [
          { name: 'Corte de cabello', price_cents: 35000 },
          { name: 'Manicure', price_cents: 25000 },
          { name: 'Pedicure', price_cents: 30000 },
        ],
      })
      const message = generatePaymentReceiptWhatsAppMessage(data)

      expect(message).toContain('Corte de cabello')
      expect(message).toContain('Manicure')
      expect(message).toContain('Pedicure')
    })

    it('should include payment summary', () => {
      const data = createMockReceiptData({
        totalPriceCents: 100000,
        totalPaidCents: 75000,
        balanceDueCents: 25000,
      })
      const message = generatePaymentReceiptWhatsAppMessage(data)

      expect(message).toContain('Total servicios')
      expect(message).toContain('Total abonado')
      expect(message).toContain('Saldo pendiente')
    })

    it('should include payment amount', () => {
      const data = createMockReceiptData({
        payment: createMockPayment({ amount_cents: 75000 }),
      })
      const message = generatePaymentReceiptWhatsAppMessage(data)

      expect(message).toContain('ABONO REGISTRADO')
    })

    it('should include receipt number (first 8 chars of payment ID)', () => {
      const data = createMockReceiptData({
        payment: createMockPayment({ id: 'ABC12345-rest-of-id' }),
      })
      const message = generatePaymentReceiptWhatsAppMessage(data)

      expect(message).toContain('ABC12345')
    })

    it('should handle missing optional business data', () => {
      const data = createMockReceiptData({
        businessAddress: undefined,
        businessPhone: undefined,
        businessNit: undefined,
      })

      const message = generatePaymentReceiptWhatsAppMessage(data)

      expect(message).toContain('Salón Bella Vista')
      expect(message).not.toContain('undefined')
    })

    it('should include payment notes when present', () => {
      const data = createMockReceiptData({
        payment: createMockPayment({ notes: 'Pago parcial acordado' }),
      })
      const message = generatePaymentReceiptWhatsAppMessage(data)

      expect(message).toContain('Pago parcial acordado')
    })

    it('should not include notes section when notes are null', () => {
      const data = createMockReceiptData({
        payment: createMockPayment({ notes: null }),
      })
      const message = generatePaymentReceiptWhatsAppMessage(data)

      expect(message).not.toContain('Nota:')
    })

    it('should format dates in Spanish', () => {
      const data = createMockReceiptData({
        appointmentDate: '2024-03-15T10:00:00Z',
      })
      const message = generatePaymentReceiptWhatsAppMessage(data)

      // Check for lowercase Spanish month names (as used in the implementation)
      expect(message).toMatch(/\d+ de (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre) \d+/)
    })

    it('should include thank you message', () => {
      const data = createMockReceiptData()
      const message = generatePaymentReceiptWhatsAppMessage(data)

      expect(message).toContain('Gracias por su preferencia')
    })

    it('should use emojis for visual appeal', () => {
      const data = createMockReceiptData()
      const message = generatePaymentReceiptWhatsAppMessage(data)

      expect(message).toContain('🧾')
      expect(message).toContain('📍')
      expect(message).toContain('👤')
      expect(message).toContain('📅')
      expect(message).toContain('💰')
      expect(message).toContain('✅')
    })
  })
})

describe('PaymentReceiptData Types', () => {
  it('should allow creating valid PaymentReceiptData', () => {
    const data: PaymentReceiptData = {
      payment: createMockPayment(),
      businessName: 'Test Business',
      customerName: 'Test Customer',
      appointmentDate: '2024-01-15T10:00:00Z',
      services: [{ name: 'Service 1', price_cents: 10000 }],
      totalPriceCents: 10000,
      totalPaidCents: 5000,
      balanceDueCents: 5000,
    }

    expect(data.businessName).toBe('Test Business')
    expect(data.services).toHaveLength(1)
    expect(data.totalPriceCents).toBe(10000)
  })

  it('should handle multiple payment methods', () => {
    const methods = ['AT_VENUE', 'CREDIT_CARD', 'NEQUI', 'PAYPAL'] as const

    methods.forEach((method) => {
      const payment = createMockPayment({ payment_method: method })
      expect(payment.payment_method).toBe(method)
    })
  })
})

describe('Payment Amount Formatting', () => {
  it('should handle small amounts', () => {
    const data = createMockReceiptData({
      payment: createMockPayment({ amount_cents: 100 }),
      totalPriceCents: 100,
      totalPaidCents: 100,
      balanceDueCents: 0,
    })
    const message = generatePaymentReceiptWhatsAppMessage(data)

    expect(message).toBeDefined()
  })

  it('should handle large amounts', () => {
    const data = createMockReceiptData({
      payment: createMockPayment({ amount_cents: 10000000 }),
      totalPriceCents: 10000000,
      totalPaidCents: 10000000,
      balanceDueCents: 0,
    })
    const message = generatePaymentReceiptWhatsAppMessage(data)

    expect(message).toBeDefined()
  })

  it('should handle zero balance due', () => {
    const data = createMockReceiptData({
      totalPriceCents: 50000,
      totalPaidCents: 50000,
      balanceDueCents: 0,
    })
    const message = generatePaymentReceiptWhatsAppMessage(data)

    expect(message).toContain('0')
  })
})

describe('Edge Cases', () => {
  it('should handle empty services array', () => {
    const data = createMockReceiptData({
      services: [],
      totalPriceCents: 0,
      totalPaidCents: 0,
      balanceDueCents: 0,
    })
    const message = generatePaymentReceiptWhatsAppMessage(data)

    expect(message).toBeDefined()
    expect(message).toContain('Servicios')
  })

  it('should handle special characters in business name', () => {
    const data = createMockReceiptData({
      businessName: 'Salón "Bella & Vista" - Spa',
    })
    const message = generatePaymentReceiptWhatsAppMessage(data)

    expect(message).toContain('Salón "Bella & Vista" - Spa')
  })

  it('should handle special characters in customer name', () => {
    const data = createMockReceiptData({
      customerName: "María O'Connor Müller",
    })
    const message = generatePaymentReceiptWhatsAppMessage(data)

    expect(message).toContain("María O'Connor Müller")
  })

  it('should handle long service names', () => {
    const data = createMockReceiptData({
      services: [
        {
          name: 'Tratamiento capilar reconstructivo con keratina brasileña premium y masaje relajante',
          price_cents: 150000,
        },
      ],
    })
    const message = generatePaymentReceiptWhatsAppMessage(data)

    expect(message).toContain('Tratamiento capilar')
  })
})
