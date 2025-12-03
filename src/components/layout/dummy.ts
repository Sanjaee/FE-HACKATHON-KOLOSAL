// Dummy data and API service for Map.tsx & homepage

export interface Rental {
  rentalId: string;
  name: string;
  lat: number;
  lng: number;
  price: number;
  originalPrice?: number;
  mainImage?: string;
  rating: number;
  reviewCount: number;
  address?: string;
  description?: string;
  facilities?: string[];
}

// Alias for clearer naming in UI code
export type DataWarung = Rental;

// --- Helper Data for generating 100 entries ---

const WARUNG_NAMES = [
  "Warung Jajanan & Kopi",
  "Toko Kelontong",
  "Kios Sembako",
  "Warung Minuman Dingin",
  "Warung Mie Instan",
];
const PERSON_NAMES = [
  "Budi",
  "Siti",
  "Joko",
  "Mpok Leha",
  "Bang Udin",
  "Bu Darmi",
];
const DESCRIPTIONS = [
  "Menyediakan kebutuhan harian, snack kemasan, dan minuman dingin.",
  "Spesialis mi instan kuah/goreng dengan topping telur.",
  "Jual pulsa, token listrik, dan berbagai jajanan anak sekolah.",
  "Warung rumahan yang menyediakan es dan minuman sachet segar.",
  "Lokasi strategis dekat perumahan, stok barang lengkap.",
];
const FACILITIES_LIST = [
  ["Jual Pulsa", "Air Panas Gratis"],
  ["Token Listrik", "Pembayaran Tunai"],
  ["Tambahan Telur", "Krupuk Gratis"],
  ["Es Batu Melimpah", "Minuman Dingin"],
  ["Bisa Utang (Warga Lokal)", "Plastik Kresek"],
];
const IMAGE_URLS = [
  "https://images.pexels.com/photos/103566/pexels-photo-103566.jpeg?auto=compress&cs=tinysrgb&w=800", // Coffee/General
  "https://images.pexels.com/photos/3380536/pexels-photo-3380536.jpeg?auto=compress&cs=tinysrgb&w=800", // Groceries/Snack
  "https://images.pexels.com/photos/1624487/pexels-photo-1624487.jpeg?auto=compress&cs=tinysrgb&w=800", // Noodle/Food
  "https://images.pexels.com/photos/674577/pexels-photo-674577.jpeg?auto=compress&cs=tinysrgb&w=800", // Shop/Store
  "https://images.pexels.com/photos/7403986/pexels-photo-7403986.jpeg?auto=compress&cs=tinysrgb&w=800", // Drinks/Dessert
];

function generateDummyWarungs(count: number): Rental[] {
  const warungs: Rental[] = [];
  const jakartaLatCenter = -6.2;
  const jakartaLngCenter = 106.8;

  for (let i = 1; i <= count; i++) {
    const randomNameIndex = i % WARUNG_NAMES.length;
    const randomPersonIndex = i % PERSON_NAMES.length;
    const randomDescIndex = i % DESCRIPTIONS.length;
    const randomFacilitiesIndex = i % FACILITIES_LIST.length;
    const randomImageIndex = i % IMAGE_URLS.length;

    // Generate random coordinates slightly around Jakarta center
    const lat = jakartaLatCenter + (Math.random() - 0.5) * 0.4;
    const lng = jakartaLngCenter + (Math.random() - 0.5) * 0.4;

    // Generate price between 5000 and 30000, rounded to nearest 1000
    const price = Math.round((Math.random() * (30000 - 5000) + 5000) / 1000) * 1000;
    const originalPrice = price + 5000;

    const warung: Rental = {
      rentalId: `snack-${i}`,
      name: `${WARUNG_NAMES[randomNameIndex]} ${PERSON_NAMES[randomPersonIndex]}`,
      lat: parseFloat(lat.toFixed(4)),
      lng: parseFloat(lng.toFixed(4)),
      price: price,
      originalPrice: (Math.random() > 0.7) ? originalPrice : undefined, // 30% chance for originalPrice
      mainImage: IMAGE_URLS[randomImageIndex],
      rating: parseFloat((3.8 + Math.random() * 1.0).toFixed(1)), // Rating 3.8 to 4.8
      reviewCount: Math.floor(Math.random() * 400) + 50, // 50 to 450 reviews
      address: `Jl. Warung No. ${i}, Jakarta`,
      description: DESCRIPTIONS[randomDescIndex],
      facilities: FACILITIES_LIST[randomFacilitiesIndex],
    };

    warungs.push(warung);
  }
  return warungs;
}

// Simple hardcoded data warung (stalls focusing on snacks/drinks) around Jakarta
// This array now contains 100 generated entries
const DUMMY_RENTALS: Rental[] = generateDummyWarungs(100);

type GetAllRentalsParams = {
  page?: number;
  limit?: number;
  search?: string;
};

type GetAllRentalsResponse = {
  success: boolean;
  rentals: Rental[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

// Dummy apiService used by both Map.tsx and index.tsx
export const apiService = {
  async getAllRentals(
    params: GetAllRentalsParams = {}
  ): Promise<GetAllRentalsResponse> {
    const { search, limit = 20, page = 1 } = params;

    let results = DUMMY_RENTALS;

    if (search) {
      const q = search.toLowerCase();
      results = results.filter((r) => r.name.toLowerCase().includes(q));
    }

    const total = results.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const pagedResults = results.slice(startIndex, endIndex);

    // Simulate small network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      success: true,
      rentals: pagedResults,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  },
};