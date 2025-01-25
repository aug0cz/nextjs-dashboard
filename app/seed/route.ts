import bcrypt from "bcrypt";
import Database from "better-sqlite3";
import { randomUUID } from "crypto";
// import { db } from '@vercel/postgres';
import { invoices, customers, revenue, users } from "../lib/placeholder-data";

// sql.verbose();
const client = new Database("sql.db", { verbose: console.log });
console.log("connect");
// const client = await db.connect();

async function seedUsers() {
  // client.exec(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

  client.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
      );
    `);

  users.forEach(async (user) => {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    client.exec(
      `
        INSERT INTO users (id, name, email, password)
        VALUES ('${user.id}', '${user.name}', '${user.email}', '${hashedPassword}')
        ON CONFLICT (id) DO NOTHING;
      `
    );
  });
}

async function seedInvoices() {
  // client.exec(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

  client.exec(`
    CREATE TABLE IF NOT EXISTS invoices (
      id UUID PRIMARY KEY,
      customer_id UUID NOT NULL,
      amount INT NOT NULL,
      status VARCHAR(255) NOT NULL,
      date DATE NOT NULL
    );
  `);

  invoices.forEach((invoice) => {
    const uuid = randomUUID();
    client.exec(`
          INSERT INTO invoices (id,customer_id, amount, status, date)
          VALUES ('${uuid}', '${invoice.customer_id}', ${invoice.amount}, '${invoice.status}', '${invoice.date}')
          ON CONFLICT (id) DO NOTHING;
        `);
  });
}

async function seedCustomers() {
  // client.exec(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

  client.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id UUID PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      image_url VARCHAR(255) NOT NULL
    );
  `);

  customers.forEach((customer) => {
    client.exec(`
        INSERT INTO customers (id, name, email, image_url)
        VALUES ('${customer.id}', '${customer.name}', '${customer.email}', '${customer.image_url}')
        ON CONFLICT (id) DO NOTHING;
      `);
  });
}

async function seedRevenue() {
  client.exec(`
    CREATE TABLE IF NOT EXISTS revenue (
      month VARCHAR(4) NOT NULL UNIQUE,
      revenue INT NOT NULL
    );
  `);

  revenue.forEach((rev) => {
    client.exec(`
        INSERT INTO revenue (month, revenue)
        VALUES ('${rev.month}', ${rev.revenue})
        ON CONFLICT (month) DO NOTHING;
      `);
  });
}

export async function GET() {
  // return Response.json({
  //   message:
  //     'Uncomment this file and remove this line. You can delete this file when you are finished.',
  // });
  try {
    client.exec(`BEGIN`);
    await seedUsers();
    await seedCustomers();
    await seedInvoices();
    await seedRevenue();
    client.exec(`COMMIT`);

    return Response.json({ message: "Database seeded successfully" });
  } catch (error) {
    client.exec(`ROLLBACK`);
    return Response.json({ error }, { status: 500 });
  }
}
