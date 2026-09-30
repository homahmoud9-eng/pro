import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "@/i18n/context";

export const metadata: Metadata = {
  title: "UAE Restaurant Enterprise Management System",
  description: "Enterprise operations, HR, compliance, finance, and legal document management system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var pref = localStorage.getItem('preferred_locale') || (document.cookie.match(/preferred_locale=([^;]+)/) || [])[1] || 'en';
                document.documentElement.dir = pref === 'ar' ? 'rtl' : 'ltr';
                document.documentElement.lang = pref === 'ar' ? 'ar-AE' : 'en-AE';
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="bg-[#0c0e12] text-slate-100 antialiased min-h-screen">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
