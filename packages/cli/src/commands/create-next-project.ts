// commands/create-next-project.ts
import fs from "fs-extra";
import path from "path";
import prompts from "prompts";
import chalk from "chalk";
import ora from "ora";
import { execSync } from "child_process";

export async function createNextProject(): Promise<{ projectName: string; projectPath: string } | null> {
  console.log(chalk.blue.bold("\n🚀 Create Next.js Project\n"));

  // Ask for the project name
  const { projectName } = await prompts({
    type: "text",
    name: "projectName",
    message: "What is your project named?",
    initial: "my-agency-app",
    validate: (name) => {
      if (!name) return "Project name is required";
      if (!/^[a-z0-9-_]+$/.test(name)) {
        return "Project name can only contain lowercase letters, numbers, hyphens, and underscores";
      }
      return true;
    },
  });

  if (!projectName) {
    console.log(chalk.red("❌ Project name is required. Initialization cancelled."));
    return null;
  }

  const projectPath = path.join(process.cwd(), projectName);

  // Check if directory already exists
  if (fs.existsSync(projectPath)) {
    const { overwrite } = await prompts({
      type: "confirm",
      name: "overwrite",
      message: `Directory "${projectName}" already exists. Overwrite?`,
      initial: false,
    });

    if (!overwrite) {
      console.log(chalk.red("❌ Initialization cancelled."));
      return null;
    }

    fs.removeSync(projectPath);
  }

  // Create project directory
  fs.ensureDirSync(projectPath);

  // Create package.json
  const spinner = ora("Setting up Next.js project structure...").start();
  
  const packageJson = {
    name: projectName,
    version: "0.1.0",
    private: true,
    scripts: {
      dev: "next dev --turbopack",
      build: "next build",
      start: "next start",
      lint: "next lint"
    },
    dependencies: {
      react: "^18",
      "react-dom": "^18",
      next: "^15.0.0"
    },
    devDependencies: {
      typescript: "^5",
      "@types/node": "^20",
      "@types/react": "^18",
      "@types/react-dom": "^18",
      "@tailwindcss/postcss": "^4",
      tailwindcss: "^4"
    },
    packageManager: "yarn@1.22.22"
  };

  fs.writeJsonSync(path.join(projectPath, "package.json"), packageJson, { spaces: 2 });

  // Create tsconfig.json
  const tsConfig = {
    compilerOptions: {
      lib: ["dom", "dom.iterable", "esnext"],
      allowJs: true,
      skipLibCheck: true,
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      module: "esnext",
      moduleResolution: "bundler",
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: "preserve",
      incremental: true,
      plugins: [{ name: "next" }],
      paths: {
        "@/*": ["./src/*"]
      }
    },
    include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
    exclude: ["node_modules"]
  };

  fs.writeJsonSync(path.join(projectPath, "tsconfig.json"), tsConfig, { spaces: 2 });

  // Create tailwind.config.ts
  const tailwindConfig = `import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [],
};
export default config;
`;

  fs.writeFileSync(path.join(projectPath, "tailwind.config.ts"), tailwindConfig);

  // Create postcss.config.mjs
  const postcssConfig = `/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;
`;

  fs.writeFileSync(path.join(projectPath, "postcss.config.mjs"), postcssConfig);

  // Create next.config.ts
  const nextConfig = `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
`;

  fs.writeFileSync(path.join(projectPath, "next.config.ts"), nextConfig);

  // Create .gitignore
  const gitignore = `# See https://help.github.com/articles/ignoring-files/ for more about ignoring files.

# dependencies
/node_modules
/.pnp
.pnp.js
.yarn/install-state.gz

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env*.local

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
`;

  fs.writeFileSync(path.join(projectPath, ".gitignore"), gitignore);

  // Create src directory structure
  fs.ensureDirSync(path.join(projectPath, "src", "app"));

  // Create globals.css
  const globalsCss = `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #ffffff;
  --foreground: #171717;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

body {
  color: var(--foreground);
  background: var(--background);
  font-family: Arial, Helvetica, sans-serif;
}
`;

  fs.writeFileSync(path.join(projectPath, "src", "app", "globals.css"), globalsCss);

  // Create layout.tsx
  const layoutTsx = `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`;

  fs.writeFileSync(path.join(projectPath, "src", "app", "layout.tsx"), layoutTsx);

  // Create page.tsx
  const pageTsx = `export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <main className="text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to Next.js!</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Get started by editing <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">src/app/page.tsx</code>
        </p>
      </main>
    </div>
  );
}
`;

  fs.writeFileSync(path.join(projectPath, "src", "app", "page.tsx"), pageTsx);

  // Create public directory
  fs.ensureDirSync(path.join(projectPath, "public"));

  // Create empty yarn.lock to prevent workspace detection
  fs.writeFileSync(path.join(projectPath, "yarn.lock"), "");

  spinner.succeed(chalk.green("✓ Next.js project structure created"));

  // Install dependencies with Yarn
  const installSpinner = ora("Installing dependencies with Yarn...").start();
  try {
    execSync("yarn install", {
      cwd: projectPath,
      stdio: "pipe",
    });
    installSpinner.succeed(chalk.green("✓ Dependencies installed successfully"));
  } catch (error) {
    installSpinner.fail(chalk.red("Failed to install dependencies"));
    console.error(error);
    return null;
  }

  return { projectName, projectPath };
}

// Wrapper function for standalone command
export async function createNextProjectCommand() {
  const result = await createNextProject();
  
  if (!result) {
    console.log(chalk.red("❌ Project creation failed."));
    process.exit(1);
  }
  
  console.log(chalk.green(`\n✅ Project created successfully at: ${result.projectPath}`));
  console.log(chalk.yellow(`\nNext steps:`));
  console.log(chalk.gray(`  cd ${result.projectName}`));
  console.log(chalk.gray(`  yarn dev\n`));
}