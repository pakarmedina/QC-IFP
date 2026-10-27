import { z } from "zod";

const password = z
  .string()
  .min(8, "Kata sandi minimal 8 karakter")
  .max(100, "Kata sandi terlalu panjang")
  .regex(/[A-Za-z]/, "Kata sandi harus memuat huruf")
  .regex(/[0-9]/, "Kata sandi harus memuat angka");

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Nama minimal 2 karakter").max(80),
    username: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9_.]{3,30}$/, "Username 3-30 karakter: huruf kecil, angka, titik, atau garis bawah"),
    email: z.string().trim().toLowerCase().email("Format email tidak valid").max(120),
    password,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Konfirmasi kata sandi tidak sama",
  });

export const loginSchema = z.object({
  identifier: z.string().trim().toLowerCase().min(1, "Username atau email wajib diisi").max(120),
  password: z.string().min(1, "Kata sandi wajib diisi").max(100),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Format email tidak valid"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(20).max(200),
    password,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Konfirmasi kata sandi tidak sama",
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
