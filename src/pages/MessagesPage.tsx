export const MessagesPage = () => {
  return (
    <div className="w-full flex-1 min-h-[calc(100vh-60px)] flex flex-col items-center justify-center p-6 bg-transparent relative overflow-hidden">
      <div className="absolute inset-0 bg-noise mix-blend-overlay opacity-20 pointer-events-none"></div>
      
      <div className="w-full max-w-md border border-ghost p-12 flex flex-col items-center justify-center bg-surface relative">
        <span className="font-mono text-muted text-[10px] md:text-sm tracking-[0.2em] uppercase text-center leading-relaxed">
          SECURE COMM LINK <br/>
          <span className="text-primary/40 text-[9px] mt-4 block leading-loose">
            — PINGING ENCRYPTED NODES... —
          </span>
        </span>
      </div>
    </div>
  );
};
