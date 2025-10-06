"use client"
import React, { useState } from 'react';
import { Search, Moon, Sun } from 'lucide-react';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';

export default function PrabishaHeader() {
  const [isDark, setIsDark] = useState(true);

  const navItems = ['Docs', 'Components', 'Blocks', 'Snippets', 'Templates'];

  return (
    <div className={isDark ? 'dark' : ''}>
      <header className="w-screen border-b ">
        <div className="mx-auto container flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md ">
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M5 12l5 5L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-xl font-semibold ">Prabisha UI</span>
            </div>

            {/* Navigation */}
            
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 " />
              <Input
                type="text"
                placeholder="Search"
                className="h-9 w-64   pl-10 pr-16 text-sm  placeholder: "
              />
              <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border px-1.5 font-mono text-xs ">
                  Ctrl
                </kbd>
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border px-1.5 font-mono text-xs ">
                  K
                </kbd>
              </div>
            </div>

            {/* Icon buttons */}
            <Button
              variant="ghost"
              size="icon"
              className=" hove hover: sm:hidden"
            >
              <Search className="h-5 w-5" />
            </Button>

         

            <Button
              variant="ghost"
              size="icon"
              className=" hove hover:"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className=" hove hover:"
              onClick={() => setIsDark(!isDark)}
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Demo content */}
    
    </div>
  );
}