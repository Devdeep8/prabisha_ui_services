import { Poppins, Montserrat } from "next/font/google";
import "@workspace/ui/globals.css";
import { Providers } from "@/components/providers";
import PrabishaHeader from "@/components/ui/main-header";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-poppins",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata = {
  title: "Deva UI",
  description: "A modern web application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${poppins.variable} ${montserrat.variable} font-sans antialiased `}
      >
          {/* <PrabishaHeader/> */}
        <Providers>
          {children}
          </Providers>
      </body>
    </html>
  );
}
