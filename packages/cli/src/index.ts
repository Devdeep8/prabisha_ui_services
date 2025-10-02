#!/usr/bin/env node

import { Command } from 'commander';
import { init } from './commands/init.js';

const program = new Command();

program
  .name('agencyui')
  .description('CLI tool for Agency UI setup')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize Agency UI with fonts and configuration')
  .action(init);

program.parse();