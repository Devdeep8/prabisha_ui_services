// commands/setup-shadcn.ts
import fs from "fs-extra";
import path from "path";
import prompts from "prompts";
import chalk from "chalk";
import ora from "ora";
import { execSync } from "child_process";

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

export async function setupShadcn(projectPath: string) {
  console.log(chalk.blue.bold("\n🎨 Setup shadcn/ui\n"));

  const packageManager = detectPackageManager(projectPath);
  console.log(chalk.gray(`📦 Detected package manager: ${packageManager}\n`));

  const { installShadcn } = await prompts({
    type: "confirm",
    name: "installShadcn",
    message: "Install shadcn/ui?",
    initial: true,
  });

  if (!installShadcn) {
    console.log(chalk.gray("Skipping shadcn/ui installation"));
    return;
  }

  const spinner = ora("Installing shadcn/ui...").start();
  try {
    const installCmd =
      packageManager === "npm"
        ? "npx shadcn@latest init -y"
        : `${packageManager} dlx shadcn@latest init -y`;

    runCommand(installCmd, projectPath);
    spinner.succeed(chalk.green("✓ shadcn/ui installed successfully"));
  } catch (error) {
    spinner.fail(chalk.red("Failed to install shadcn/ui"));
    console.error(error);
    return;
  }

  console.log(chalk.green("\n✅ shadcn/ui setup complete!"));
}