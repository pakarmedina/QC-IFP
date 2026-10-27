import { z } from "zod";

const serial = z
  .string()
  .trim()
  .min(3, "Nomor seri minimal 3 karakter")
  .max(60, "Nomor seri terlalu panjang")
  .transform((s) => s.replace(/\s+/g, " ").toUpperCase());

export const addUnitsSchema = z.object({
  serials: z.array(serial).min(1, "Tambahkan minimal satu nomor seri").max(300, "Maksimal 300 nomor seri sekali simpan"),
  receivedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid")
    .refine((s) => !Number.isNaN(Date.parse(s)), "Tanggal tidak valid"),
  note: z
    .string()
    .trim()
    .max(200, "Maksimal 200 karakter")
    .optional()
    .transform((v) => (v ? v : null)),
});

export type AddUnitsInput = z.infer<typeof addUnitsSchema>;
