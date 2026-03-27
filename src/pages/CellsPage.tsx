export const CellsPage = () => {
  return (
    <div className="w-full flex-1 min-h-[calc(100vh-60px)] flex flex-col items-center justify-center p-6 bg-transparent relative overflow-hidden">
      <div className="absolute inset-0 bg-noise mix-blend-overlay opacity-20 pointer-events-none"></div>
      
      <div className="w-full max-w-md border border-ghost p-12 flex flex-col items-center justify-center relative bg-surface shadow-[0_0_30px_rgba(0,0,0,0.5)]">
        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-primary"></div>
        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-primary"></div>
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-primary"></div>
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-primary"></div>
        
        <span className="font-mono text-muted text-[10px] md:text-sm tracking-[0.2em] uppercase text-center leading-relaxed">
          CELLS <br/>
          <span className="text-primary/50 text-[9px] mt-4 block leading-loose">
            — Community groups coming soon — <br/>
            [ TRANSMISSION PENDING ]
          </span>
        </span>
      </div>
    </div>
  );
};
