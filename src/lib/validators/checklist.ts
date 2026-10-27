import { z } from "zod";

const label = z.string().trim().min(3, "Nama item minimal 3 karakter").max(200, "Nama item terlalu panjang");
const standard = z.string().trim().max(120, "Standar terlalu panjang").optional();

export const checklistCreateSchema = z.object({
  categoryId: z.string().min(1).max(40),
  label,
  standard,
  requiresPhoto: z.boolean().default(false),
});

export const checklistPatchSchema = z
  .object({
    label: label.optional(),
    standard,
    requiresPhoto: z.boolean().optional(),
    isActive: z.boolean().optional(),
    move: z.enum(["up", "down"]).optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), { message: "Tidak ada perubahan." });

export type ChecklistCreateInput = z.infer<typeof checklistCreateSchema>;
export type ChecklistPatchInput = z.infer<typeof checklistPatchSchema>;
