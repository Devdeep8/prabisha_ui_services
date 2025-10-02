export function getLayoutTemplate(fonts: Array<{ name: string; variable: string }>) {
  const imports = fonts.map(f => f.name).join(', ');
  
  const fontConfigs = fonts.map(f => `
const ${f.variable} = ${f.name}({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-${f.variable}",
  display: "swap",
});`).join('\n');

  const variables = fonts.map(f => `${f.variable}.variable`).join(' ');

  return `import { ${imports} } from "next/font/google";
import "./globals.css";

${fontConfigs}

export const metadata = {
  title: "Agency UI",
  description: "A modern web application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={\\\`${variables} antialiased\\\`}>
        {children}
      </body>
    </html>
  );
}
`;
}