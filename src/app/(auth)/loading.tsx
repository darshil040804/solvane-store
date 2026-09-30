// Shown while the sign-in / sign-up page checks for an existing session.
export default function AuthLoading() {
  return (
    <div role="status" aria-label="Loading" className="flex flex-col gap-8">
      <div className="flex flex-col items-center gap-3">
        <div className="h-4 w-24 bg-surface-sunken" />
        <div className="h-8 w-40 bg-surface-sunken" />
      </div>
      <div className="flex flex-col gap-5">
        {[0, 1].map((index) => (
          <div key={index} className="flex flex-col gap-2">
            <div className="h-4 w-28 bg-surface-sunken" />
            <div className="h-12 rounded-control bg-surface-sunken" />
          </div>
        ))}
        <div className="mt-2 h-12 rounded-pill bg-surface-sunken" />
      </div>
    </div>
  );
}
