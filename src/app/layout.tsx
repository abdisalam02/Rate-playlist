import { Figtree } from 'next/font/google'

const figtree = Figtree({ subsets: ['latin'] })

// Example layout structure
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${figtree.className} min-h-screen bg-[#121212] text-white`}>
        <div className="flex flex-col min-h-screen">
          <main className="flex-1">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
} 