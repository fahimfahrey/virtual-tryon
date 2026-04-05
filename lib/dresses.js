// Single source of truth for dress catalog.
// At 1cr scale this would be a DB — the search index in route.js reads from here.

export const DRESSES = [
  { id: 1, name: "White Bridal Gown",    category: "Bridal",   color: "White",  style: "Gown",  season: "SS24", price: 8999, file: "/dresses/dress1.png" },
  { id: 2, name: "Black Formal Dress",   category: "Formal",   color: "Black",  style: "Dress", season: "SS24", price: 5999, file: "/dresses/dress2.png" },
  { id: 3, name: "Floral Summer Dress",  category: "Summer",   color: "Floral", style: "Maxi",  season: "SS24", price: 2999, file: "/dresses/dress3.png" },
  { id: 4, name: "Blue Cocktail Dress",  category: "Cocktail", color: "Blue",   style: "Dress", season: "SS24", price: 4999, file: "/dresses/dress4.png" },
  { id: 5, name: "Red Evening Gown",     category: "Evening",  color: "Red",    style: "Gown",  season: "SS24", price: 6999, file: "/dresses/dress5.png" },
];

export const CATEGORIES = [...new Set(DRESSES.map(d => d.category))];
export const COLORS     = [...new Set(DRESSES.map(d => d.color))];
