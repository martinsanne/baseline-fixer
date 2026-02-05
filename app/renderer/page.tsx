import localFont from 'next/font/local';

const originalFont = localFont({
  variable: '--original',
  fallback: ['sans-serif'],
  display: 'swap',
  preload: true,
  src: [
    {
      path: '../../test-fonts/original.woff2',
      weight: '400',
      style: 'normal',
    },
  ],
});


const fixedFont = localFont({
  variable: '--fixed',
  fallback: ['sans-serif'],
  display: 'swap',
  preload: true,
  src: [
    {
      path: '../../test-fonts/fixed.woff2',
      weight: '400',
      style: 'normal',
    },
  ],
});

const Button = ({ children, className }: { children: React.ReactNode, className: string }) => {
  return (
    <button className={`px-4 py-2 font-lg bg-[red] rounded-full ${className}`}>
      {children}
    </button>
  );
};

export default async function RenderPage() {

  return (
    <main className={`${originalFont.variable} ${fixedFont.variable}`}>
      <div className="flex justify-center items-center h-screen space-x-4">
      <Button className={`${originalFont.className}`}>(original) LOREM IPSUM</Button>
      <Button className={`${fixedFont.className}`}>LOREM IPSUM (fixed)</Button>
      </div>
    </main>
  );
}
