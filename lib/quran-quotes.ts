/**
 * Curated list of motivational Quranic verses
 * Each entry contains the Arabic text, English translation, and reference
 */
export interface QuranQuote {
  arabic: string;
  english: string;
  reference: string;
}

export const quranQuotes: QuranQuote[] = [
  {
    arabic: "وَلَا تَحْزَنْ إِنَّ اللَّهَ مَعَنَا",
    english: "And do not grieve; indeed Allah is with us.",
    reference: "Quran 9:40"
  },
  {
    arabic: "وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا",
    english: "And whoever fears Allah - He will make for him a way out.",
    reference: "Quran 65:2"
  },
  {
    arabic: "وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مِنْ أَمْرِهِ يُسْرًا",
    english: "And whoever fears Allah - He will make for him ease in his matter.",
    reference: "Quran 65:4"
  },
  {
    arabic: "إِنَّ مَعَ الْعُسْرِ يُسْرًا",
    english: "Indeed, with hardship comes ease.",
    reference: "Quran 94:5"
  },
  {
    arabic: "وَلَا تَهِنُوا وَلَا تَحْزَنُوا وَأَنتُمُ الْأَعْلَوْنَ إِن كُنتُم مُّؤْمِنِينَ",
    english: "And do not weaken and do not grieve, and you will be superior if you are believers.",
    reference: "Quran 3:139"
  },
  {
    arabic: "وَعَسَىٰ أَن تَكْرَهُوا شَيْئًا وَهُوَ خَيْرٌ لَّكُمْ",
    english: "But perhaps you hate a thing and it is good for you.",
    reference: "Quran 2:216"
  },
  {
    arabic: "وَمَن يَرْزُقْكُم مِّنَ السَّمَاءِ وَالْأَرْضِ",
    english: "And who provides for you from the heavens and the earth?",
    reference: "Quran 10:31"
  },
  {
    arabic: "وَاللَّهُ خَيْرٌ حَافِظًا وَهُوَ أَرْحَمُ الرَّاحِمِينَ",
    english: "But Allah is the best guardian, and He is the most merciful of the merciful.",
    reference: "Quran 12:64"
  },
  {
    arabic: "وَلَا تَقُولُوا لِمَن يُقْتَلُ فِي سَبِيلِ اللَّهِ أَمْوَاتٌ بَلْ أَحْيَاءٌ وَلَٰكِن لَّا تَشْعُرُونَ",
    english: "And do not say about those who are killed in the way of Allah, 'They are dead.' Rather, they are alive, but you perceive not.",
    reference: "Quran 2:154"
  },
  {
    arabic: "وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ نُورًا",
    english: "And whoever fears Allah - He will make for him light.",
    reference: "Quran 65:11"
  },
  {
    arabic: "وَاللَّهُ يُحِبُّ الْمُحْسِنِينَ",
    english: "And Allah loves the doers of good.",
    reference: "Quran 2:195"
  },
  {
    arabic: "وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ",
    english: "And whoever relies upon Allah - then He is sufficient for him.",
    reference: "Quran 65:3"
  }
];

/**
 * Get a random Quran quote
 */
export function getRandomQuranQuote(): QuranQuote {
  const randomIndex = Math.floor(Math.random() * quranQuotes.length);
  return quranQuotes[randomIndex];
}

