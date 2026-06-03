import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const prismaClientSingleton = () => {
  // Initialize the pg connection pool using the environment connection string
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
  });

  // Wrap it in the official Prisma PostgreSQL adapter
  const adapter = new PrismaPg(pool);

  // Instantiate the client passing the adapter (required in Prisma 7)
  return new PrismaClient({ adapter });
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const db = globalThis.prismaGlobal ?? prismaClientSingleton();

export default db;

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = db;
}