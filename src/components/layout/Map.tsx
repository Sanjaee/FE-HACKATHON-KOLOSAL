import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  GoogleMap,
  LoadScript,
  Marker,
  InfoWindow,
} from "@react-google-maps/api";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { apiService, Rental } from "./dummy";

// Types
interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface MapProps {
  full?: boolean;
}

const containerStyle = {
  width: "100%",
  height: "100vh",
};

const defaultCenter = {
  lat: -6.2088,
  lng: 106.8456,
};

const ITEMS_PER_PAGE = 30;

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const check = () =>
      setIsDesktop(window.matchMedia("(min-width: 768px)").matches);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isDesktop;
}

export default function DataMap({ full }: MapProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [visibleDataWarung, setVisibleDataWarung] = useState<Rental[]>([]);
  const [selectedDataWarung, setSelectedDataWarung] = useState<Rental | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dataWarungRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const isDesktop = useIsDesktop();
  const router = useRouter();

  // Open InfoWindow if ?selected=... in URL and data warung exists
  useEffect(() => {
    if (router.query.selected && visibleDataWarung.length > 0) {
      const found = visibleDataWarung.find(
        (dataWarung) => dataWarung.rentalId === router.query.selected
      );
      if (found) setSelectedDataWarung(found);
    }
  }, [router.query.selected, visibleDataWarung]);

  // Helper to open InfoWindow and update query param
  const handleMarkerClick = (rental: Rental) => {
    setSelectedDataWarung(rental);
    router.replace(
      {
        pathname: router.pathname,
        query: { ...router.query, selected: rental.rentalId },
      },
      undefined,
      { shallow: true }
    );
  };

  // Helper to close InfoWindow and remove query param
  const handleCloseInfoWindow = () => {
    setSelectedDataWarung(null);
    const { selected, ...rest } = router.query;
    router.replace({ pathname: router.pathname, query: rest }, undefined, {
      shallow: true,
    });
  };

  // Set default data immediately when component mounts
  useEffect(() => {
    const defaultBounds: MapBounds = {
      north: -6.1888,
      south: -6.2288,
      east: 106.8656,
      west: 106.8256,
    };

    fetchDataWarungInBounds(defaultBounds, "");
    setMapBounds(defaultBounds);
  }, []);

  // Fetch data warung from API based on bounds and search
  const fetchDataWarungInBounds = async (bounds: MapBounds, query: string = "") => {
    try {
      setLoading(true);
      const response = await apiService.getAllRentals({
        lat: (bounds.north + bounds.south) / 2,
        lng: (bounds.east + bounds.west) / 2,
        radius: 10,
        search: query || undefined,
        limit: 50,
      });

      if (response.success) {
        setVisibleDataWarung(response.rentals);
      }
    } catch (error) {
      console.error("Error fetching data warung:", error);
      setVisibleDataWarung([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculate distance between two coordinates
  const calculateDistance = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Update visible data warung when map bounds change
  const updateVisibleDataWarung = useCallback(() => {
    if (!map) return;

    const bounds = map.getBounds();
    if (!bounds) return;

    const mapBounds: MapBounds = {
      north: bounds.getNorthEast().lat(),
      south: bounds.getSouthWest().lat(),
      east: bounds.getNorthEast().lng(),
      west: bounds.getSouthWest().lng(),
    };

    setMapBounds(mapBounds);
    fetchDataWarungInBounds(mapBounds, searchQuery);
    setCurrentPage(1);
  }, [map, searchQuery]);

  // Handle map events
  const onMapLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
    setIsInitialLoad(false);
  }, []);

  const onMapIdle = useCallback(() => {
    // Only update bounds, don't auto-refresh data
    if (!map) return;

    const bounds = map.getBounds();
    if (!bounds) return;

    const mapBounds: MapBounds = {
      north: bounds.getNorthEast().lat(),
      south: bounds.getSouthWest().lat(),
      east: bounds.getNorthEast().lng(),
      west: bounds.getSouthWest().lng(),
    };
    setMapBounds(mapBounds);
  }, [map]);

  // Handle search with debounce
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setLoading(true);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      // For search, use current map bounds or default area
      const bounds = mapBounds || {
        north: -6.1888,
        south: -6.2288,
        east: 106.8656,
        west: 106.8256,
      };

      fetchDataWarungInBounds(bounds, query);
      setCurrentPage(1);
    }, 300);
  };

  // Handle "Search in this area" button
  const handleSearchInArea = () => {
    if (!mapBounds) return;

    setLoading(true);
    setTimeout(() => {
      fetchDataWarungInBounds(mapBounds, searchQuery);
      setCurrentPage(1);
    }, 500);
  };

  // Format price to IDR
  const formatPrice = (price: number) => {
    return `IDR ${price.toLocaleString("id-ID")}`;
  };

  // Get current page data warung
  const getCurrentPageDataWarung = () => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return visibleDataWarung.slice(startIndex, endIndex);
  };

  // Calculate total pages
  const totalPages = Math.ceil(visibleDataWarung.length / ITEMS_PER_PAGE);

  useEffect(() => {
    if (selectedDataWarung && dataWarungRefs.current[selectedDataWarung.rentalId]) {
      dataWarungRefs.current[selectedDataWarung.rentalId]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [selectedDataWarung]);

  return (
    <>
      <Head>
        <title>Warung Map - Find Places Near You</title>
        <meta
          name="description"
          content="Find nearby places with interactive map"
        />
      </Head>
      <div
        style={{
          width: full ? "100vw" : "100%",
          height: full ? "100vh" : "100%",
        }}
      >
        <LoadScript
          googleMapsApiKey={
            process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
            "AIzaSyBPdNby0edgM_-uHsfgYUe_IWUAMhkNasE"
          }
        >
          <GoogleMap
            mapContainerStyle={{ width: "100%", height: "100%" }}
            center={defaultCenter}
            zoom={13}
            onLoad={onMapLoad}
            onIdle={onMapIdle}
            onClick={handleCloseInfoWindow} // <-- close InfoWindow when clicking on map
            options={{
              disableDefaultUI: false,
              zoomControl: true,
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: false,
            }}
          >
            {getCurrentPageDataWarung().map((rental) => (
              <Marker
                key={rental.rentalId}
                position={{ lat: rental.lat, lng: rental.lng }}
                onClick={() => handleMarkerClick(rental)}
                icon={{
                  url:
                    "data:image/svg+xml;base64," +
                    btoa(`
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="20" cy="20" r="18" fill="#FF6B6B" stroke="white" stroke-width="2"/>
                      <text x="20" y="25" text-anchor="middle" fill="white" font-size="12" font-weight="bold">
                        ${rental.price.toString().slice(0, 3)}K
                      </text>
                    </svg>
                  `),
                  scaledSize:
                    window.google &&
                    window.google.maps &&
                    typeof window.google.maps.Size === "function"
                      ? new window.google.maps.Size(40, 40)
                      : undefined,
                }}
              />
            ))}

            {selectedDataWarung && (
              <>
                {/* Overlay to close InfoWindow on outside click */}
                <div
                  style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100vw",
                    height: "100vh",
                    zIndex: 1000,
                    background: "transparent",
                    pointerEvents: "none",
                  }}
                  onClick={handleCloseInfoWindow}
                />
                <InfoWindow
                  position={{ lat: selectedDataWarung.lat, lng: selectedDataWarung.lng }}
                  onCloseClick={handleCloseInfoWindow}
                  options={{
                    maxWidth: 200,
                    pixelOffset:
                      window.google &&
                      window.google.maps &&
                      typeof window.google.maps.Size === "function"
                        ? new window.google.maps.Size(0, -10)
                        : undefined,
                  }}
                >
                  <div
                    className="p-0 max-w-sm cursor-pointer"
                    style={{
                      borderRadius: 5,
                      overflow: "hidden",
                      pointerEvents: "auto",
                    }}
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent closing when clicking inside the card
                      router.push(`/detail/${selectedDataWarung.rentalId}`);
                    }}
                  >
                    <div className="relative">
                      <img
                        src={
                          selectedDataWarung.mainImage ||
                          "https://dummyimage.com/300x200/cccccc/ffffff.jpg&text=No+Image"
                        }
                        alt={selectedDataWarung.name}
                        className="w-full h-40 object-cover rounded-none"
                        style={{ display: "block" }}
                      />
                    </div>
                    <div className="py-2">
                      <h3 className="font-bold text-neutral-900 mb-1">
                        {selectedDataWarung.name}
                      </h3>
                      {/* Star rating (static 3 stars for demo, replace with dynamic if needed) */}
                      <div className="flex items-center mb-1">
                        <span className="text-orange-400 text-lg mr-1">
                          ★★★
                        </span>
                      </div>
                      <p
                        className="text-xs text-gray-600 mb-1 break-words break-all"
                        style={{ textWrap: "wrap" }}
                      >
                        542 m dari area pilihanmu
                      </p>
                      <div className="text-xs text-gray-800 mb-2">
                        <span className="font-bold">
                          {selectedDataWarung.rating}
                        </span>
                        <span className="text-gray-500">
                          {" "}
                          ({selectedDataWarung.reviewCount})
                        </span>
                      </div>
                      <div className="font-bold text-lg text-red-600 mb-1">
                        {formatPrice(selectedDataWarung.price)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Belum termasuk pajak
                      </div>
                    </div>
                  </div>
                </InfoWindow>
              </>
            )}
          </GoogleMap>
        </LoadScript>
        {/* Search in this area button & Data Warung List Section hanya saat full */}
        {(full || isDesktop) && (
          <>
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 w-auto px-4 md:w-auto md:px-0 flex justify-center">
              <button
                onClick={handleSearchInArea}
                className="bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Mencari...</span>
                  </>
                ) : (
                  <span>Cari di area ini</span>
                )}
              </button>
            </div>
           
          </>
        )}
      </div>{" "}
      {/* Close main flex container */}
    </>
  );
}
