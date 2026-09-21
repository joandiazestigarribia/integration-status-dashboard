import type { Metadata, Viewport } from "next"
import { Hanken_Grotesk, JetBrains_Mono } from "next/font/google"
import { ServiceWorkerRegister } from "~/components/ServiceWorkerRegister"
import "./globals.css"

const sans = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-sans-loaded" })
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono-loaded" })

export const metadata: Metadata = {
  title: "Panel de sincronización",
  description: "Estado de integraciones de pagos, logística, ERP y marketplaces por cliente",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
}

export const viewport: Viewport = {
  themeColor: "#111111",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${sans.variable} ${mono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
