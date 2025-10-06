#!/usr/bin/env node

import { Command } from 'commander';
import { init } from './commands/init';
import { createNextProjectCommand } from "./commands/create-next-project";
import { setupAuth } from "./commands/setup-auth";
import { setupShadcn } from "./commands/setup-shadcn";
import { setupPrisma } from "./commands/setup-prisma";
import { setupUI } from "./commands/setup-ui";

const program = new Command();

program
  .name("agency-ui")
  .description("CLI to scaffold Agency UI projects")
  .version("1.0.0");

program
  .command("init")
  .description("Initialize a new Agency UI project")
  .action(init);

program
  .command("create-next-project")
  .description("Create a new Next.js project")
  .action(createNextProjectCommand);

program
  .command("setup-auth")
  .description("Setup authentication in your project")
  .action(setupAuth);

program
  .command("setup-shadcn")
  .description("Setup shadcn/ui in your project")
  .action(setupShadcn);

program
  .command("setup-prisma")
  .description("Setup Prisma ORM in your project")
  .action(setupPrisma);

program
  .command("setup-ui")
  .description("Setup UI components in your project")
  .action(setupUI);

program.parse();