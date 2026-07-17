import { z } from 'zod';

export const createContactSchema = z.object({
  name: z.string().trim().min(1).max(160),
  email: z.string().trim().toLowerCase().email().optional().or(z.literal('')),
  phone: z.string().trim().max(32).optional().or(z.literal('')),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type CreateContactDto = z.infer<typeof createContactSchema>;

export const updateContactSchema = createContactSchema.partial();
export type UpdateContactDto = z.infer<typeof updateContactSchema>;

export const listContactsQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type ListContactsQuery = z.infer<typeof listContactsQuerySchema>;
