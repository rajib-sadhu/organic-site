import { z } from "zod";

export const checkoutSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  phone: z
    .string()
    .min(10, "Enter a valid phone number.")
    .max(15)
    .regex(/^[+\d\s-]+$/, "Enter a valid phone number."),
  shipName: z.string().min(2, "Enter your full name.").max(100),
  shipLine1: z.string().min(3, "Enter your address.").max(200),
  shipLine2: z.string().max(200).optional(),
  shipCity: z.string().min(2, "Enter your city.").max(100),
  shipState: z.string().min(2, "Select your state.").max(100),
  shipPincode: z
    .string()
    .regex(/^\d{6}$/, "Enter a valid 6-digit pincode."),
  paymentMethod: z.enum(["RAZORPAY", "COD"]),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
