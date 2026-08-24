import { Roboto, Roboto_Mono } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/context/auth-context"
import { Navbar } from "@/components/shared/navbar"
import { cn } from "@/lib/utils"
import Script from "next/script"

const fontSans = Roboto({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "700", "900"],
})

const fontMono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "700"],
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        fontSans.variable
      )}
    >
      <body>
        <ThemeProvider>
          <AuthProvider>
            <Navbar />
            {children}

            <Script
              src="http://localhost:3000/widget/ora-widget.js"
              data-ora-key="biz_live_7ac5e44d7bd3c143f7ec8910"
              strategy="lazyOnload"
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
