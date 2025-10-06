// commands/init.ts
import chalk from "chalk";
import { createNextProject } from "./create-next-project.js";
import { setupAuth } from "./setup-auth.js";
import { setupShadcn } from "./setup-shadcn.js";
import { setupPrisma } from "./setup-prisma.js";
import { setupUI } from "./setup-ui.js";

export async function init() {
  console.log(chalk.blue.bold("\n🚀 Agency UI Project Creator\n"));

  // Step 1: Create Next.js project
  const result = await createNextProject();

  const projectName = result?.projectName as string
  const projectPath = result?.projectPath as string
  
  if (!projectName || !projectPath) {
    console.log(chalk.red("❌ Project creation failed. Initialization cancelled."));
    return;
  }

  // Step 2: Setup authentication
  await setupAuth(projectPath);

  // Step 3: Setup shadcn/ui
  await setupShadcn(projectPath);

  // Step 4: Setup Prisma
  await setupPrisma(projectPath);

  // Step 5: Setup UI components
  await setupUI(projectPath);

  // Success message
  console.log(chalk.green.bold(`\n✅ Agency UI project "${projectName}" created successfully!\n`));
  console.log(chalk.yellow("Next steps:"));
  console.log(chalk.gray(`  1. cd ${projectName}`));
  console.log(chalk.gray(`  2. Run your dev server: npm run dev\n`));
}