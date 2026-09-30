// Shown while the checkout review page loads. Kept out of /checkout/success and
// /checkout/cancel (route group) so notFound() and redirects there keep real status codes.
export default function CheckoutLoading() {
  return (
    <main role="status" aria-label="Loading checkout" className="container-content section flex-1">
      <div className="mb-10 flex flex-col gap-3">
        <div className="h-4 w-20 bg-surface-sunken" />
        <div className="h-8 w-64 bg-surface-sunken" />
      </div>
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-16 xl:gap-24">
        <div className="flex flex-col border-t">
          {[0, 1].map((index) => (
            <div key={index} className="grid grid-cols-[5rem_minmax(0,1fr)] gap-4 border-b py-5 sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-6">
              <div className="aspect-product bg-surface-sunken" />
              <div className="flex flex-col gap-3">
                <div className="h-4 w-40 bg-surface-sunken" />
                <div className="h-4 w-24 bg-surface-sunken" />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col gap-5 bg-surface-muted p-6 md:p-8 lg:mt-0">
          <div className="h-6 w-36 bg-surface-sunken" />
          <div className="h-24 bg-surface-sunken" />
          <div className="h-12 rounded-pill bg-surface-sunken" />
        </div>
      </div>
    </main>
  );
}
