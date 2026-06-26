import { cookies } from "next/headers";

const COOKIE_NAME = "cart_token";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function getCartToken(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(COOKIE_NAME)?.value;
}

export async function setCartToken(token: string) {
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearCartToken() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}
