"use server";

import { z } from "zod";
import Database from "better-sqlite3";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const db = new Database("sql.db");
const FormSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  amount: z.coerce.number(),
  status: z.enum(["pending", "paid"]),
  date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });

export async function createInvoice(formData: FormData) {
  const { amount, customerId, status } = CreateInvoice.parse({
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });
  //   const rawFormData = {
  //     customerId: formData.get("customerId"),
  //     amount: formData.get("amount"),
  //     status: formData.get("status"),
  //   };
  // Test it out:
  //   console.log(rawFormData);

  const amountInCents = amount * 100;
  const date = new Date().toISOString().split("T")[0];
  const uuid = randomUUID();

  try {
    db.exec("BEGIN");
    const invoiceDB = db.prepare(
      "INSERT INTO invoices (id, customer_id, amount, status, date) VALUES (?, ?, ?, ?, ?)"
    );
    invoiceDB.run(uuid, customerId, amountInCents, status, date);
    db.exec("COMMIT");
  } catch (err: any) {
    db.exec("ROLLBACK");
    console.log("create invoice error", err.message);
  }
  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}