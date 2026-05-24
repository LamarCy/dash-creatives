import { z } from 'zod';

export const contactSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(320),
  subject: z.string().max(200).optional().default(''),
  message: z.string().min(1).max(8000),
});

export type ContactPayload = z.infer<typeof contactSchema>;
