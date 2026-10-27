import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { CHECKLIST } from "./checklist-data";

const prisma = new PrismaClient();

async function seedChecklist() {
  // Checklist hanya diisi saat masih kosong. Setelah itu Admin mengelolanya lewat aplikasi,
  // dan seed (yang jalan di setiap deploy) tidak boleh menimpa perubahan tersebut.
  if ((await prisma.checklistItem.count()) > 0) {
    console.log("Checklist sudah ada: seed checklist dilewati.");
    return;
  }
  for (const [ci, cat] of CHECKLIST.entries()) {
    const category = await prisma.checklistCategory.upsert({
      where: { code: cat.code },
      update: { name: cat.name, sortOrder: ci + 1 },
      create: { code: cat.code, name: cat.name, sortOrder: ci + 1 },
    });
    for (const [ii, item] of cat.items.entries()) {
      const code = `${cat.code}${ii + 1}`;
      await prisma.checklistItem.upsert({
        where: { code },
        update: { label: item.label, standard: item.standard, sortOrder: ii + 1 },
        create: { code, categoryId: category.id, label: item.label, standard: item.standard, sortOrder: ii + 1 },
      });
    }
  }
}

async function main() {
  await seedChecklist();
  const { ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (ADMIN_USERNAME && ADMIN_EMAIL && ADMIN_PASSWORD) {
    await prisma.user.upsert({
      where: { username: ADMIN_USERNAME.toLowerCase() },
      update: {},
      create: {
        name: "Administrator",
        username: ADMIN_USERNAME.toLowerCase(),
        email: ADMIN_EMAIL.toLowerCase(),
        passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12),
        role: "ADMIN",
        status: "ACTIVE",
      },
    });
    console.log("Admin siap:", ADMIN_USERNAME);
  } else {
    console.warn("ADMIN_* belum diisi: akun Admin tidak dibuat.");
  }
  console.log("Seed selesai:", await prisma.checklistItem.count(), "item checklist");
}

main().finally(() => prisma.$disconnect());
