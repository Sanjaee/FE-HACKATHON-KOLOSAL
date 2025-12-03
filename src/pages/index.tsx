import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CardLayout from "@/components/layout/CardLayout";
import { useState, useEffect } from "react";
import HotelMap from "@/components/layout/Map";
import { useRouter } from "next/router";
import Link from "next/link";
import SkeletonCardLayout from "@/components/layout/SkeletonCardLayout";
import { apiService, DataWarung } from "../components/layout/dummy";

const tabs = [
  { name: "For Ahmad", active: true },
  { name: "7.7 Plus Festival", active: false },
  { name: "Kesehatan", active: false },
  { name: "Mirip yang kamu cek", active: false },
];

export default function Main() {
  const [showMap, setShowMap] = useState(false);
  const router = useRouter();
  const [visibleCount, setVisibleCount] = useState(8);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [dataWarung, setDataWarung] = useState<DataWarung[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Fetch data warung on component mount
  useEffect(() => {
    fetchRentals();
  }, []);

  const fetchRentals = async (page = 1, append = false) => {
    try {
      setLoading(true);
      const response = await apiService.getAllRentals({
        page,
        limit: 20,
      });

      if (response.success) {
        if (append) {
          setDataWarung((prev) => [...prev, ...response.rentals]);
        } else {
          setDataWarung(response.rentals);
        }
        setHasMore(page < response.pagination.totalPages);
        setCurrentPage(page);
      }
    } catch (err) {
      console.error("Error fetching data warung:", err);
      setError("Failed to load data warung");
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      await fetchRentals(currentPage + 1, true);
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (showMap) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showMap]);

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >=
          document.body.offsetHeight - 200 &&
        hasMore &&
        !isLoadingMore &&
        !loading
      ) {
        loadMore();
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasMore, isLoadingMore, loading, currentPage]);

  if (loading && dataWarung.length === 0) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, idx) => (
              <SkeletonCardLayout key={`skeleton-${idx}`} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Error Loading Data Warung
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => fetchRentals()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Hero Banner */}
        <div
          className="relative mb-8 rounded-xl overflow-hidden h-72 md:h-64 lg:h-72 cursor-pointer"
          onClick={() => setShowMap(true)}
        >
          {/* Map kecil di Hero */}
          {!showMap && (
            <div className="absolute inset-0 z-10 opacity-80 pointer-events-none">
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  overflow: "hidden",
                  borderRadius: "1rem",
                }}
              >
                <HotelMap />
              </div>
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center z-20 ">
            <Button
              type="button"
              className="bg-black text-white text-sm font-bold rounded-xl shadow-lg px-5 py-3  transition-colors duration-200 hover:bg-white hover:text-black "
              tabIndex={-1}
              style={{ pointerEvents: "auto" }}
            >
              Cari Warung
            </Button>
          </div>
        </div>

        {/* Overlay Map Fullscreen */}
        {showMap && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-80 flex items-center justify-center">
            <div className="absolute inset-0">
              <HotelMap full />
            </div>
            <button
              className="absolute top-6 left-6 z-60 bg-white text-black px-4 py-2 rounded-lg font-bold shadow"
              onClick={() => setShowMap(false)}
            >
              Tutup
            </button>
          </div>
        )}

        {/* Product Grid */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {dataWarung.slice(0, visibleCount).map((rental) => (
            <Link
              key={rental.rentalId}
              href={`/detail/${rental.rentalId}`}
              passHref
              legacyBehavior
            >
              <a style={{ display: "block", height: "100%" }}>
                <CardLayout
                  image={
                    rental.mainImage ||
                    "https://dummyimage.com/300x200/cccccc/ffffff.jpg&text=No+Image"
                  }
                  name={rental.name || "Nama warung tidak tersedia"}
                  address={rental.address || "Alamat tidak tersedia"}
                  rating={rental.rating}
                  reviewCount={rental.reviewCount}
                  price={rental.price}
                  originalPrice={rental.originalPrice}
                  description={rental.description}
                  facilities={rental.facilities || []}
                />
              </a>
            </Link>
          ))}
          {isLoadingMore &&
            Array.from({ length: 4 }).map((_, idx) => (
              <SkeletonCardLayout key={`skeleton-${idx}`} />
            ))}
        </div>

      
      </div>
    </div>
  );
}
