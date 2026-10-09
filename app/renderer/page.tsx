// Manual test page. The fonts come from the git-ignored test-fonts/ directory through
// ./fonts/[name]/route.ts, so the page builds even when they're missing.
const fontFaces = `
@font-face { font-family: 'Original'; src: url('/renderer/fonts/original.woff2') format('woff2'); font-display: swap; }
@font-face { font-family: 'Fixed'; src: url('/renderer/fonts/fixed.woff2') format('woff2'); font-display: swap; }
`;

const Button = ({ children, fontFamily }: { children: React.ReactNode, fontFamily: string }) => {
  return (
    <button className="px-4 py-2 font-lg bg-[red] rounded-full" style={{ fontFamily }}>
      {children}
    </button>
  );
};

export default function RenderPage() {
  return (
    <main>
      <style dangerouslySetInnerHTML={{ __html: fontFaces }} />
      <div className="flex justify-center items-center h-screen space-x-4">
        <Button fontFamily="'Original', sans-serif">(original) LOREM IPSUM</Button>
        <Button fontFamily="'Fixed', sans-serif">LOREM IPSUM (fixed)</Button>
      </div>
    </main>
  );
}
