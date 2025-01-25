import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { User } from "./app/lib/definitions";
import Database from "better-sqlite3";
import bcrypt from "bcrypt";

const db = new Database("sql.db");

async function getUser(email: string): Promise<User | undefined> {
  try {
    const user = db
      .prepare<string, User>(`SELECT * FROM users WHERE email = ?`)
      .get(email);
    return user;
  } catch (err) {
    console.error("Failed to fetch user:", err);
    throw new Error("Failed to fetch user.");
  }
}

export const { auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);

        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data;
          const user = await getUser(email);
          if (!user) return null;
          const passwordMatch = await bcrypt.compare(password, user.password);
          if (passwordMatch) return user;
        }
        console.log("Invalid credentials");
        return null;
      },
    }),
  ],
});
