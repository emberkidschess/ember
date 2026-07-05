import { z } from 'zod';
import { isValidPhoneForCountry, COUNTRY_OPTIONS, type SupportedCountry } from './phone';

const SUPPORTED_COUNTRY_CODES = COUNTRY_OPTIONS.map((c) => c.code) as [SupportedCountry, ...SupportedCountry[]];

const countrySchema = z.enum(SUPPORTED_COUNTRY_CODES, {
  message: 'Select a country',
});

export const trialBookingSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().email('Invalid email address'),
    phone: z.string().min(4, 'Phone number is required'),
    country: countrySchema,
    childAge: z.enum(['5-7', '8-10', '11-13', '14-16', '16+'], {
      message: 'Invalid age group selected',
    }),
    preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
    preferredTime: z.enum(['morning', 'afternoon', 'evening'], {
      message: 'Invalid time slot selected',
    }),
  })
  .refine((data) => isValidPhoneForCountry(data.phone, data.country), {
    message: 'Enter a valid phone number for the selected country',
    path: ['phone'],
  });

export const inquirySchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().email('Invalid email address'),
    phone: z.string().min(4, 'Phone number is required'),
    country: countrySchema,
    message: z.string().min(10, 'Message must be at least 10 characters').max(1000),
  })
  .refine((data) => isValidPhoneForCountry(data.phone, data.country), {
    message: 'Enter a valid phone number for the selected country',
    path: ['phone'],
  });

// Form data types that allow empty strings for initial state
export type TrialBookingFormData = {
  name: string;
  email: string;
  phone: string;
  country: SupportedCountry | '';
  childAge: string;
  preferredDate: string;
  preferredTime: string;
};

export type InquiryFormData = {
  name: string;
  email: string;
  phone: string;
  country: SupportedCountry | '';
  message: string;
};
