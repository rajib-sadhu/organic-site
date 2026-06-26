import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80),
  email: z.string().trim().email("Enter a valid email"),
  phone: z
    .string()
    .trim()
    .max(20)
    .optional()
    .or(z.literal("")),
  message: z.string().trim().min(10, "Message is too short").max(2000),
});

export type ContactInput = z.infer<typeof contactSchema>;
