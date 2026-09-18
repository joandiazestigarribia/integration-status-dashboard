import type { Metadata, Viewport } from "next"
import { ServiceWorkerRegister } from "~/components/ServiceWorkerRegister"
import "./globals.css"

export const metadata: Metadata = {
  title: "Panel de sincronización",
  description: "Estado de integraciones de pagos, logística y ERP por cliente",
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
    <html lang="es" className="h-full antialiased">
      <body className="flex min-h-full flex-col font-sans">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
