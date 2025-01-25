"use server";

import { z } from "zod";
import Database from "better-sqlite3";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

const db = new Database("sql.db");
const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: "Please select a customer.",
  }),
  amount: z.coerce
    .number()
    .gt(0, { message: "Please enter an amount greater than $0." }),
  status: z.enum(["pending", "paid"], {
    invalid_type_error: "Please select an invoice status.",
  }),
  date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });

export async function createInvoice(prevState: State, formData: FormData) {
  const validatedFields = CreateInvoice.safeParse({
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
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to Create Invoice.",
    };
  }

  const { amount, customerId, status } = validatedFields.data;
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
  } catch (err) {
    db.exec("ROLLBACK");
    console.log("create invoice error", err);
    return { message: "Database Error. Failed to Create Invoice." };
  }
  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}

const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export async function updateInvoice(
  id: string,
  prevState: State,
  formData: FormData
) {
  const validatedFields = UpdateInvoice.safeParse({
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to Update Invoice.",
    };
  }
  const { amount, customerId, status } = validatedFields.data;
  const amountInCents = amount * 100;
  try {
    db.exec("BEGIN");
    const invoiceDB = db.prepare(
      "UPDATE invoices SET customer_id = ?, amount = ?, status = ? WHERE id = ?"
    );
    invoiceDB.run(customerId, amountInCents, status, id);
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    console.log("create invoice error", err);
    return { message: "Database Error. Failed to Update Invoice." };
  }
  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}

export async function deleteInvoice(id: string) {
  throw new Error("Failed to Delete Invoice");
  try {
    db.exec("BEGIN");
    const invoiceDB = db.prepare("DELETE FROM invoices WHERE id = ?");
    invoiceDB.run(id);
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    console.log("delete invoice error", err);
  }
  revalidatePath("/dashboard/invoices");
}

// login...
export async function authenticate(
  prevState: string | undefined,
  formData: FormData
) {
  try {
    await signIn("credentials", formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin": {
          return "Invalid credentials";
        }
        default:
          return "Something went wrong";
      }
    }
    throw error;
  }
}
