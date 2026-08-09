import { lazy, Suspense, useEffect, useState } from "react";

const MapLocationMap = lazy(() => import("./map-location.client"));

function MapPlaceholder() {
  return (
    <div className="relative h-100 rounded-sm overflow-hidden">
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading map…
      </div>
    </div>
  );
}

export default function MapLocation({
  location,
  title,
  coordinates,
}: {
  location: string;
  title?: string;
  coordinates?: { lat: number; lng: number };
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <MapPlaceholder />;

  return (
    <Suspense fallback={<MapPlaceholder />}>
      <MapLocationMap location={location} title={title} coordinates={coordinates} />
    </Suspense>
  );
}
