import { z } from "zod";

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid")
  .refine((s) => !Number.isNaN(Date.parse(s)), "Tanggal tidak valid");

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Maksimal ${max} karakter`)
    .optional()
    .transform((v) => (v ? v : null));

export const createInspectionSchema = z.object({
  serialNumber: z.string().trim().min(3, "Nomor seri minimal 3 karakter").max(60, "Nomor seri terlalu panjang"),
  site: z.string().trim().min(2, "Lokasi wajib diisi").max(80, "Lokasi terlalu panjang"),
  inspectedAt: dateString,
});

export const saveInspectionSchema = createInspectionSchema
  .extend({
    physicalNote: optionalText(500),
    boxNote: optionalText(500),
    approvedBy: optionalText(80),
    results: z
      .array(
        z.object({
          itemId: z.string().min(1).max(40),
          result: z.enum(["YA", "TIDAK", "NA"]),
          note: optionalText(500),
        }),
      )
      .max(200),
  })
  .refine((v) => new Set(v.results.map((r) => r.itemId)).size === v.results.length, {
    path: ["results"],
    message: "Ada item yang terkirim dua kali.",
  });

export const userActionSchema = z.object({
  action: z.enum(["approve", "disable", "enable", "makeAdmin", "makeQc"]),
});

export type CreateInspectionInput = z.infer<typeof createInspectionSchema>;
export type SaveInspectionInput = z.infer<typeof saveInspectionSchema>;
export type UserAction = z.infer<typeof userActionSchema>["action"];
