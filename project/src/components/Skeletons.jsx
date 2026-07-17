export function MovieCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="skeleton aspect-[2/3] rounded-2xl mb-2" />
      <div className="skeleton h-3 rounded w-3/4 mb-1.5" />
      <div className="skeleton h-2.5 rounded w-1/2" />
    </div>
  );
}

export function MovieGridSkeleton({ count = 10 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <MovieCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function CarouselSkeleton() {
  return <div className="skeleton h-[60vh] rounded-2xl mb-4" />;
}

export function DetailSkeleton() {
  return (
    <div className="grid md:grid-cols-3 gap-8 animate-pulse">
      <div className="skeleton aspect-[2/3] rounded-2xl" />
      <div className="md:col-span-2 space-y-4">
        <div className="skeleton h-8 rounded w-3/4" />
        <div className="skeleton h-4 rounded w-1/2" />
        <div className="skeleton h-20 rounded" />
        <div className="skeleton h-4 rounded w-1/3" />
        <div className="skeleton h-4 rounded w-2/3" />
      </div>
    </div>
  );
}

export function SeatMapSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="skeleton h-28 rounded-2xl" />
      <div className="skeleton h-80 rounded-2xl" />
      <div className="skeleton h-32 rounded-2xl" />
    </div>
  );
}

export function BookingCardSkeleton() {
  return (
    <div className="glass rounded-2xl p-5 animate-pulse flex gap-5">
      <div className="skeleton w-20 h-28 rounded-xl shrink-0" />
      <div className="flex-1 space-y-3">
        <div className="skeleton h-5 rounded w-1/2" />
        <div className="skeleton h-3 rounded w-3/4" />
        <div className="skeleton h-3 rounded w-2/3" />
        <div className="skeleton h-4 rounded w-1/4" />
      </div>
    </div>
  );
}
