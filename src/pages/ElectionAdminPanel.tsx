

export default function ElectionAdminPanel() {
  return (
    <div className="p-10 font-mono">
      <h1 className="text-primary text-xl font-bold tracking-widest uppercase mb-6">Election / Oversight Panel</h1>
      <p className="text-muted text-sm mb-4">Authentication required for oversight privileges.</p>
      <div className="border border-danger/30 p-6 bg-void flex items-center justify-center">
        <span className="text-danger text-xs tracking-widest uppercase">Clearance Level Insufficient</span>
      </div>
    </div>
  );
}
