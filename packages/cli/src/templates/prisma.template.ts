export function getPrismaSchema(dbType: string): string {
  const providers: Record<string, string> = {
    postgresql: "postgresql",
    mysql: "mysql",
    sqlite: "sqlite",
    mongodb: "mongodb",
    sqlserver: "sqlserver",
  };

  const provider = providers[dbType] || "postgresql";

  return `// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "${provider}"
  url      = env("DATABASE_URL")
}

// Example model - customize as needed
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@index([userId], map: "accounts_userId_fkey")
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId], map: "sessions_userId_fkey")
  @@map("sessions")
}



model User {
  id                   String                @id @default(cuid())
  userCode             String?               @unique // 👈 new field, optional at first
  email                String                @unique
  name                 String
  password             String?
  avatar               String?
  role                 Role                  @default(MEMBER)
  createdAt            DateTime              @default(now())
  updatedAt            DateTime              @updatedAt
  resetToken           String?
  resetTokenExpiry     DateTime?
  accounts             Account[]
  sessions             Session[]


  @@map("users")
}

enum Role {
  ADMIN
  MANAGER
  MEMBER
}
`;
}
