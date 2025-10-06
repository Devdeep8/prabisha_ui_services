// commands/setup-auth.ts
import fs from "fs-extra";
import path from "path";
import prompts from "prompts";
import chalk from "chalk";
import ora from "ora";
import { execSync } from "child_process";

const AUTH_TYPES = [
  { title: "Better Auth", value: "better-auth" },
  { title: "NextAuth.js", value: "nextauth" },
  { title: "None", value: "none" },
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

function findAppDirectory(projectDir: string) {
  const rootApp = path.join(projectDir, "app");
  const srcApp = path.join(projectDir, "src", "app");

  if (fs.existsSync(srcApp)) return srcApp;
  if (fs.existsSync(rootApp)) return rootApp;
  
  const srcDir = path.join(projectDir, "src");
  if (fs.existsSync(srcDir)) return srcApp;
  
  return rootApp;
}

export async function setupAuth(projectPath: string) {
  console.log(chalk.blue.bold("\n🔐 Setup Authentication\n"));

  const packageManager = detectPackageManager(projectPath);
  console.log(chalk.gray(`📦 Detected package manager: ${packageManager}\n`));

  const { authType } = await prompts({
    type: "select",
    name: "authType",
    message: "Select authentication type:",
    choices: AUTH_TYPES,
    initial: 0,
  });

  if (authType === "none") {
    console.log(chalk.gray("Skipping authentication setup"));
    return;
  }

  // Install auth package
  const spinner = ora(`Installing ${authType}...`).start();
  try {
    if (authType === "better-auth") {
      runCommand(
        `${packageManager === "npm" ? "npm install" : `${packageManager} add`} better-auth`,
        projectPath
      );
    } else if (authType === "nextauth") {
      runCommand(
        `${packageManager === "npm" ? "npm install" : `${packageManager} add`} next-auth @next-auth/prisma-adapter bcryptjs jsonwebtoken`,
        projectPath
      );
    }
    spinner.succeed(chalk.green(`✓ ${authType} installed successfully`));
  } catch (error) {
    spinner.fail(chalk.red(`Failed to install ${authType}`));
    console.error(error);
    return;
  }

  // Install required shadcn components
  const shadcnSpinner = ora("Installing required shadcn components...").start();
  try {
    const components = ["button", "input", "card", "form", "label"];
    for (const component of components) {
      runCommand(
        `${packageManager === "npm" ? "npx shadcn@latest add" : `${packageManager} dlx shadcn@latest add`} ${component}`,
        projectPath
      );
    }
    shadcnSpinner.succeed(chalk.green("✓ shadcn components installed successfully"));
  } catch (error) {
    shadcnSpinner.fail(chalk.red("Failed to install shadcn components"));
    console.error(error);
    return;
  }

  // Create auth files
  const authSpinner = ora("Creating authentication files...").start();
  try {
    const appDir = findAppDirectory(projectPath);
    const apiDir = path.join(appDir, "api", "auth");
    await fs.ensureDir(apiDir);
    
    const libDir = path.join(projectPath, "src", "lib");
    await fs.ensureDir(libDir);

    if (authType === "nextauth") {
      // Create NextAuth API route
      const nextAuthApiPath = path.join(apiDir, "[...nextauth].ts");
      const nextAuthApiContent = `
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import jwt from 'jsonwebtoken';

export const authOptions = {
  adapter: PrismaAdapter(db),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        token: { label: "Token", type: "text" }, // For magic link login
      },
      async authorize(credentials) {
        if (!credentials) return null;

        // --- PATH 1: MAGIC LINK TOKEN AUTHENTICATION ---
        if (credentials.token) {
          try {
            const decoded = jwt.verify(credentials.token, process.env.NEXTAUTH_SECRET!);
            if (typeof decoded === 'string' || !decoded.userId) {
              return null; // Invalid token payload
            }
            const user = await db.user.findUnique({ where: { id: decoded.userId } });
            return user || null;
          } catch (error) {
            console.error("JWT Verification Error:", error);
            return null;
          }
        }

        // --- PATH 2: STANDARD EMAIL & PASSWORD AUTHENTICATION ---
        if (credentials.email && credentials.password) {
          const user = await db.user.findUnique({ where: { email: credentials.email } });
          if (!user || !user.password) return null;
          const isValid = await bcrypt.compare(credentials.password, user.password);
          if (!isValid) return null;
          return user;
        }

        return null;
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.sub = user.id;
        token.name = user.name;
        token.email = user.email;
        token.avatar = user.avatar; // 'user' has the full user object from the DB
      }
      if (trigger === "update") {
        if (session?.name !== undefined) token.name = session.name;
        if (session?.avatar !== undefined) token.avatar = session.avatar;
      }
      
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub as string;
        session.user.avatar = token.avatar as string | null; // Get the avatar from the token
      }
      return session;
    },
  },
  pages: {
    signIn: "/(auth)/sign-in",
    signOut: "/(auth)/sign-out",
    error: "/(auth)/error",
    newUser: "/onboarding",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

// Type declarations
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      avatar: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    avatar?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    avatar?: string | null;
  }
}
`;
      await fs.writeFile(nextAuthApiPath, nextAuthApiContent);

      // Create auth lib file
      const authLibPath = path.join(libDir, "auth.ts");
      const authLibContent = `
import { authOptions } from "./auth";

export { authOptions };
`;
      await fs.writeFile(authLibPath, authLibContent);

      // Create validation schemas
      const validationsDir = path.join(libDir, "validations");
      await fs.ensureDir(validationsDir);
      const validationsPath = path.join(validationsDir, "auth.ts");
      const validationsContent = `
import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
`;
      await fs.writeFile(validationsPath, validationsContent);

      // Create auth pages directory
      const authDir = path.join(appDir, "(auth)");
      await fs.ensureDir(authDir);

      // Sign in page
      const signInDir = path.join(authDir, "sign-in");
      await fs.ensureDir(signInDir);
      const signInPath = path.join(signInDir, "page.tsx");
      const signInContent = `"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInSchema, type SignInInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import Image from "next/image";
import ModeToggle from "@/components/layout-module/themeToggle";

export default function SignInPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: SignInInput) => {
    setIsLoading(true);
    try {
      const res = await signIn("credentials", {
        redirect: false,
        email: data.email,
        password: data.password,
      });

      if (res?.ok) {
        window.location.href = "/all-task";
      } else {
        form.setError("root", { message: "Invalid credentials" });
      }
    } catch {
      form.setError("root", { message: "Something went wrong" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-4xl p-0 overflow-hidden shadow-2xl rounded-2xl">
        <CardContent className="grid md:grid-cols-2 p-0">
          {/* Left Section - Enhanced with background and content */}
          <div className="p-8 md:p-12 flex flex-col justify-between dark:bg-primary bg-secondary text-white h-full">
            <div className="flex flex-col h-full justify-center items-center space-x-3 mb-8">
              <Image
                src="https://ai.prabisha.com/icons/favicon.png"
                alt="Logo"
                width={80}
                height={80}
                unoptimized
                className="rounded-lg p-2"
              />
              <div className="text-center flex-col flex gap-2">
                <h1 className="text-2xl font-bold">
                  {process.env.NEXT_PUBLIC_APP_NAME || "My Project"}
                </h1>
                <p className="text-sm">
                  Powered by{" "}
                  <span className="dark:text-secondary font-bold text-orange-400">
                    <a
                      href="https://prabisha.com"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Prabisha Consulting
                    </a>
                  </span>
                </p>
                <h1 className="text-2xl font-bold">Welcome Back</h1>
                <p className="text-sm">
                  Sign in to manage your account securely.
                </p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t">
              <p className="text-blue-200 text-sm">
                Need assistance?{" "}
                <a
                  href="tel:+91-9599824600"
                  className="text-white font-medium hover:underline"
                >
                  Contact Support
                </a>
              </p>
            </div>
          </div>

          {/* Right Section - Form */}
          <div className="p-8 md:p-12 flex flex-col justify-center">
            <div className="absolute top-4 right-4 z-10">
              <ModeToggle />
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold">Sign In</h2>
              <p className="mt-2">
                Enter your credentials to access your account
              </p>
            </div>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          className="h-12 rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Password</FormLabel>
                        <Link
                          href="/forgot-password"
                          className="text-sm hover:underline font-medium"
                        >
                          Forgot password?
                        </Link>
                      </div>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className="h-12 rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-5 w-5" />
                            ) : (
                              <Eye className="h-5 w-5" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.formState.errors.root && (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                    {form.formState.errors.root.message}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 rounded-lg transition-colors"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </Form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
`;
      await fs.writeFile(signInPath, signInContent);

      // Forgot password page
      const forgotPasswordDir = path.join(authDir, "forgot-password");
      await fs.ensureDir(forgotPasswordDir);
      const forgotPasswordPath = path.join(forgotPasswordDir, "page.tsx");
      const forgotPasswordContent = `'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import Link from 'next/link'
import { ArrowLeft, Loader2, Mail } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  })

  const onSubmit = async (data: ForgotPasswordInput) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        setIsSubmitted(true)
      } else {
        const errorData = await response.json()
        form.setError('root', { message: errorData.error || 'Something went wrong. Please try again.' })
      }
    } catch (error) {
      form.setError('root', { message: 'Something went wrong. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <Mail className="mx-auto h-12 w-12 text-green-600" />
            <h1 className="text-3xl font-bold text-gray-900 mt-4">Check Your Email</h1>
            <p className="mt-2 text-sm text-gray-600">
              We've sent a password reset link to your email address.
            </p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <p className="text-sm text-gray-600">
                  If an account with that email exists, you should receive a password reset email shortly.
                </p>
                <p className="text-sm text-gray-600">
                  Didn't receive the email? Check your spam folder or try again.
                </p>
                <div className="flex flex-col space-y-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsSubmitted(false)
                      form.reset()
                    }}
                  >
                    Try Again
                  </Button>
                  <Link href="/sign-in">
                    <Button variant="ghost" className="w-full">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Sign In
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Forgot Password</h1>
          <p className="mt-2 text-sm text-gray-600">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Reset Password</CardTitle>
            <CardDescription>
              We'll send you a secure link to reset your password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Enter your email address"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.formState.errors.root && (
                  <div className="text-sm text-red-600">
                    {form.formState.errors.root.message}
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending Reset Link...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center">
              <Link
                href="/sign-in"
                className="inline-flex items-center text-sm text-blue-600 hover:text-blue-500"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Sign In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
`;
      await fs.writeFile(forgotPasswordPath, forgotPasswordContent);

      // Create theme toggle component
      const layoutModuleDir = path.join(projectPath, "src", "components", "layout-module");
      await fs.ensureDir(layoutModuleDir);
      const themeTogglePath = path.join(layoutModuleDir, "themeToggle.tsx");
      const themeToggleContent = `"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ModeToggle() {
  const { setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
`;
      await fs.writeFile(themeTogglePath, themeToggleContent);

      // Install dropdown-menu component for theme toggle
      runCommand(
        `${packageManager === "npm" ? "npx shadcn@latest add" : `${packageManager} dlx shadcn@latest add`} dropdown-menu`,
        projectPath
      );

      // Install next-themes for theme toggle
      runCommand(
        `${packageManager === "npm" ? "npm install" : `${packageManager} add`} next-themes`,
        projectPath
      );

      // Create providers component
      const providersDir = path.join(projectPath, "src", "components", "providers");
      await fs.ensureDir(providersDir);
      const providersPath = path.join(providersDir, "providers.tsx");
      const providersContent = `"use client"

import { SessionProvider } from "next-auth/react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <NextThemesProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
      </NextThemesProvider>
    </SessionProvider>
  )
}
`;
      await fs.writeFile(providersPath, providersContent);

      // Update layout.tsx to include providers
      const appDirForLayout = findAppDirectory(projectPath);
      const layoutPath = path.join(appDirForLayout, "layout.tsx");
      const layoutContent = await fs.readFile(layoutPath, "utf8");
      
      // Check if providers are already included
      if (!layoutContent.includes("Providers")) {
        const updatedLayoutContent = layoutContent.replace(
          /import.*\n.*\n.*\n/g,
          `import "./globals.css"
import { Inter } from "next/font/google"
import { Providers } from "@/components/providers"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
}`
        ).replace(
          /<html.*>/,
          `<html lang="en" suppressHydrationWarning>`
        ).replace(
          /<body.*>/,
          `<body className={inter.className}>`
        ).replace(
          /<body.*>.*<\/body>/s,
          `<body className={inter.className}>
            <Providers>{children}</Providers>
          </body>`
        );
        
        await fs.writeFile(layoutPath, updatedLayoutContent);
      }
    }

    authSpinner.succeed(chalk.green("✓ Authentication files created successfully"));
  } catch (error) {
    authSpinner.fail(chalk.red("Failed to create authentication files"));
    console.error(error);
    return;
  }

  // Update .env file with auth placeholders
  const envSpinner = ora("Updating .env file...").start();
  try {
    const envPath = path.join(projectPath, ".env");
    const envContent = `
# Authentication
NEXTAUTH_SECRET=your_secret_key_here
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
`;

    if (fs.existsSync(envPath)) {
      const existing = await fs.readFile(envPath, "utf-8");
      await fs.writeFile(envPath, `${existing}\n${envContent}`);
    } else {
      await fs.writeFile(envPath, envContent);
    }

    envSpinner.succeed(chalk.green("✓ .env file updated"));
  } catch (error) {
    envSpinner.fail(chalk.red("Failed to update .env file"));
    console.error(error);
    return;
  }

  console.log(chalk.green("\n✅ Authentication setup complete!"));
  console.log(chalk.yellow("Next steps:"));
  console.log(chalk.gray("  1. Update the .env file with your actual credentials"));
  console.log(chalk.gray("  2. Set up Google OAuth credentials in Google Cloud Console"));
  console.log(chalk.gray("  3. Run your dev server: npm run dev\n"));
}