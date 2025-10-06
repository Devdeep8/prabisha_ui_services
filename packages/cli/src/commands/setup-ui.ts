// commands/setup-ui.ts
import fs from "fs-extra";
import path from "path";
import prompts from "prompts";
import chalk from "chalk";
import ora from "ora";
import { getLayoutTemplate } from "../templates/layout.template.js";
import { getGlobalsCssTemplate } from "../templates/globals.template.js";

const AVAILABLE_FONTS = [
  { name: "Poppins", variable: "poppins" },
  { name: "Montserrat", variable: "montserrat" },
  { name: "Inter", variable: "inter" },
  { name: "Roboto", variable: "roboto" },
];

function findAppDirectory(projectDir: string) {
  const rootApp = path.join(projectDir, "app");
  const srcApp = path.join(projectDir, "src", "app");

  if (fs.existsSync(srcApp)) return srcApp;
  if (fs.existsSync(rootApp)) return rootApp;
  
  const srcDir = path.join(projectDir, "src");
  if (fs.existsSync(srcDir)) return srcApp;
  
  return rootApp;
}

export async function setupUI(projectPath: string) {
  console.log(chalk.blue.bold("\n🎨 Setup UI Components\n"));

  const response = await prompts([
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

  const spinner = ora("Setting up Agency UI...").start();

  try {
    const selectedFonts = AVAILABLE_FONTS.filter((f) =>
      response.fonts.includes(f.variable)
    );

    const appDir = findAppDirectory(projectPath);
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
  } catch (error) {
    spinner.fail(chalk.red("Failed to initialize Agency UI"));
    console.error(error);
  }

  console.log(chalk.green("\n✅ UI setup complete!"));
}