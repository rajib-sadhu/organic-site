import { z } from "zod";
import { checkoutSchema } from "./checkout";

const email = z.string().trim().email("Enter a valid email address.").max(191);
const password = z.string().min(8, "Use at least 8 characters.").max(128, "Use at most 128 characters.");

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(100),
  email,
  password,
});

export const registerNoPasswordSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(100),
  email,
});

export const passwordLoginSchema = z.object({ email, password: z.string().min(1, "Enter your password.").max(128) });

export const codeRequestSchema = z.object({ email });
export const codeLoginSchema = z.object({ email, code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code.") });

export const forgotPasswordSchema = z.object({ email });
export const resetPasswordSchema = z.object({ token: z.string().min(20).max(200), password });

export const changePasswordSchema = z.object({
  currentPassword: z.string().max(128).optional(),
  newPassword: password,
});

export const registerFromOrderSchema = z.object({ token: z.string().min(1).max(191), password });
export const registerFromOrderNoPasswordSchema = z.object({ token: z.string().min(1).max(191) });

/** Profile + saved address. Address fields reuse checkout's rules but are all optional together. */
export const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(100),
  phone: checkoutSchema.shape.phone.optional().or(z.literal("")),
  address: checkoutSchema
    .pick({ shipName: true, shipLine1: true, shipLine2: true, shipCity: true, shipState: true, shipPincode: true })
    .nullable(),
});

export const wishlistSchema = z.object({ variantIds: z.array(z.number().int().positive()).max(200) });

export type RegisterInput = z.infer<typeof registerSchema>;
export type PasswordLoginInput = z.infer<typeof passwordLoginSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
