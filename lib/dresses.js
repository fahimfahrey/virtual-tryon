// Single source of truth for dress catalog.
// Names/categories verified via Puter GPT-5.4-nano vision analysis.

export const DRESSES = [
  // ── Original collection ───────────────────────────────────────────────────
  { id: 1,  name: "White Bridal Gown",              category: "Bridal",      color: "White",      style: "Gown",  season: "SS24", price: 8999,  file: "/dresses/dress1.png" },
  { id: 2,  name: "Black Formal Dress",             category: "Formal",      color: "Black",      style: "Midi",  season: "SS24", price: 5999,  file: "/dresses/dress2.png" },
  { id: 3,  name: "Floral Summer Dress",            category: "Summer",      color: "Floral",     style: "Maxi",  season: "SS24", price: 2999,  file: "/dresses/dress3.png" },
  { id: 4,  name: "Blue Cocktail Dress",            category: "Cocktail",    color: "Blue",       style: "Midi",  season: "SS24", price: 4999,  file: "/dresses/dress4.png" },
  { id: 5,  name: "Red Evening Gown",               category: "Evening",     color: "Red",        style: "Gown",  season: "SS24", price: 6999,  file: "/dresses/dress5.png" },

  // ── Kurta collection (AI-verified) ────────────────────────────────────────
  { id: 6,  name: "Navy Pinstripe Kurta",           category: "Traditional", color: "Navy",       style: "Kurta", season: "SS24", price: 2499,  file: "/dresses/imgi_110_031626_Yellow_1047_360x504.jpg" },
  { id: 7,  name: "White Multicolor Printed Kurta", category: "Traditional", color: "White",      style: "Kurta", season: "SS24", price: 2799,  file: "/dresses/imgi_202_031626_Yellow_1294.jpg" },
  { id: 8,  name: "Navy Embroidered Kurta",         category: "Traditional", color: "Navy",       style: "Kurta", season: "SS24", price: 3199,  file: "/dresses/imgi_222_3d558107-e79c-4bc4-8c3f-76b542f33d3a.jpg" },
  { id: 9,  name: "Navy Geometric Kurta Set",       category: "Traditional", color: "Navy Blue",  style: "Kurta", season: "SS24", price: 3499,  file: "/dresses/imgi_230_031626_Yellow_1150.jpg" },
  { id: 10, name: "Embroidered Dark Grey Kurta",    category: "Traditional", color: "Dark Grey",  style: "Kurta", season: "SS24", price: 3299,  file: "/dresses/imgi_235_24e6b30c-2f15-4c2f-87e0-07ac27f05381.jpg" },
  { id: 11, name: "Navy Patterned Kurta Set",       category: "Traditional", color: "Navy",       style: "Kurta", season: "SS24", price: 3599,  file: "/dresses/imgi_244_031626_Yellow_1156.jpg" },
  { id: 12, name: "Plum Kurta with Stand Collar",   category: "Traditional", color: "Plum",       style: "Kurta", season: "SS24", price: 2999,  file: "/dresses/imgi_258_031626_Yellow_0945.jpg" },
  { id: 13, name: "Maroon Embroidered Kurta",       category: "Traditional", color: "Maroon",     style: "Kurta", season: "SS24", price: 3299,  file: "/dresses/imgi_272_031626_Yellow_0948.jpg" },
  { id: 14, name: "Rust Patterned Kurta Set",       category: "Traditional", color: "Rust",       style: "Kurta", season: "SS24", price: 3499,  file: "/dresses/imgi_286_031626_Yellow_1217.jpg" },
  { id: 15, name: "Beige Embroidered Kurta Set",    category: "Traditional", color: "Beige",      style: "Kurta", season: "SS24", price: 3799,  file: "/dresses/imgi_342_DSC9525.jpg" },
  { id: 16, name: "Embroidered Maroon Kurta Set",   category: "Traditional", color: "Maroon",     style: "Kurta", season: "SS24", price: 3299,  file: "/dresses/imgi_370_042920_Yellow_0278.jpg" },
  { id: 17, name: "Beige Embroidered Kurta Set",    category: "Traditional", color: "Beige",      style: "Kurta", season: "SS24", price: 3499,  file: "/dresses/imgi_398_042920_Yellow_0382.jpg" },
  { id: 18, name: "Charcoal Kurta Tunic",           category: "Traditional", color: "Charcoal",   style: "Kurta", season: "SS24", price: 2699,  file: "/dresses/imgi_40_MY-PANP-TM26-03EF-91580_3.jpg" },
  { id: 19, name: "Classic White Kurta Set",        category: "Traditional", color: "White",      style: "Kurta", season: "SS24", price: 2499,  file: "/dresses/imgi_58_SB-PANK-TM26-03EF-110341_6.jpg" },
  { id: 20, name: "Navy Embroidered Kurta Tunic",   category: "Casual",      color: "Navy",       style: "Kurta", season: "SS24", price: 2799,  file: "/dresses/imgi_68_SB-PANK-TM26-03EF-104308_5.jpg" },
  { id: 21, name: "Cream Solid Kurta",              category: "Traditional", color: "Cream",      style: "Kurta", season: "SS24", price: 1999,  file: "/dresses/imgi_72_92575_4.jpg" },
  { id: 22, name: "Black Solid Kurta",              category: "Traditional", color: "Black",      style: "Kurta", season: "SS24", price: 2299,  file: "/dresses/imgi_86_DSC9249_eebc53bd-2a2c-4d40-9b22-f5f0d9154ace_360x504.jpg" },
];

export const CATEGORIES = [...new Set(DRESSES.map(d => d.category))];
export const COLORS     = [...new Set(DRESSES.map(d => d.color))];
