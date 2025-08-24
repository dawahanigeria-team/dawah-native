// Prominent Nigerian Sunni Islamic Scholars
export const nigerianSunniScholars = [
  "Sheikh Sani Umar Rijiyar Lemo",
  "Sheikh Abdullahi Bala Lau",
  "Sheikh Ibrahim Ibn Saleh al-Hussaini",
  "Sheikh Muhammad Auwal Albani Zaria",
  "Sheikh Ahmad Sulaiman Ibrahim",
  "Sheikh Sani Yahaya Jingir",
  "Sheikh Muhammad Kabiru Haruna",
  "Sheikh Ahmad Abubakar Gumi",
  "Sheikh Yahya Ibn Sani",
  "Sheikh Bashir Ahmad Aliyu",
  "Sheikh Umar Sanda Ndayako",
  "Sheikh Salisu Shehu",
];

/**
 * Get a random Nigerian Sunni scholar name
 * @param seed Optional seed for consistent randomization (useful for the same content)
 * @returns Random scholar name
 */
export const getRandomScholar = (seed?: string | number): string => {
  if (seed) {
    // Simple hash function for consistent randomization based on seed
    const hash =
      typeof seed === "string"
        ? seed.split("").reduce((a, b) => {
            a = (a << 5) - a + b.charCodeAt(0);
            return a & a;
          }, 0)
        : seed;
    const index = Math.abs(hash) % nigerianSunniScholars.length;
    return nigerianSunniScholars[index];
  }

  // True random selection
  const randomIndex = Math.floor(Math.random() * nigerianSunniScholars.length);
  return nigerianSunniScholars[randomIndex];
};

/**
 * Get multiple random scholars (no duplicates)
 * @param count Number of scholars to return
 * @returns Array of unique scholar names
 */
export const getMultipleRandomScholars = (count: number): string[] => {
  const shuffled = [...nigerianSunniScholars].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, nigerianSunniScholars.length));
};
