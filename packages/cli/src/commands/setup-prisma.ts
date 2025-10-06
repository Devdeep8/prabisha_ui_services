// commands/setup-prisma.ts
import fs from "fs-extra";
import path from "path";
import prompts from "prompts";
import chalk from "chalk";
import ora from "ora";
import { execSync } from "child_process";
import { getPrismaSchema } from "../templates/prisma.template.js";
import { getEnvTemplate } from "../templates/env.template.js";

const DB_TYPES = [
  { title: "PostgreSQL", value: "postgresql" },
  { title: "MySQL", value: "mysql" },
  { title: "SQLite", value: "sqlite" },
  { title: "MongoDB", value: "mongodb" },
  { title: "SQL Server", value: "sqlserver" },
];

function detectPackageManager(projectDir: string): string {
  if (fs.existsSync(path.join(projectDir, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(projectDir, "yarn.lock"))) return "yarn";
  if (fs.existsSync(path.join(projectDir, "package-lock.json"))) return "npm";
  return "npm";
}

function runCommand(command: string, cwd: string): void {
  try {
    execSync(command, { stdio: "inherit", cwd });
  } catch (error) {
    throw new Error(`Failed to execute: ${command}`);
  }
}

export async function setupPrisma(projectPath: string) {
  console.log(chalk.blue.bold("\n🗄️ Setup Prisma ORM\n"));

  const packageManager = detectPackageManager(projectPath);
  console.log(chalk.gray(`📦 Detected package manager: ${packageManager}\n`));

  const response = await prompts([
    {
      type: "select",
      name: "dbType",
      message: "Select database type:",
      choices: DB_TYPES,
    },
    {
      type: (prev) => (prev !== "sqlite" ? "text" : null),
      name: "dbName",
      message: "Database name:",
      initial: "myapp_db",
    },
    {
      type: (prev, values) => (values.dbType !== "sqlite" ? "text" : null),
      name: "dbHost",
      message: "Database host:",
      initial: "localhost",
    },
    {
      type: (prev, values) => (values.dbType !== "sqlite" ? "text" : null),
      name: "dbPort",
      message: "Database port:",
      initial: (prev, values) => {
        const defaultPorts: Record<string, string> = {
          postgresql: "5432",
          mysql: "3306",
          mongodb: "27017",
          sqlserver: "1433",
        };
        return defaultPorts[values.dbType] || "3306";
      },
    },
    {
      type: (prev, values) => (values.dbType !== "sqlite" ? "text" : null),
      name: "dbUser",
      message: "Database username:",
      initial: "root",
    },
    {
      type: (prev, values) => (values.dbType !== "sqlite" ? "password" : null),
      name: "dbPassword",
      message: "Database password:",
      initial: "",
    },
  ]);

  // Install Prisma
  const spinner = ora("Installing Prisma...").start();
  try {
    const installCmd =
      packageManager === "npm"
        ? "npm install prisma @prisma/client"
        : `${packageManager} add prisma @prisma/client`;

    runCommand(installCmd, projectPath);

    const initCmd =
      packageManager === "npm"
        ? "npx prisma init"
        : `${packageManager} dlx prisma init`;

    runCommand(initCmd, projectPath);

    spinner.succeed(chalk.green("✓ Prisma installed successfully"));
  } catch (error) {
    spinner.fail(chalk.red("Failed to install Prisma"));
    console.error(error);
    return;
  }

  // Configure Prisma
  const configSpinner = ora("Configuring Prisma...").start();
  try {
    const schemaPath = path.join(projectPath, "prisma", "schema.prisma");
    const schemaContent = getPrismaSchema(response.dbType);
    await fs.writeFile(schemaPath, schemaContent);

    // Create seed file
    const seedDir = path.join(projectPath, "prisma");
    await fs.ensureDir(seedDir);
    const seedPath = path.join(seedDir, "seed.ts");
    const seedContent = `
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 12);
  
  const user = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  console.log({ user });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
`;
    await fs.writeFile(seedPath, seedContent);

    // Update package.json to include seed script
    const packageJsonPath = path.join(projectPath, "package.json");
    const packageJson = await fs.readJson(packageJsonPath);
    packageJson.prisma = {
      seed: "tsx prisma/seed.ts",
    };
    packageJson.devDependencies = packageJson.devDependencies || {};
    packageJson.devDependencies.tsx = "^4.6.2";
    await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });

    // Install tsx
    runCommand(
      `${packageManager === "npm" ? "npm install -D" : `${packageManager} add -D`} tsx`,
      projectPath
    );

    // Update .env file
    const envPath = path.join(projectPath, ".env");
    const envContent = getEnvTemplate(response);

    if (fs.existsSync(envPath)) {
      let existing = await fs.readFile(envPath, "utf-8");
      // Remove existing DATABASE_URL if present
      existing = existing.replace(/^DATABASE_URL=.*$/m, "");
      await fs.writeFile(envPath, `${existing}\n${envContent}`);
    } else {
      await fs.writeFile(envPath, envContent);
    }

    configSpinner.succeed(chalk.green("✓ Prisma configured successfully"));
  } catch (error) {
    configSpinner.fail(chalk.red("Failed to configure Prisma"));
    console.error(error);
    return;
  }

  // Run migrations and seed
  const migrateSpinner = ora("Running migrations and seeding database...").start();
  try {
    const migrateCmd =
      packageManager === "npm"
        ? "npx prisma migrate dev --name init"
        : `${packageManager} dlx prisma migrate dev --name init`;

    runCommand(migrateCmd, projectPath);

    const seedCmd =
      packageManager === "npm"
        ? "npx prisma db seed"
        : `${packageManager} dlx prisma db seed`;

    runCommand(seedCmd, projectPath);

    migrateSpinner.succeed(chalk.green("✓ Database migrations and seeding completed"));
  } catch (error) {
    migrateSpinner.fail(chalk.red("Failed to run migrations or seed database"));
    console.error(error);
    return;
  }

  console.log(chalk.green("\n✅ Prisma setup complete!"));
}