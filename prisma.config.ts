import path from "node:path";

// Prisma config for early access features
// Type-safe config once Prisma releases types
interface PrismaConfig {
  earlyAccess: boolean;
  schema: string;
}

const config: PrismaConfig = {
  earlyAccess: true,
  schema: path.join(__dirname, "prisma", "schema.prisma"),
};

export default config;
