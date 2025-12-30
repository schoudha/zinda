/**
 * Maps Health Connect exercise type values to readable names
 * Based on Android Health Connect API ExerciseType enum
 * Reference: https://developer.android.com/health-and-fitness/health-connect/data-types
 */

export const EXERCISE_TYPE_MAP: Record<number, string> = {
  0: "Other",
  1: "American Football",
  2: "Archery",
  3: "Australian Football",
  4: "Badminton",
  5: "Baseball",
  6: "Basketball",
  7: "Biathlon",
  8: "Biking",
  9: "Biking (Hand)",
  10: "Biking (Mountain)",
  11: "Biking (Road)",
  12: "Biking (Spinning)",
  13: "Biking (Stationary)",
  14: "Biking (Utility)",
  15: "Boxing",
  16: "Calisthenics",
  17: "Cricket",
  18: "Crossfit",
  19: "Curling",
  20: "Dancing",
  21: "Diving",
  22: "Elevator",
  23: "Elliptical",
  24: "Ergometer",
  25: "Escalator",
  26: "Fencing",
  27: "Football (American)",
  28: "Football (Australian)",
  29: "Football (Soccer)",
  30: "Frisbee Disc",
  31: "Gardening",
  32: "Golf",
  33: "Guided Breathing",
  34: "Gymnastics",
  35: "Handball",
  36: "High Intensity Interval Training",
  37: "Hiking",
  38: "Hockey",
  39: "Horseback Riding",
  40: "Housework",
  41: "Ice Skating",
  42: "Inline Skating",
  43: "Jumping Rope",
  44: "Kayaking",
  45: "Kettlebell Training",
  46: "Kickboxing",
  47: "Kitesurfing",
  48: "Martial Arts",
  49: "Meditation",
  50: "Mixed Cardio",
  51: "Open Water Swim",
  52: "Other",
  53: "Paddleboarding",
  54: "Paragliding",
  55: "Pilates",
  56: "Running", // Note: Verify with actual Health Connect API - may vary by version
  57: "Racquetball",
  58: "Rock Climbing",
  59: "Rowing",
  60: "Rowing Machine",
  61: "Rugby",
  62: "Running",
  63: "Running (Jogging)",
  64: "Running (Sand)",
  65: "Running (Treadmill)",
  66: "Sailing",
  67: "Scuba Diving",
  68: "Skateboarding",
  69: "Skating",
  70: "Cross Country Skiing",
  71: "Downhill Skiing",
  72: "Sledding",
  73: "Sleeping",
  74: "Light Sleep",
  75: "Deep Sleep",
  76: "REM Sleep",
  77: "Awake (During Sleep Period)",
  78: "Snowboarding",
  79: "Snowmobile",
  80: "Snowshoeing",
  81: "Softball",
  82: "Squash",
  83: "Stair Climbing",
  84: "Stair Climbing (Machine)",
  85: "Standup Paddleboarding",
  86: "Strength Training",
  87: "Surfing",
  88: "Swimming",
  89: "Swimming (Open Water)",
  90: "Swimming (Pool)",
  91: "Table Tennis",
  92: "Tennis",
  93: "Treadmill (Walking/Running)",
  94: "Volleyball",
  95: "Volleyball (Beach)",
  96: "Volleyball (Indoor)",
  97: "Wakeboarding",
  98: "Walking",
  99: "Walking (Fitness)",
  100: "Walking (Nordic)",
  101: "Walking (Treadmill)",
  102: "Water Polo",
  103: "Weightlifting",
  104: "Wheelchair",
  105: "Windsurfing",
  106: "Yoga",
  107: "Zumba",
};

/**
 * Maps exercise type string (e.g., "EXERCISE_TYPE_RUNNING") to readable name
 */
export function getExerciseTypeName(exerciseType: string, exerciseTypeValue?: number): string {
  // First try to use the integer value if available
  // Handle case where exerciseTypeValue might come as string from plugin
  const value = exerciseTypeValue !== undefined ? Number(exerciseTypeValue) : undefined;
  
  if (value !== undefined && !isNaN(value) && EXERCISE_TYPE_MAP[value]) {
    return EXERCISE_TYPE_MAP[value];
  }

  // Check if exerciseType string is actually a number (e.g. "56")
  // This happens when the plugin sends the int value as the type string
  const typeAsNumber = parseInt(exerciseType, 10);
  if (!isNaN(typeAsNumber) && EXERCISE_TYPE_MAP[typeAsNumber]) {
    return EXERCISE_TYPE_MAP[typeAsNumber];
  }

  // Fallback to parsing the string
  // Convert "EXERCISE_TYPE_RUNNING" to "Running"
  return exerciseType
    .replace("EXERCISE_TYPE_", "")
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Gets the exercise type name by integer value
 */
export function getExerciseTypeByValue(value: number): string {
  return EXERCISE_TYPE_MAP[value] || `Unknown (${value})`;
}

