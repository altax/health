import { Router } from "express";

const router = Router();

// Built-in food database (subset of common foods with nutrient data per 100g)
const FOODS = [
  {
    id: "chicken_breast",
    name: "Chicken Breast (cooked)",
    category: "Meat & Poultry",
    servingSize: 100,
    nutrients: {
      calories: 165, protein: 31, fat: 3.6, carbs: 0, fiber: 0, sugar: 0,
      sodium: 74, potassium: 256, calcium: 15, magnesium: 29, iron: 1.04, zinc: 1.0,
      vitaminA: 21, vitaminC: 0, vitaminD: 0.1, vitaminB3: 13.7, vitaminB6: 0.9, vitaminB12: 0.3,
      omega3: 0.07, saturatedFat: 0.9, cholesterol: 85,
    },
  },
  {
    id: "salmon",
    name: "Salmon (cooked)",
    category: "Fish & Seafood",
    servingSize: 100,
    nutrients: {
      calories: 206, protein: 20.4, fat: 13.4, carbs: 0, fiber: 0, sugar: 0,
      sodium: 59, potassium: 363, calcium: 9, magnesium: 30, iron: 0.8, zinc: 0.64,
      vitaminD: 14.1, vitaminB12: 3.18, vitaminB3: 8.7, vitaminB6: 0.94,
      omega3: 2.26, omega6: 0.36, saturatedFat: 3.1, cholesterol: 63,
    },
  },
  {
    id: "egg_whole",
    name: "Egg (whole, large)",
    category: "Eggs & Dairy",
    servingSize: 50,
    nutrients: {
      calories: 72, protein: 6.3, fat: 5, carbs: 0.4, fiber: 0, sugar: 0.4,
      sodium: 71, potassium: 63, calcium: 28, magnesium: 6, iron: 0.88, zinc: 0.65,
      vitaminA: 80, vitaminD: 1.1, vitaminE: 0.5, vitaminK: 0.3,
      vitaminB12: 0.45, folate: 24, cholesterol: 187, saturatedFat: 1.6,
    },
  },
  {
    id: "oatmeal",
    name: "Oatmeal (cooked)",
    category: "Grains & Cereals",
    servingSize: 234,
    nutrients: {
      calories: 166, protein: 5.9, fat: 3.6, carbs: 28, fiber: 4, sugar: 0.6,
      sodium: 9, potassium: 164, calcium: 21, magnesium: 63, iron: 2.1, zinc: 1.3,
      vitaminB1: 0.18, vitaminB3: 0.4, folate: 14, cholesterol: 0,
    },
  },
  {
    id: "banana",
    name: "Banana (medium)",
    category: "Fruit",
    servingSize: 118,
    nutrients: {
      calories: 105, protein: 1.3, fat: 0.4, carbs: 27, fiber: 3.1, sugar: 14.4,
      sodium: 1, potassium: 422, calcium: 6, magnesium: 32, iron: 0.31, zinc: 0.18,
      vitaminC: 10.3, vitaminB6: 0.43, folate: 24,
    },
  },
  {
    id: "spinach",
    name: "Spinach (raw)",
    category: "Vegetables",
    servingSize: 30,
    nutrients: {
      calories: 7, protein: 0.9, fat: 0.1, carbs: 1.1, fiber: 0.7, sugar: 0.1,
      sodium: 24, potassium: 167, calcium: 30, magnesium: 24, iron: 0.81, zinc: 0.16,
      vitaminA: 141, vitaminC: 8.4, vitaminK: 145, folate: 58,
    },
  },
  {
    id: "brown_rice",
    name: "Brown Rice (cooked)",
    category: "Grains & Cereals",
    servingSize: 100,
    nutrients: {
      calories: 112, protein: 2.3, fat: 0.9, carbs: 24, fiber: 1.8, sugar: 0.4,
      sodium: 1, potassium: 79, magnesium: 44, iron: 0.53, zinc: 0.62,
      vitaminB1: 0.1, vitaminB3: 1.5, vitaminB6: 0.15,
    },
  },
  {
    id: "greek_yogurt",
    name: "Greek Yogurt (plain, 0% fat)",
    category: "Eggs & Dairy",
    servingSize: 170,
    nutrients: {
      calories: 100, protein: 17, fat: 0.7, carbs: 6, fiber: 0, sugar: 6,
      sodium: 55, potassium: 240, calcium: 190, magnesium: 20,
      vitaminB12: 1.3, vitaminB2: 0.28,
    },
  },
  {
    id: "almonds",
    name: "Almonds",
    category: "Nuts & Seeds",
    servingSize: 28,
    nutrients: {
      calories: 164, protein: 6, fat: 14.4, carbs: 6.1, fiber: 3.5, sugar: 1.2,
      sodium: 0, potassium: 200, calcium: 76, magnesium: 76, iron: 1.05, zinc: 0.88,
      vitaminE: 7.3, vitaminB2: 0.32, omega6: 3.5, saturatedFat: 1.1,
    },
  },
  {
    id: "broccoli",
    name: "Broccoli (cooked)",
    category: "Vegetables",
    servingSize: 100,
    nutrients: {
      calories: 35, protein: 2.4, fat: 0.4, carbs: 7.2, fiber: 3.3, sugar: 1.7,
      sodium: 41, potassium: 293, calcium: 40, magnesium: 21, iron: 0.67, zinc: 0.45,
      vitaminA: 31, vitaminC: 64.9, vitaminK: 101, folate: 108, vitaminB6: 0.18,
    },
  },
  {
    id: "sweet_potato",
    name: "Sweet Potato (baked)",
    category: "Vegetables",
    servingSize: 150,
    nutrients: {
      calories: 129, protein: 2.9, fat: 0.2, carbs: 30.2, fiber: 4.8, sugar: 9.2,
      sodium: 41, potassium: 694, calcium: 43, magnesium: 33, iron: 0.79, zinc: 0.44,
      vitaminA: 1400, vitaminC: 23, vitaminB6: 0.57, folate: 12,
    },
  },
  {
    id: "milk_whole",
    name: "Whole Milk",
    category: "Eggs & Dairy",
    servingSize: 244,
    nutrients: {
      calories: 149, protein: 8, fat: 8, carbs: 12, fiber: 0, sugar: 12,
      sodium: 105, potassium: 322, calcium: 276, magnesium: 24, zinc: 0.95,
      vitaminA: 68, vitaminD: 3.2, vitaminB12: 1.1, vitaminB2: 0.4,
      saturatedFat: 4.6, cholesterol: 24,
    },
  },
  {
    id: "lentils",
    name: "Lentils (cooked)",
    category: "Legumes",
    servingSize: 100,
    nutrients: {
      calories: 116, protein: 9, fat: 0.4, carbs: 20, fiber: 7.9, sugar: 1.8,
      sodium: 2, potassium: 369, calcium: 19, magnesium: 36, iron: 3.3, zinc: 1.27,
      folate: 181, vitaminB1: 0.17, vitaminB6: 0.18,
    },
  },
  {
    id: "olive_oil",
    name: "Olive Oil",
    category: "Oils & Fats",
    servingSize: 14,
    nutrients: {
      calories: 119, protein: 0, fat: 13.5, carbs: 0, saturatedFat: 1.86,
      omega3: 0.1, omega6: 1.32, vitaminE: 1.94, vitaminK: 8.1,
    },
  },
  {
    id: "apple",
    name: "Apple (medium)",
    category: "Fruit",
    servingSize: 182,
    nutrients: {
      calories: 95, protein: 0.5, fat: 0.3, carbs: 25, fiber: 4.4, sugar: 18.9,
      sodium: 2, potassium: 195, calcium: 11, vitaminC: 8.4, vitaminK: 4,
    },
  },
  {
    id: "beef_lean",
    name: "Beef (lean, cooked)",
    category: "Meat & Poultry",
    servingSize: 100,
    nutrients: {
      calories: 215, protein: 26.3, fat: 11.7, carbs: 0, fiber: 0,
      sodium: 68, potassium: 356, calcium: 7, magnesium: 24, iron: 2.7, zinc: 5.0,
      vitaminB12: 2.65, vitaminB3: 6.8, vitaminB6: 0.46,
      saturatedFat: 4.5, cholesterol: 80,
    },
  },
  {
    id: "tuna_canned",
    name: "Tuna (canned in water)",
    category: "Fish & Seafood",
    servingSize: 85,
    nutrients: {
      calories: 100, protein: 22, fat: 1, carbs: 0, sodium: 264,
      potassium: 201, magnesium: 28, iron: 1.07, zinc: 0.78,
      vitaminB12: 2.0, vitaminB3: 11.3, vitaminD: 3.6, omega3: 0.26,
    },
  },
  {
    id: "avocado",
    name: "Avocado (half)",
    category: "Fruit",
    servingSize: 100,
    nutrients: {
      calories: 160, protein: 2, fat: 14.7, carbs: 8.5, fiber: 6.7, sugar: 0.7,
      sodium: 7, potassium: 485, calcium: 12, magnesium: 29, iron: 0.55, zinc: 0.64,
      vitaminC: 10, vitaminE: 2.07, vitaminK: 21, folate: 81, vitaminB6: 0.26,
      omega3: 0.11, omega6: 1.67, saturatedFat: 2.1,
    },
  },
  {
    id: "whole_wheat_bread",
    name: "Whole Wheat Bread (1 slice)",
    category: "Grains & Cereals",
    servingSize: 28,
    nutrients: {
      calories: 69, protein: 3.6, fat: 1.1, carbs: 12, fiber: 1.9, sugar: 1.4,
      sodium: 132, potassium: 71, calcium: 20, magnesium: 24, iron: 0.8, zinc: 0.54,
      vitaminB1: 0.1, vitaminB3: 1.4, folate: 14,
    },
  },
  {
    id: "cottage_cheese",
    name: "Cottage Cheese (low-fat)",
    category: "Eggs & Dairy",
    servingSize: 226,
    nutrients: {
      calories: 163, protein: 28, fat: 2.3, carbs: 6.2, sugar: 6.2,
      sodium: 697, potassium: 190, calcium: 138, magnesium: 14,
      vitaminB12: 1.37, vitaminB2: 0.37,
    },
  },
];

router.get("/foods/search", async (req, res) => {
  const q = (req.query.q as string ?? "").toLowerCase().trim();
  const limit = parseInt((req.query.limit as string) ?? "20", 10);

  if (!q) return res.json([]);

  const results = FOODS.filter((f) =>
    f.name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q)
  ).slice(0, limit);

  return res.json(results);
});

export default router;
