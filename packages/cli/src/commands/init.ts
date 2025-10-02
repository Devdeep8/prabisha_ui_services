import fs from "fs-extra";
import path from "path";
import prompts from "prompts";
import chalk from "chalk";
import ora from "ora";
import { execSync } from "child_process";
import { getLayoutTemplate } from "../templates/layout.template.js";
import { getGlobalsCssTemplate } from "../templates/globals.template.js";
import { getPrismaSchema } from "../templates/prisma.template.js";
import { getEnvTemplate } from "../templates/env.template.js";

const AVAILABLE_FONTS = [
  { name: "Poppins", variable: "poppins" },
  { name: "Montserrat", variable: "montserrat" },
  { name: "Inter", variable: "inter" },
  { name: "Roboto", variable: "roboto" },
];

const DB_TYPES = [
  { title: "PostgreSQL", value: "postgresql" },
  { title: "MySQL", value: "mysql" },
  { title: "SQLite", value: "sqlite" },
  { title: "MongoDB", value: "mongodb" },
  { title: "SQL Server", value: "sqlserver" },
];

function detectPackageManager(): string {
  if (fs.existsSync("pnpm-lock.yaml")) return "pnpm";
  if (fs.existsSync("yarn.lock")) return "yarn";
  if (fs.existsSync("package-lock.json")) return "npm";
  return "npm";
}

function runCommand(command: string): void {
  try {
    execSync(command, { stdio: "inherit", cwd: process.cwd() });
  } catch (error) {
    throw new Error(`Failed to execute: ${command}`);
  }
}

// Add this helper function near the top
function findAppDirectory() {
  const rootApp = path.join(process.cwd(), "app");
  const srcApp = path.join(process.cwd(), "src", "app");

  // Check if src/app exists
  if (fs.existsSync(srcApp)) {
    return srcApp;
  }

  // Check if app exists at root
  if (fs.existsSync(rootApp)) {
    return rootApp;
  }

  // Check if src directory exists (even if app doesn't)
  const srcDir = path.join(process.cwd(), "src");
  if (fs.existsSync(srcDir)) {
    return srcApp; // Use src/app if src exists
  }

  // Default to root app
  return rootApp;
}

export async function init() {
  console.log(chalk.blue.bold("\n🚀 Agency UI Initializer\n"));

  // Check if we're in a Next.js project
  const packageJsonPath = path.join(process.cwd(), "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    console.log(
      chalk.red("❌ No package.json found. Are you in a project directory?")
    );
    return;
  }

  const packageManager = detectPackageManager();
  console.log(chalk.gray(`📦 Detected package manager: ${packageManager}\n`));

  // Ask user questions
  const response = await prompts([
    {
      type: "confirm",
      name: "installShadcn",
      message: "Install shadcn/ui?",
      initial: true,
    },
    {
      type: "confirm",
      name: "installPrisma",
      message: "Install Prisma ORM?",
      initial: true,
    },
    {
      type: (prev, values) => (values.installPrisma ? "select" : null),
      name: "dbType",
      message: "Select database type:",
      choices: DB_TYPES,
    },
    {
      type: (prev, values) =>
        values.installPrisma && prev !== "sqlite" ? "text" : null,
      name: "dbName",
      message: "Database name:",
      initial: "myapp_db",
    },
    {
      type: (prev, values) =>
        values.installPrisma && values.dbType !== "sqlite" ? "text" : null,
      name: "dbHost",
      message: "Database host:",
      initial: "localhost",
    },
    {
      type: (prev, values) =>
        values.installPrisma && values.dbType !== "sqlite" ? "text" : null,
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
      type: (prev, values) =>
        values.installPrisma && values.dbType !== "sqlite" ? "text" : null,
      name: "dbUser",
      message: "Database username:",
      initial: "root",
    },
    {
      type: (prev, values) =>
        values.installPrisma && values.dbType !== "sqlite" ? "password" : null,
      name: "dbPassword",
      message: "Database password:",
      initial: "",
    },
    {
      type: "multiselect",
      name: "fonts",
      message:
        "Select fonts to install (use space to select, enter to confirm):",
      choices: AVAILABLE_FONTS.map((f) => ({
        title: f.name,
        value: f.variable,
        selected: f.variable === "poppins" || f.variable === "montserrat",
      })),
      min: 1,
    },
    {
      type: "select",
      name: "primaryFont",
      message: "Select primary font (used for font-sans):",
      choices: (prev) =>
        AVAILABLE_FONTS.filter((f) => prev.includes(f.variable)).map((f) => ({
          title: f.name,
          value: f.variable,
        })),
    },
    {
      type: "confirm",
      name: "createLayout",
      message: "Create/overwrite app/layout.tsx?",
      initial: true,
    },
    {
      type: "confirm",
      name: "createGlobals",
      message: "Create/overwrite app/globals.css?",
      initial: true,
    },
  ]);

  if (!response.fonts || response.fonts.length === 0) {
    console.log(chalk.red("❌ Initialization cancelled."));
    return;
  }

  console.log("");

  // STEP 1: Install shadcn/ui
  if (response.installShadcn) {
    const spinner = ora("Installing shadcn/ui...").start();
    try {
      const installCmd =
        packageManager === "npm"
          ? "npx shadcn@latest init -y"
          : `${packageManager} dlx shadcn@latest init -y`;

      runCommand(installCmd);
      spinner.succeed(chalk.green("✓ shadcn/ui installed successfully"));
    } catch (error) {
      spinner.fail(chalk.red("Failed to install shadcn/ui"));
      console.error(error);
      return;
    }
  }

  // STEP 2: Install Prisma
  if (response.installPrisma) {
    const spinner = ora("Installing Prisma...").start();
    try {
      const installCmd =
        packageManager === "npm"
          ? "npm install prisma @prisma/client"
          : `${packageManager} add prisma @prisma/client`;

      runCommand(installCmd);

      const initCmd =
        packageManager === "npm"
          ? "npx prisma init"
          : `${packageManager} dlx prisma init`;

      runCommand(initCmd);

      spinner.succeed(chalk.green("✓ Prisma installed successfully"));

      // STEP 3: Configure Prisma
      const configSpinner = ora("Configuring Prisma...").start();
      try {
        const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
        const schemaContent = getPrismaSchema(response.dbType);
        await fs.writeFile(schemaPath, schemaContent);

        const envPath = path.join(process.cwd(), ".env");
        const envContent = getEnvTemplate(response);

        if (fs.existsSync(envPath)) {
          const existing = await fs.readFile(envPath, "utf-8");
          await fs.writeFile(envPath, `${existing}\n\n${envContent}`);
        } else {
          await fs.writeFile(envPath, envContent);
        }

        configSpinner.succeed(chalk.green("✓ Prisma configured successfully"));
      } catch (error) {
        configSpinner.fail(chalk.red("Failed to configure Prisma"));
        console.error(error);
      }
    } catch (error) {
      spinner.fail(chalk.red("Failed to install Prisma"));
      console.error(error);
      return;
    }
  }

  // STEP 4: Setup Agency UI (fonts and layout)
  const spinner = ora("Setting up Agency UI...").start();

  try {
    const selectedFonts = AVAILABLE_FONTS.filter((f) =>
      response.fonts.includes(f.variable)
    );

    const appDir = findAppDirectory();
    await fs.ensureDir(appDir);

    if (response.createLayout) {
      const layoutContent = getLayoutTemplate(selectedFonts);
      const layoutPath = path.join(appDir, "layout.tsx");
      await fs.writeFile(layoutPath, layoutContent);
    }

    if (response.createGlobals) {
      const globalsContent = getGlobalsCssTemplate(
        selectedFonts,
        response.primaryFont
      );
      const globalsPath = path.join(appDir, "globals.css");
      await fs.writeFile(globalsPath, globalsContent);
    }

    spinner.succeed(chalk.green("✓ Agency UI setup complete"));

    // Success message with next steps
    console.log(chalk.green.bold("\n✅ Agency UI initialized successfully!\n"));
    console.log(chalk.yellow("Next steps:"));
    console.log(chalk.gray("  1. Review the generated files"));

    if (response.installPrisma) {
      console.log(
        chalk.gray("  2. Update your Prisma schema in prisma/schema.prisma")
      );
      console.log(
        chalk.gray(
          "  3. Run: " +
            (packageManager === "npm" ? "npx" : packageManager + " dlx") +
            " prisma migrate dev --name init"
        )
      );
      console.log(
        chalk.gray(
          "  4. Run: " +
            (packageManager === "npm" ? "npx" : packageManager + " dlx") +
            " prisma generate"
        )
      );
    }

    if (response.createGlobals) {
      console.log(
        chalk.gray(
          `  ${response.installPrisma ? "5" : "2"}. Adjust @source paths in globals.css if needed`
        )
      );
    }

    console.log(
      chalk.gray(
        `  ${response.installPrisma ? "6" : "3"}. Run your dev server: ${packageManager} run dev\n`
      )
    );
  } catch (error) {
    spinner.fail(chalk.red("Failed to initialize Agency UI"));
    console.error(error);
  }
}
